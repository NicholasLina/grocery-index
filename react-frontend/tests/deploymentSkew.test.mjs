import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDeploymentSkewErrorMessage,
  isNextStaticAssetUrl,
  shouldReloadForFailedAsset,
} from '../lib/deploymentSkew.js';

test('isNextStaticAssetUrl matches hashed Next static CSS/JS paths', () => {
  assert.equal(
    isNextStaticAssetUrl('https://grocery-index.nicklina.com/_next/static/css/be06795e4336ce1c.css'),
    true
  );
  assert.equal(
    isNextStaticAssetUrl('/_next/static/chunks/main-app-354157d72c96388a.js?dpl=dpl_abc'),
    true
  );
  assert.equal(isNextStaticAssetUrl('/api/statcan'), false);
  assert.equal(isNextStaticAssetUrl('https://example.com/styles.css'), false);
  assert.equal(isNextStaticAssetUrl(null), false);
});

test('shouldReloadForFailedAsset only reloads once for Next static assets', () => {
  assert.equal(
    shouldReloadForFailedAsset({
      url: '/_next/static/css/be06795e4336ce1c.css',
      alreadyReloaded: false,
    }),
    true
  );
  assert.equal(
    shouldReloadForFailedAsset({
      url: '/_next/static/css/be06795e4336ce1c.css',
      alreadyReloaded: true,
    }),
    false
  );
  assert.equal(
    shouldReloadForFailedAsset({
      url: '/favicon.ico',
      alreadyReloaded: false,
    }),
    false
  );
});

test('isDeploymentSkewErrorMessage detects chunk load failures', () => {
  assert.equal(
    isDeploymentSkewErrorMessage('Loading chunk 964 failed.\n(error: https://example/_next/static/chunks/964.js)'),
    true
  );
  assert.equal(isDeploymentSkewErrorMessage('ChunkLoadError: Loading chunk failed'), true);
  assert.equal(
    isDeploymentSkewErrorMessage('Failed to fetch dynamically imported module: /_next/static/chunks/x.js'),
    true
  );
  assert.equal(isDeploymentSkewErrorMessage('NetworkError when attempting to fetch resource.'), false);
});
