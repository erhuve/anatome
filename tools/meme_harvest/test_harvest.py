import io
import json
import socket
import tempfile
import unittest
import urllib.error
from unittest.mock import patch
from pathlib import Path

from PIL import Image

from .core import Page, Store, clean_url, dhash, distance, feed_items, media_key, page_images, prepare_image, relevance
from .network import FetchError, public_url, reddit_host, retry_delay
from .network import Client
from .collect import Collector
from .review import write_review


class HarvestTests(unittest.TestCase):
    def test_rss_and_atom_extract_original_post_links_media_and_credit(self):
        rss = b'''<rss xmlns:content="urn:content" xmlns:dc="urn:dc"><channel><item>
          <title>Triceps joke</title><link>https://creator.test/post?utm_source=rss</link>
          <dc:creator>Artist</dc:creator><content:encoded><![CDATA[<img src="/comic.jpg" alt="elbow extension">]]></content:encoded>
        </item></channel></rss>'''
        item = feed_items(rss, 'https://creator.test/feed')[0]
        self.assertEqual(item['source_url'], 'https://creator.test/post')
        self.assertEqual(item['creator'], 'Artist')
        self.assertEqual(item['images'][0]['image_url'], 'https://creator.test/comic.jpg')
        atom = b'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Bone</title>
          <link rel="alternate" href="/bone"/><summary>&lt;img src="/bone.png"/&gt;</summary></entry></feed>'''
        self.assertEqual(feed_items(atom, 'https://artist.test/feed')[0]['images'][0]['source_url'], 'https://artist.test/bone')

    def test_untrusted_feed_entities_are_rejected_and_html_scripts_are_ignored(self):
        with self.assertRaises(ValueError):
            feed_items(b'<!DOCTYPE x [<!ENTITY e "x">]><rss/>', 'https://a.test')
        images = page_images('<title>Bones</title><script>private</script><img data-src="/bone.png" alt="femur"><img src="/bone.png">', 'https://a.test')
        self.assertEqual(len(images), 1)
        self.assertNotIn('private', images[0]['context'])
        linked = page_images('<a href="/i/comic"><img src="/meme.jpg" alt="Biceps"></a>', 'https://a.test/tag/anatomy')
        self.assertEqual(linked[0]['source_url'], 'https://a.test/i/comic')
        parser = Page('https://a.test/tag/anatomy')
        parser.feed("<a class='pager-next l but' href='?page=2'>Next</a>")
        self.assertEqual(parser.next_url, 'https://a.test/tag/anatomy?page=2')

    def test_tracking_and_resized_reposts_have_stable_media_keys(self):
        self.assertEqual(clean_url('https://a.test/a?utm_source=x&keep=y#z'), 'https://a.test/a?keep=y')
        self.assertEqual(media_key('https://i.pinimg.com/564x/aa/x.jpg'), media_key('https://i.pinimg.com/originals/aa/x.jpg'))
        self.assertEqual(media_key('https://i.redd.it/abcd.png'), media_key('https://preview.redd.it/title-v0-abcd.png?width=640'))

    def test_public_network_boundary_and_reddit_gate(self):
        def resolve(address):
            return lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (address, 443))]
        for address in ('127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '::1'):
            with self.assertRaises(FetchError):
                public_url('https://example.test', resolve(address))
        self.assertEqual(public_url('https://example.test', resolve('1.1.1.1')), 'https://example.test')
        for url in ('file:///etc/passwd', 'https://u:p@example.test', 'https://example.test:22'):
            with self.assertRaises(FetchError):
                public_url(url, resolve('1.1.1.1'))
        self.assertTrue(reddit_host('https://preview.redd.it/a.png'))
        self.assertFalse(reddit_host('https://reddit.com.attacker.test/a'))
        self.assertEqual(retry_delay('120'), 120)
        self.assertEqual(retry_delay('broken'), 300)

    def test_image_decode_fingerprints_and_animated_preview(self):
        with tempfile.TemporaryDirectory() as temporary:
            image = Image.new('RGB', (640, 480), 'white')
            for x in range(320):
                image.paste((x % 255, 0, 0), (x, 0, x + 1, 480))
            buf = io.BytesIO(); image.save(buf, format='PNG')
            asset = prepare_image(buf.getvalue(), Path(temporary), 'a' * 20)
            self.assertEqual((asset['width'], asset['height']), (640, 480))
            self.assertEqual(distance(asset['dhash'], dhash(image.resize((320, 240)))), 0)
            self.assertTrue((Path(temporary) / ('a' * 20 + '-thumb.webp')).exists())
            with self.assertRaises(OSError):
                prepare_image(b'<html>not an image</html>', Path(temporary), 'b' * 20)

    def test_queue_idempotence_keeps_review_and_exact_vs_possible_duplicates(self):
        with tempfile.TemporaryDirectory() as temporary:
            store = Store(Path(temporary))
            document = dict(source_url='https://a.test/post', image_url='https://a.test/image.png', title='biceps')
            cid = store.insert(document, sha='digest', fingerprint='0123456789abcdef')
            store.decide(cid, 'kept', 'Reviewer', 'Elbow extension', 'Creator', 'Review reuse terms', '')
            store.insert(document)
            self.assertEqual(len(store.rows()), 1)
            self.assertEqual(store.rows()[0]['status'], 'kept')
            self.assertEqual(store.duplicate('https://b.test/x.png', 'digest')[0], [cid])
            exact, near = store.duplicate('https://b.test/x.png', 'different', '0123456789abcdee')
            self.assertEqual(exact, []); self.assertEqual(near, [cid])
            with self.assertRaises(ValueError):
                store.decide(cid, 'kept', '', '', '', '', '')
            duplicate = store.insert(dict(document, image_url='https://a.test/other.png'), 'duplicate')
            with self.assertRaises(ValueError):
                store.decide(duplicate, 'kept', 'R', 'H', 'C', 'N', '')
            store.db.close()

    def test_static_review_escapes_script_breakout_and_does_not_fetch_remote_images(self):
        with tempfile.TemporaryDirectory() as temporary:
            store = Store(Path(temporary))
            store.insert(dict(source_url='https://a.test', image_url='https://a.test/x.png', title='</script><script>alert(1)</script>'))
            write_review(store)
            output = (Path(temporary) / 'review.html').read_text()
            self.assertNotIn('</script><script>alert(1)', output)
            self.assertIn('\\u003c/script', output)
            self.assertIn('textContent', output)
            store.db.close()

    def test_relevance_favors_specific_anatomy_but_does_not_claim_humor_quality(self):
        anatomy, hits, _ = relevance('Biceps triceps elbow muscle contraction', 800, 600, True)
        generic, _, flags = relevance('My exam is tomorrow', 200, 150)
        self.assertGreater(anatomy, generic)
        self.assertIn('Muscles', hits)
        self.assertTrue(flags)

    def test_discovery_downloads_once_and_reposts_do_not_reset_reviews(self):
        with tempfile.TemporaryDirectory() as temporary:
            store = Store(Path(temporary))
            buf = io.BytesIO(); Image.new('RGB', (600, 500), 'coral').save(buf, format='PNG')
            body = buf.getvalue()
            class FixtureClient:
                remaining = 40
                def get(self, url, **kwargs):
                    self.remaining -= 1
                    return body, 'image/png', url
            client = FixtureClient()
            candidate = dict(source_url='https://artist.test/post', image_url='https://artist.test/a.png', title='Biceps muscle')
            source = dict(id='fixture', creator='Artist')
            collector = Collector(store, client)
            collector.ingest(candidate, source)
            kept = store.rows()[0]
            store.decide(kept['id'], 'kept', 'R', 'Learn biceps', 'Artist', 'Check reuse', '')
            collector.ingest(candidate, source)
            collector.ingest(dict(candidate, source_url='https://repost.test/post', image_url='https://repost.test/repost.png'), source)
            self.assertEqual(collector.report['downloaded'], 2)
            self.assertEqual(collector.report['already_seen'], 1)
            self.assertEqual(len(store.rows('kept')), 1)
            self.assertEqual(len(store.rows('duplicate')), 1)
            store.db.close()

    def test_robots_failure_and_429_defer_without_retry_storms(self):
        with tempfile.TemporaryDirectory() as temporary:
            client = Client(Path(temporary), 'AnatomemeCollector', 5)
            calls = []
            class Opener:
                def open(self, request, **kwargs):
                    calls.append(request.full_url)
                    raise urllib.error.HTTPError(request.full_url, 429, 'wait', {'Retry-After': '120'}, None)
            client.opener = Opener()
            with patch('tools.meme_harvest.network.public_url', lambda u: u):
                with self.assertRaises(FetchError):
                    client.get('https://artist.test/feed', robots=False)
                with self.assertRaises(FetchError):
                    client.get('https://artist.test/feed', robots=False)
            self.assertEqual(len(calls), 1)
            self.assertTrue((Path(temporary) / 'cooldowns.json').exists())
            fresh = Client(Path(temporary), 'AnatomemeCollector', 5)
            self.assertIn('artist.test', fresh.cooldowns)

    def test_redirects_drop_credentials_and_reddit_has_no_html_fallback(self):
        with tempfile.TemporaryDirectory() as temporary:
            client = Client(Path(temporary), 'AnatomemeCollector', 5)
            calls = []
            class Response(io.BytesIO):
                headers = {'Content-Type': 'application/json'}
            class Opener:
                def open(self, request, **kwargs):
                    calls.append(request)
                    if len(calls) == 1:
                        raise urllib.error.HTTPError(request.full_url, 302, 'redirect', {'Location': 'https://second.test/x'}, None)
                    return Response(b'{}')
            client.opener = Opener()
            with patch('tools.meme_harvest.network.public_url', lambda u: u):
                client.get('https://first.test/x', robots=False, headers={'Authorization': 'Bearer secret'})
                with self.assertRaises(FetchError):
                    client.get('https://www.reddit.com/r/anatomy', robots=False)
            self.assertEqual(calls[0].get_header('Authorization'), 'Bearer secret')
            self.assertIsNone(calls[1].get_header('Authorization'))
            self.assertEqual(list((Path(temporary) / 'http').iterdir()), [])


if __name__ == '__main__':
    unittest.main()
