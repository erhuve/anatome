import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

from .collect import Collector
from .core import Store
from .network import Client, FetchError
from .review import serve, write_review

REPO = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description='Discover anatomy meme candidates into a local review queue.')
    parser.add_argument('--state', type=Path, default=REPO / '.meme-harvest')
    parser.add_argument('--config', type=Path, default=Path(__file__).with_name('sources.json'))
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('init', help='Seed duplicate detection with the shipped app images')
    sub.add_parser('doctor', help='Show setup and source readiness without making network requests')
    collect = sub.add_parser('collect', help='Scan enabled sources and build the review queue')
    collect.add_argument('--source', action='append', help='Select configured source IDs')
    collect.add_argument('--max-images', type=int)
    collect.add_argument('--max-requests', type=int)
    collect.add_argument('--ocr', action='store_true', help='Use local Tesseract if installed')
    add = sub.add_parser('add', help='Inspect a supplied source page or source/image pair')
    add.add_argument('url')
    add.add_argument('--image')
    add.add_argument('--title', default='')
    review = sub.add_parser('review', help='Generate a static gallery; optionally serve it with decision controls')
    review.add_argument('--serve', action='store_true')
    review.add_argument('--port', type=int, default=5194)
    decide = sub.add_parser('decide', help='Save a candidate review')
    decide.add_argument('id')
    decide.add_argument('decision', choices=['kept', 'rejected', 'pending'])
    for name in ('reviewer', 'hook', 'credit', 'rights', 'note', 'humor'):
        decide.add_argument('--' + name, default='')
    export = sub.add_parser('export', help='Export kept candidates for lesson authoring; does not edit the app')
    export.add_argument('--output', type=Path)
    sub.add_parser('stats')
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    if args.command == 'doctor':
        print(json.dumps({'python': sys.version.split()[0], 'node': bool(shutil.which('node')),
            'ocr': bool(shutil.which('tesseract')), 'state': str(args.state),
            'reddit_access_configured': os.environ.get('REDDIT_APPROVED') == '1' and bool(os.environ.get('REDDIT_ACCESS_TOKEN')) and bool(os.environ.get('REDDIT_USER_AGENT')),
            'search_key_configured': bool(os.environ.get('BRAVE_SEARCH_API_KEY')),
            'sources': [{'id': s['id'], 'enabled': s.get('enabled', True), 'kind': s['kind']} for s in config['sources']]}, indent=2))
        return
    store = Store(args.state.resolve(), config.get('exclusions', []))
    try:
        if args.command == 'init':
            print('Seeded ' + str(store.seed(REPO)) + ' published memes.')
        elif args.command in ('collect', 'add'):
            seeded = store.seed(REPO)
            request_limit = getattr(args, 'max_requests', None) or config.get('request_limit', 80)
            image_limit = getattr(args, 'max_images', None) or config.get('image_limit', 20)
            if not 1 <= request_limit <= 500 or not 1 <= image_limit <= 100:
                raise ValueError('Use 1–500 requests and 1–100 images per run')
            client = Client(store.state, config['user_agent'], request_limit, config.get('delay_seconds', 2),
                            os.environ.get('REDDIT_APPROVED') == '1')
            collector = Collector(store, client, image_limit, getattr(args, 'ocr', False))
            if args.command == 'add':
                source = {'id': 'manual', 'rights': 'Unverified; inspect original credit and reuse terms'}
                if args.image:
                    collector.ingest({'source_url': args.url, 'image_url': args.image, 'title': args.title}, source)
                else:
                    collector.page(args.url, source, args.title)
                report = collector.report
            else:
                selected = [s for s in config['sources'] if not args.source or s['id'] in args.source]
                if not selected:
                    raise ValueError('No matching configured sources')
                report = collector.run(selected)
            report.update(published_seed=seeded, requests_used=request_limit - client.remaining)
            (store.state / 'last-run.json').write_text(json.dumps(report, indent=2))
            write_review(store)
            print(json.dumps(report, indent=2))
            print('Review: ' + str(store.state / 'review.html'))
        elif args.command == 'review':
            write_review(store)
            if args.serve:
                if not 1024 <= args.port <= 65535:
                    raise ValueError('Choose a port between 1024 and 65535')
                serve(store, args.port)
            else:
                print(store.state / 'review.html')
        elif args.command == 'decide':
            store.decide(args.id, args.decision, args.reviewer, args.hook, args.credit, args.rights, args.note, args.humor)
            write_review(store)
            print('Saved review for ' + args.id)
        elif args.command == 'export':
            output = args.output or store.state / 'kept-candidates.json'
            rows = store.rows('kept')
            if any(not row.get('review', {}).get('humor', '').strip() for row in rows):
                raise ValueError('Re-review kept candidates and describe their actual joke before exporting')
            payload = {'schema_version': 1, 'purpose': 'Candidates for lesson authoring; not publication-ready content',
                'exported_at': time.time(), 'candidates': rows}
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
            print('Exported ' + str(len(rows)) + ' kept candidates to ' + str(output))
        elif args.command == 'stats':
            rows = store.rows()
            print(json.dumps({status: sum(r['status'] == status for r in rows)
                for status in ('pending', 'kept', 'rejected', 'duplicate')}, indent=2))
    finally:
        store.db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        store.db.close()


if __name__ == '__main__':
    try:
        main()
    except (FetchError, ValueError, OSError) as error:
        print('Collector: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
