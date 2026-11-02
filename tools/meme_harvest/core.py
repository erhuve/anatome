import hashlib
import html
import io
import json
import re
import shutil
import sqlite3
import subprocess
import time
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 20000000
TOPICS = {
    'Muscles': ('muscle', 'muscles', 'biceps', 'triceps', 'deltoid', 'rotator cuff', 'scm',
        'sternocleidomastoid', 'sartorius', 'sarcomere', 'actin', 'myosin', 'contraction',
        'tendon', 'supination', 'pronation', 'trapezius', 'gluteus', 'popliteus'),
    'Bones & landmarks': ('bone', 'bones', 'skeleton', 'skeletal', 'humerus', 'femur', 'tibia',
        'fibula', 'ulna', 'radius', 'scapula', 'clavicle', 'carpal', 'patella', 'vertebra',
        'pelvis', 'skull', 'osteoblast', 'osteoclast', 'osteoporosis', 'ligament', 'joint'),
    'Nerves': ('nerve', 'nerves', 'neuron', 'myelin', 'action potential', 'cranial', 'vagus',
        'plexus', 'synapse', 'nervous', 'brain', 'afferent', 'efferent'),
    'Blood & circulation': ('heart', 'hemoglobin', 'blood', 'erythrocyte', 'cardiac', 'artery',
        'vein', 'circulation', 'aorta', 'oxygen', 'ventricle', 'atrium'),
    'Organs': ('kidney', 'renal', 'nephron', 'lung', 'lungs', 'liver', 'stomach', 'intestine',
        'pancreas', 'organ', 'respiration', 'alveoli', 'digestion'),
    'Cells & metabolism': ('cell', 'cells', 'membrane', 'mitochondria', 'atp', 'krebs',
        'glycolysis', 'osmosis', 'diffusion', 'transport', 'homeostasis', 'mitosis', 'meiosis',
        'enzyme', 'protein', 'dna', 'rna', 'prokaryote', 'eukaryote', 'biomolecules'),
}


def clean_url(url):
    p = urllib.parse.urlsplit(html.unescape(url))
    query = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid', 'gclid')]
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path,
                                   urllib.parse.urlencode(query), ''))


def media_key(url):
    p = urllib.parse.urlsplit(clean_url(url))
    name = p.path.rsplit('/', 1)[-1]
    if p.hostname == 'i.pinimg.com':
        return 'pinimg:' + name
    if p.hostname in ('i.redd.it', 'preview.redd.it'):
        return 'reddit-image:' + name.split('-v0-')[-1]
    return clean_url(url)


def dhash(image):
    small = image.convert('L').resize((9, 8))
    pixels = list(small.getdata())
    value = 0
    for y in range(8):
        for x in range(8):
            value = (value << 1) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return format(value, '016x')


def distance(a, b):
    return bin(int(a, 16) ^ int(b, 16)).count('1')


def relevance(text, width=0, height=0, original=False):
    text = text.lower()
    hits = {topic: [term for term in terms if re.search(r'\b' + re.escape(term) + r'\b', text)]
            for topic, terms in TOPICS.items()}
    hits = {topic: words for topic, words in hits.items() if words}
    score = sum(min(24, len(words) * (8 if topic in ('Muscles', 'Bones & landmarks') else 5))
                for topic, words in hits.items())
    score += 10 if original else 0
    score += 12 if width >= 500 and height >= 300 else 0
    flags = []
    if width and (width < 320 or height < 220):
        flags.append('Small image; inspect text legibility')
        score -= 20
    if not hits:
        flags.append('No specific anatomy terms found; relevance is uncertain')
    return max(0, min(100, score)), hits, flags


class Page(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base, self.images, self.links, self.title, self.words = base, [], [], '', []
        self.in_title = False
        self.ignored = 0
        self.anchors = []
        self.next_url = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('a', 'link') and attrs.get('href') and (attrs.get('rel') == 'next' or 'pager-next' in attrs.get('class', '').split()):
            self.next_url = urllib.parse.urljoin(self.base, attrs['href'])
        if tag in ('script', 'style'):
            self.ignored += 1
        if tag == 'title':
            self.in_title = True
        if tag == 'a' and attrs.get('href'):
            target = urllib.parse.urljoin(self.base, attrs['href'])
            self.links.append(target)
            self.anchors.append(target)
        elif tag == 'a':
            self.anchors.append('')
        if tag == 'meta' and attrs.get('property') in ('og:image', 'twitter:image'):
            self.add_image(attrs.get('content', ''), '')
        if tag == 'img':
            value = attrs.get('data-src') or attrs.get('data-original') or attrs.get('src', '')
            if not value or value.startswith('data:'):
                value = attrs.get('data-lazy-src', '')
            self.add_image(value, attrs.get('alt', '') or attrs.get('title', ''))

    def add_image(self, url, alt):
        url = urllib.parse.urljoin(self.base, html.unescape(url))
        if urllib.parse.urlsplit(url).scheme in ('https', 'http'):
            detail = self.anchors[-1] if self.anchors else ''
            if urllib.parse.urlsplit(detail).netloc != urllib.parse.urlsplit(self.base).netloc or re.search(r'\.(?:gif|png|jpe?g|webp)(?:\?|$)', detail, re.I):
                detail = ''
            self.images.append({'image_url': clean_url(url), 'caption': alt[:1500], 'detail_url': detail})

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag in ('script', 'style'):
            self.ignored = max(0, self.ignored - 1)
        if tag == 'a' and self.anchors:
            self.anchors.pop()

    def handle_data(self, data):
        if not self.ignored:
            self.words.append(data.strip())
        if self.in_title:
            self.title += data


def page_images(body, url, title=''):
    parser = Page(url)
    parser.feed(body)
    seen, images = set(), []
    for image in parser.images:
        if image['image_url'] in seen:
            continue
        seen.add(image['image_url'])
        detail = image.pop('detail_url', '')
        images.append(dict(image, source_url=clean_url(detail) if detail else url, title=title or parser.title.strip(),
                           context=' '.join(parser.words)[:3000]))
    return images


def feed_items(body, url):
    if b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('Feed entity declarations are not accepted')
    root = ET.fromstring(body)
    def local(tag):
        return tag.rsplit('}', 1)[-1]
    items = []
    for node in root.iter():
        if local(node.tag) not in ('item', 'entry'):
            continue
        title, link, content, author, published = '', '', [], '', ''
        direct_images = []
        for child in node.iter():
            tag = local(child.tag)
            if tag == 'title' and not title:
                title = child.text or ''
            if tag == 'link' and not link and child.get('rel', 'alternate') == 'alternate':
                link = child.get('href') or child.text or ''
            if tag in ('description', 'encoded', 'content', 'summary') and child.text:
                content.append(child.text)
            if tag in ('creator', 'author') and child.text:
                author = child.text
            if tag in ('pubDate', 'published', 'updated') and child.text:
                published = child.text
            if child.get('url') and (tag in ('thumbnail', 'enclosure') or
                    tag == 'content' and child.get('medium') == 'image'):
                if tag != 'enclosure' or child.get('type', '').startswith('image/'):
                    direct_images.append({'image_url': urllib.parse.urljoin(url, child.get('url')), 'caption': ''})
        if not link:
            continue
        link = clean_url(urllib.parse.urljoin(url, link.strip()))
        images = page_images('\n'.join(content), link, title)
        images.extend(dict(x, source_url=link, title=title, context='') for x in direct_images)
        items.append({'title': title, 'source_url': link, 'creator': author,
                      'published_at': published, 'images': images})
    return items


class Store:
    def __init__(self, state):
        self.state = Path(state)
        self.state.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(self.state / 'queue.sqlite'))
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS candidates (
                id TEXT PRIMARY KEY, source_url TEXT, image_url TEXT,
                sha256 TEXT, dhash TEXT, status TEXT, rank INTEGER, document TEXT,
                created_at REAL, updated_at REAL, UNIQUE(source_url, image_url));
            CREATE TABLE IF NOT EXISTS published (
                id TEXT PRIMARY KEY, media_key TEXT, sha256 TEXT, dhash TEXT);
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY, started_at REAL, report TEXT);
        ''')

    def rows(self, status=None):
        sql = 'SELECT id,status,rank,document FROM candidates'
        args = ()
        if status:
            sql += ' WHERE status=?'
            args = (status,)
        sql += ' ORDER BY rank DESC,created_at DESC'
        return [dict(json.loads(doc), id=cid, status=state, rank=rank)
                for cid, state, rank, doc in self.db.execute(sql, args)]

    def seed(self, repo):
        raw = subprocess.check_output(['node', '--import', 'tsx', 'scripts/export-meme-catalog.ts'], cwd=repo, timeout=30)
        rows = json.loads(raw)
        for row in rows:
            path = repo / 'public' / row['image'].lstrip('/')
            with Image.open(path) as image:
                fingerprint = dhash(ImageOps.exif_transpose(image))
            self.db.execute('INSERT OR REPLACE INTO published VALUES (?,?,?,?)',
                (row['id'], media_key(row['originalImage']), hashlib.sha256(path.read_bytes()).hexdigest(), fingerprint))
        self.db.commit()
        return len(rows)

    def known(self, source_url, image_url):
        return self.db.execute('SELECT id FROM candidates WHERE source_url=? AND image_url=?',
                               (clean_url(source_url), clean_url(image_url))).fetchone()

    def duplicate(self, image_url, sha=None, fingerprint=None, exclude=None):
        exact, near = [], []
        for cid, key, digest, image_hash in self.db.execute('SELECT id,media_key,sha256,dhash FROM published'):
            if key == media_key(image_url) or sha and digest == sha:
                exact.append('published:' + cid)
            elif fingerprint and image_hash and distance(fingerprint, image_hash) <= 6:
                near.append('published:' + cid)
        for cid, url, digest, image_hash in self.db.execute('SELECT id,image_url,sha256,dhash FROM candidates'):
            if cid == exclude:
                continue
            if media_key(url) == media_key(image_url) or sha and digest == sha:
                exact.append(cid)
            elif fingerprint and image_hash and distance(fingerprint, image_hash) <= 6:
                near.append(cid)
        return sorted(set(exact)), sorted(set(near))

    def insert(self, document, status='pending', sha=None, fingerprint=None):
        source, image = clean_url(document['source_url']), clean_url(document['image_url'])
        cid = hashlib.sha256((source + '\n' + image).encode()).hexdigest()[:20]
        # Discovery never resets an earlier keep/reject decision.
        self.db.execute('INSERT OR IGNORE INTO candidates VALUES (?,?,?,?,?,?,?,?,?,?)',
            (cid, source, image, sha, fingerprint, status, document.get('rank', 0),
             json.dumps(document), time.time(), time.time()))
        self.db.commit()
        return cid

    def decide(self, cid, decision, reviewer, hook, credit, rights, note):
        if decision not in ('kept', 'rejected', 'pending'):
            raise ValueError('Invalid review decision')
        row = self.db.execute('SELECT document,status FROM candidates WHERE id=?', (cid,)).fetchone()
        if not row:
            raise ValueError('Candidate does not exist')
        if row[1] == 'duplicate' and decision == 'kept':
            raise ValueError('An exact duplicate cannot be kept')
        if decision == 'kept' and not all(str(x).strip() for x in (reviewer, hook, credit, rights)):
            raise ValueError('Keeping requires reviewer, learning hook, credit and reuse notes')
        doc = json.loads(row[0])
        doc['review'] = {'reviewer': reviewer, 'learning_hook': hook, 'credit': credit,
                         'rights': rights, 'note': note, 'at': time.time()}
        self.db.execute('UPDATE candidates SET status=?,document=?,updated_at=? WHERE id=?',
                        (decision, json.dumps(doc), time.time(), cid))
        self.db.commit()


def prepare_image(data, folder, cid, use_ocr=False):
    digest = hashlib.sha256(data).hexdigest()
    try:
        raw = Image.open(io.BytesIO(data))
    except Image.DecompressionBombError as error:
        raise ValueError('Image exceeds safe processing dimensions') from error
    with raw:
        if raw.width * raw.height > 20000000:
            raise ValueError('Image exceeds 20 megapixel processing limit')
        if raw.format not in ('JPEG', 'PNG', 'WEBP', 'GIF'):
            raise ValueError('Unsupported image format')
        animated = getattr(raw, 'n_frames', 1) > 1
        image = ImageOps.exif_transpose(raw).convert('RGB')
        fingerprint = dhash(image)
        width, height = image.size
        image.thumbnail((1400, 2000))
        folder.mkdir(parents=True, exist_ok=True)
        preview = folder / (cid + '.webp')
        image.save(preview, quality=86, method=4)
        ocr = ''
        if use_ocr and shutil.which('tesseract'):
            # A temporary PNG makes this independent of Tesseract's WebP support.
            import tempfile
            with tempfile.TemporaryDirectory() as temporary:
                png = Path(temporary) / 'ocr.png'
                image.save(png)
                try:
                    result = subprocess.run(['tesseract', str(png), 'stdout', '--psm', '11'],
                        capture_output=True, text=True, timeout=15)
                    ocr = result.stdout[:6000] if result.returncode == 0 else ''
                except subprocess.TimeoutExpired:
                    pass
        image.thumbnail((500, 650))
        thumbnail = folder / (cid + '-thumb.webp')
        image.save(thumbnail, quality=82, method=4)
        return dict(sha256=digest, dhash=fingerprint, width=width, height=height,
                    animated=animated, ocr=ocr, preview='media/' + preview.name,
                    thumbnail='media/' + thumbnail.name)
