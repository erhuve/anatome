"""Bounded public-web fetching with robots, conditional requests and host cooldowns."""
import hashlib
import ipaddress
import json
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from email.utils import parsedate_to_datetime


class FetchError(Exception):
    pass


def public_url(url, resolver=socket.getaddrinfo):
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ('http', 'https') or not parts.hostname or parts.username or parts.password:
        raise FetchError('Only public HTTP(S) URLs without credentials are allowed')
    if parts.port not in (None, 80, 443):
        raise FetchError('Non-web port blocked')
    try:
        addresses = resolver(parts.hostname, parts.port or (443 if parts.scheme == 'https' else 80), type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
            raise FetchError('Private, loopback or reserved network target blocked')
    except (ValueError, OSError) as error:
        raise FetchError('Unable to resolve a public host') from error
    return url


def reddit_host(url):
    host = urllib.parse.urlsplit(url).hostname or ''
    return any(host == domain or host.endswith('.' + domain)
               for domain in ('reddit.com', 'redd.it', 'redditmedia.com', 'redditstatic.com'))


def retry_delay(value, now=None):
    now = time.time() if now is None else now
    try:
        return max(1, min(86400, int(value)))
    except (ValueError, TypeError):
        try:
            return max(1, min(86400, parsedate_to_datetime(value).timestamp() - now))
        except (ValueError, TypeError, AttributeError):
            return 300


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self, state, user_agent, request_limit=80, delay=2, reddit_allowed=False):
        self.state = state
        self.user_agent = user_agent
        self.remaining = request_limit
        self.delay = max(1, delay)
        self.reddit_allowed = reddit_allowed
        self.robots = {}
        self.last_request = {}
        self.cache = state / 'http'
        self.cache.mkdir(parents=True, exist_ok=True)
        self.cooldown_file = state / 'cooldowns.json'
        self.cooldowns = json.loads(self.cooldown_file.read_text()) if self.cooldown_file.exists() else {}
        # No implicit HTTP proxy: each destination and redirect is checked before use.
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def allowed(self, url):
        parts = urllib.parse.urlsplit(url)
        origin = parts.scheme + '://' + parts.netloc
        if origin not in self.robots:
            try:
                body, _, _ = self.get(origin + '/robots.txt', robots=False, maximum=256000)
                parser = urllib.robotparser.RobotFileParser()
                parser.parse(body.decode('utf-8', errors='replace').splitlines())
                self.robots[origin] = parser
            except FetchError as error:
                # A missing robots file allows crawling; unavailable or forbidden rules defer it.
                if str(error) in ('HTTP 404', 'HTTP 410'):
                    parser = urllib.robotparser.RobotFileParser()
                    parser.parse([])
                    self.robots[origin] = parser
                else:
                    raise FetchError('Robots unavailable: ' + str(error)) from error
        parser = self.robots[origin]
        if not parser.can_fetch(self.user_agent, url):
            raise FetchError('Disallowed by robots.txt')
        requested = parser.crawl_delay(self.user_agent) or parser.crawl_delay('*') or 0
        if requested > 30:
            raise FetchError('Source crawl delay exceeds this bounded run; defer it')
        return max(self.delay, requested)

    def get(self, url, maximum=1500000, robots=True, headers=None):
        initial_origin = urllib.parse.urlsplit(url).netloc
        for _ in range(6):
            public_url(url)
            if reddit_host(url) and not self.reddit_allowed:
                raise FetchError('Reddit requires approved API access; no scraping fallback')
            delay = self.allowed(url) if robots else self.delay
            host = urllib.parse.urlsplit(url).netloc
            if self.cooldowns.get(host, 0) > time.time():
                raise FetchError('Host cooling down after a temporary error')
            if self.remaining <= 0:
                raise FetchError('Run request budget exhausted')
            wait = delay - (time.monotonic() - self.last_request.get(host, 0))
            if wait > 0:
                time.sleep(wait)
            key = hashlib.sha256(url.encode()).hexdigest()
            meta_path, body_path = self.cache / (key + '.json'), self.cache / (key + '.body')
            meta = json.loads(meta_path.read_text()) if meta_path.exists() and not headers else {}
            request_headers = {'User-Agent': self.user_agent, 'Accept': '*/*'}
            if meta.get('etag') and body_path.exists():
                request_headers['If-None-Match'] = meta['etag']
            if meta.get('modified') and body_path.exists():
                request_headers['If-Modified-Since'] = meta['modified']
            # Credentials are scoped to their original origin and never sent on cross-host redirects.
            if headers and host == initial_origin:
                request_headers.update(headers)
            self.remaining -= 1
            self.last_request[host] = time.monotonic()
            try:
                response = self.opener.open(urllib.request.Request(url, headers=request_headers), timeout=20)
            except urllib.error.HTTPError as error:
                if error.code == 304 and body_path.exists() and not headers:
                    body = body_path.read_bytes()
                    if len(body) > maximum:
                        raise FetchError('Cached response exceeds size limit')
                    return body, meta.get('type', ''), url
                if error.code in (301, 302, 303, 307, 308):
                    location = error.headers.get('Location')
                    if not location:
                        raise FetchError('Redirect without a destination')
                    url = urllib.parse.urljoin(url, location)
                    continue
                if error.code in (429, 503):
                    self.cooldowns[host] = time.time() + retry_delay(error.headers.get('Retry-After'))
                    self.cooldown_file.write_text(json.dumps(self.cooldowns))
                raise FetchError('HTTP ' + str(error.code)) from error
            except (OSError, urllib.error.URLError) as error:
                raise FetchError('Network or TLS failure') from error
            with response:
                if int(response.headers.get('Content-Length', '0') or 0) > maximum:
                    raise FetchError('Response exceeds size limit')
                body = response.read(maximum + 1)
                if len(body) > maximum:
                    raise FetchError('Response exceeds size limit')
                content_type = response.headers.get('Content-Type', '').split(';')[0]
                # Authenticated responses (including API tokens) never enter the disk cache.
                if not headers:
                    body_path.write_bytes(body)
                    meta_path.write_text(json.dumps({'etag': response.headers.get('ETag'),
                        'modified': response.headers.get('Last-Modified'), 'type': content_type}))
                return body, content_type, url
        raise FetchError('Too many redirects')
