import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsUrl, sanitizeAnalyticsProperties } from './analytics';

test('analytics URLs preserve app navigation and remove OAuth and arbitrary input', () => {
  assert.equal(analyticsUrl('https://anato.meme/?mode=study&atlas=bones&code=secret&search=my-email#access_token=secret'), 'https://anato.meme/?atlas=bones&mode=study');
  assert.equal(analyticsUrl('https://anato.meme/?mode=memes&meme=34&activity=quiz&error_description=private'), 'https://anato.meme/?mode=memes&meme=34&activity=quiz');
  assert.equal(analyticsUrl('https://anato.meme/?atlas=private&mode=private&meme=private&activity=private'), 'https://anato.meme/');
  assert.equal(analyticsUrl('https://user:password@example.com/?email=private#private'), 'https://example.com/');
  assert.equal(analyticsUrl('not a URL'), '');
});

test('send-time sanitization covers SDK current/referrer and nested initial person URLs', () => {
  const sanitized = sanitizeAnalyticsProperties({
    $current_url: 'https://anato.meme/?code=secret&atlas=muscles#token',
    $referrer: 'https://example.com/?email=secret',
    $set_once: { $initial_current_url: 'https://anato.meme/?code=secret', $initial_referrer: 'https://example.com/?secret' },
    $set: { $referrer: '$direct' },
    collection: 'muscles', correct: false,
  });
  assert.deepEqual(sanitized, {
    $current_url: 'https://anato.meme/?atlas=muscles',
    $referrer: 'https://example.com/',
    $set_once: { $initial_current_url: 'https://anato.meme/', $initial_referrer: 'https://example.com/' },
    $set: { $referrer: '$direct' },
    collection: 'muscles', correct: false,
  });
  assert.ok(!JSON.stringify(sanitized).includes('secret'));
});
