import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def write_review(store):
    data = json.dumps(store.rows(), ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    template = (Path(__file__).parent / 'review.html').read_text()
    (store.state / 'review.html').write_text(template.replace('__CANDIDATE_DATA__', data))


def serve(store, port):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, status, body, kind='application/json'):
            self.send_response(status)
            self.send_header('Content-Type', kind)
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def valid_host(self):
            return self.headers.get('Host') in ('127.0.0.1:' + str(port), 'localhost:' + str(port))

        def do_GET(self):
            if not self.valid_host():
                return self.send(403, b'{}')
            path = urlsplit(self.path).path
            if path in ('/', '/review.html'):
                write_review(store)
                return self.send(200, (store.state / 'review.html').read_bytes(), 'text/html; charset=utf-8')
            if re.fullmatch(r'/media/[a-f0-9]{20}(?:-thumb)?\.webp', path):
                target = store.state / path.lstrip('/')
                if target.exists():
                    return self.send(200, target.read_bytes(), 'image/webp')
            return self.send(404, b'{}')

        def do_POST(self):
            origin = self.headers.get('Origin')
            if not self.valid_host() or origin != 'http://' + self.headers.get('Host', ''):
                return self.send(403, b'{"error":"Local same-origin requests only"}')
            if self.path != '/decision' or self.headers.get('Content-Type') != 'application/json':
                return self.send(400, b'{}')
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 20000:
                    raise ValueError('Invalid request size')
                payload = json.loads(self.rfile.read(length))
                store.decide(payload['id'], payload['decision'], payload.get('reviewer', ''),
                    payload.get('hook', ''), payload.get('credit', ''), payload.get('rights', ''), payload.get('note', ''), payload.get('humor', ''), payload.get('evidence', ''), payload.get('recall', ''))
                write_review(store)
                return self.send(200, b'{"ok":true}')
            except (ValueError, KeyError, TypeError) as error:
                return self.send(400, json.dumps({'error': str(error)}).encode())
    server = HTTPServer(('127.0.0.1', port), Handler)
    print('Review queue: http://127.0.0.1:' + str(port) + '/ (Ctrl+C to stop)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
