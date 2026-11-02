import hashlib
import html
import json
import os
import re
import time
import urllib.parse

from .core import Page, clean_url, exclusion_reason, feed_items, page_images, prepare_image, relevance
from .network import FetchError, reddit_host


class Collector:
    def __init__(self, store, client, image_limit=20, ocr=False):
        self.store, self.client = store, client
        self.image_limit, self.ocr = image_limit, ocr
        self.initial_budget = client.remaining
        self.source_downloads = {}
        self.visited_pages = set()
        self.report = {'started_at': time.time(), 'discovered': 0, 'downloaded': 0,
                       'duplicates': 0, 'already_seen': 0, 'pending': 0, 'excluded': 0, 'sources': [], 'errors': []}

    def ingest(self, candidate, source):
        candidate = dict(candidate)
        candidate.update(source_id=source['id'], creator=candidate.get('creator') or source.get('creator', ''),
                         rights=source.get('rights', 'Unverified'), original_creator=bool(source.get('original_creator')))
        self.report['discovered'] += 1
        if exclusion_reason(candidate, self.store.exclusions):
            self.report['excluded'] += 1
            return
        if self.store.known(candidate['source_url'], candidate['image_url']):
            self.report['already_seen'] += 1
            return
        exact, _ = self.store.duplicate(candidate['image_url'])
        if exact:
            candidate.update(exact_duplicates=exact, rank=0, flags=['Already in the library or queue'])
            self.store.insert(candidate, 'duplicate')
            self.report['duplicates'] += 1
            return
        if self.report['downloaded'] >= self.image_limit:
            return
        if self.source_downloads.get(source['id'], 0) >= source.get('max_images', self.image_limit):
            return
        url = candidate['image_url']
        if re.search(r'\b(?:logo|banner|favicon)\b', candidate.get('caption', ''), re.I):
            return
        if re.search(r'\.(svg|ico|pdf)(?:\?|$)|favicon|tracking-pixel|(?:^|[/_-])(?:logo|banner|presentation)(?:[._-]|$)', url, re.I):
            return
        try:
            data, content_type, final = self.client.get(url, maximum=8000000)
            if content_type and not content_type.startswith('image/') and content_type != 'application/octet-stream':
                raise FetchError('URL did not return image content')
            cid = hashlib.sha256((clean_url(candidate['source_url']) + '\n' + clean_url(url)).encode()).hexdigest()[:20]
            asset = prepare_image(data, self.store.state / 'media', cid, self.ocr)
            self.report['downloaded'] += 1
            self.source_downloads[source['id']] = self.source_downloads.get(source['id'], 0) + 1
            if exclusion_reason(dict(candidate, ocr=asset['ocr'], resolved_image_url=final), self.store.exclusions):
                self.report['excluded'] += 1
                return
            # Multi-image gallery text is not used: it would incorrectly tag every image on the page.
            filename = urllib.parse.unquote(urllib.parse.urlsplit(url).path.rsplit('/', 1)[-1]).replace('-', ' ').replace('_', ' ')
            text = ' '.join((candidate.get('title', ''), candidate.get('caption', ''), filename, asset['ocr']))
            rank, hits, flags = relevance(text, asset['width'], asset['height'], candidate['original_creator'])
            exact, near = self.store.duplicate(url, asset['sha256'], asset['dhash'])
            if near:
                flags.append('Possible visual duplicate; different captions may still be distinct memes')
                rank = max(0, rank - 10)
            if asset['animated']:
                flags.append('Animated original; this queue preview shows its first frame')
            if not asset['ocr']:
                flags.append('Text has not been OCR-checked; inspect readability')
            candidate.update(asset, rank=rank, topics=list(hits), matches=hits, flags=flags,
                             exact_duplicates=exact, possible_duplicates=near, resolved_image_url=final)
            self.store.insert(candidate, 'duplicate' if exact else 'pending', asset['sha256'], asset['dhash'])
            self.report['duplicates' if exact else 'pending'] += 1
        except (FetchError, ValueError, OSError) as error:
            self.report['errors'].append({'source': source['id'], 'url': url, 'error': str(error)[:300]})

    def page(self, url, source, title='', pages=1):
        if exclusion_reason(dict(source_url=url, source_id=source['id'], creator=source.get('creator', '')), self.store.exclusions):
            self.report['excluded'] += 1
            return
        if clean_url(url) in self.visited_pages:
            return
        self.visited_pages.add(clean_url(url))
        if reddit_host(url):
            self.report['errors'].append({'source': source['id'], 'url': url,
                'error': 'Reddit link retained as a lead; use the approved API connector for discovery'})
            return
        body, kind, final = self.client.get(url)
        if kind and kind not in ('text/html', 'application/xhtml+xml'):
            raise FetchError('Page source did not return HTML')
        candidates = page_images(body.decode('utf-8', errors='replace'), final, title)[:120]
        def image_name(candidate):
            name = urllib.parse.unquote(urllib.parse.urlsplit(candidate['image_url']).path.rsplit('/', 1)[-1])
            return re.sub(r'[_-]+', ' ', name)
        # Select specific anatomy material before generic page decoration consumes the image budget.
        candidates.sort(key=lambda c: relevance(c.get('caption', '') + ' ' + image_name(c))[0], reverse=True)
        for candidate in candidates:
            candidate['post_title'] = candidate['title']
            if not title:
                caption = candidate.get('caption', '').strip()
                name = re.sub(r'\.(?:gif|png|jpe?g|webp)$|\b(?:orig|gif|v\d+)\b', '', image_name(candidate), flags=re.I).strip()
                if caption and caption.lower() not in ('picture', 'image'):
                    candidate['title'] = caption
                elif relevance(name)[1]:
                    candidate['title'] = name.capitalize()
            self.ingest(candidate, source)
        if pages > 1 and self.report['downloaded'] < self.image_limit and self.source_downloads.get(source['id'], 0) < source.get('max_images', self.image_limit):
            parser = Page(final)
            parser.feed(body.decode('utf-8', errors='replace'))
            next_url = parser.next_url
            if next_url and urllib.parse.urlsplit(next_url).netloc == urllib.parse.urlsplit(final).netloc:
                self.page(next_url, source, pages=pages - 1)

    def feed(self, source):
        body, _, final = self.client.get(source['url'])
        for item in feed_items(body, final)[:30]:
            if item['images']:
                # Skip clearly unrelated posts before spending image requests.
                _, hits, _ = relevance(item['title'] + ' ' + ' '.join(x.get('caption', '') for x in item['images']))
                if not hits:
                    continue
                for candidate in item['images'][:6]:
                    self.ingest(dict(candidate, creator=item['creator'] or source.get('creator', ''),
                                     published_at=item['published_at']), source)
            elif relevance(item['title'])[1]:
                self.page(item['source_url'], source, item['title'])

    def reddit(self, source):
        token, agent = os.environ.get('REDDIT_ACCESS_TOKEN'), os.environ.get('REDDIT_USER_AGENT')
        if os.environ.get('REDDIT_APPROVED') != '1' or not token or not agent:
            raise FetchError('Approved Reddit API access, REDDIT_APPROVED=1, token and user agent are required')
        subreddit = source.get('subreddit', '')
        if not re.fullmatch(r'[A-Za-z0-9_]{2,40}', subreddit):
            raise ValueError('Invalid subreddit')
        for query in source.get('queries', [])[:5]:
            params = urllib.parse.urlencode({'q': query, 'restrict_sr': 'on', 'sort': 'top', 't': 'all', 'limit': 25, 'raw_json': 1})
            url = 'https://oauth.reddit.com/r/' + subreddit + '/search?' + params
            raw, _, _ = self.client.get(url, robots=False, headers={'Authorization': 'Bearer ' + token, 'User-Agent': agent})
            posts = json.loads(raw).get('data', {}).get('children', [])
            for post in posts:
                data = post.get('data', {})
                if data.get('over_18') or data.get('removed_by_category') or data.get('is_video'):
                    continue
                images = []
                direct = data.get('url_overridden_by_dest', '')
                if data.get('post_hint') == 'image' and direct:
                    images.append(direct)
                for media in data.get('media_metadata', {}).values():
                    if media.get('status') == 'valid' and media.get('e') == 'Image' and media.get('s', {}).get('u'):
                        images.append(html.unescape(media['s']['u']))
                for image in dict.fromkeys(images):
                    self.ingest({'source_url': 'https://www.reddit.com' + data['permalink'],
                        'image_url': image, 'title': data.get('title', ''), 'caption': '',
                        'creator': 'u/' + data.get('author', '[deleted]'),
                        'published_at': data.get('created_utc'), 'post_id': data.get('id')}, source)

    def brave(self, source):
        token = os.environ.get('BRAVE_SEARCH_API_KEY')
        if not token:
            raise FetchError('BRAVE_SEARCH_API_KEY is not configured')
        for query in source.get('queries', [])[:5]:
            url = 'https://api.search.brave.com/res/v1/web/search?' + urllib.parse.urlencode({'q': query, 'count': 10})
            raw, _, _ = self.client.get(url, robots=False, headers={'X-Subscription-Token': token, 'Accept': 'application/json'})
            for result in json.loads(raw).get('web', {}).get('results', [])[:8]:
                try:
                    self.page(result['url'], source, result.get('title', ''))
                except (FetchError, ValueError) as error:
                    self.report['errors'].append({'source': source['id'], 'url': result.get('url'), 'error': str(error)})

    def run(self, sources):
        for source in sources:
            reason = exclusion_reason(dict(source_id=source['id'], source_url=source.get('url', ''), creator=source.get('creator', '')), self.store.exclusions)
            if reason:
                self.report['sources'].append({'id': source['id'], 'status': 'excluded', 'detail': reason})
                continue
            if not source.get('enabled', True):
                self.report['sources'].append({'id': source['id'], 'status': 'disabled', 'detail': source.get('access_notes', '')})
                continue
            print('Scanning ' + source['id'] + '…', flush=True)
            try:
                kind = source['kind']
                if kind == 'feed':
                    self.feed(source)
                elif kind == 'page':
                    self.page(source['url'], source, pages=max(1, min(3, int(source.get('max_pages', 1)))))
                elif kind == 'reddit':
                    self.reddit(source)
                elif kind == 'brave':
                    self.brave(source)
                else:
                    raise ValueError('Unknown source kind')
                self.report['sources'].append({'id': source['id'], 'status': 'scanned'})
            except (FetchError, ValueError, OSError) as error:
                self.report['sources'].append({'id': source['id'], 'status': 'deferred', 'detail': str(error)[:300]})
        self.report['finished_at'] = time.time()
        self.report['requests_used'] = self.initial_budget - self.client.remaining
        self.store.db.execute('INSERT INTO runs(started_at,report) VALUES (?,?)',
                              (self.report['started_at'], json.dumps(self.report)))
        self.store.db.commit()
        return self.report
