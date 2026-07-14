import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_DATA_SOURCE = 'static';
const { usesStaticData } = await import('../lib/staticMode.js');

test('usesStaticData returns true when NEXT_PUBLIC_DATA_SOURCE=static', () => {
  assert.equal(usesStaticData(), true);
});

test('usesStaticData returns false when NEXT_PUBLIC_DATA_SOURCE=api', () => {
  const previous = process.env.NEXT_PUBLIC_DATA_SOURCE;
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'api';
  assert.equal(usesStaticData(), false);
  process.env.NEXT_PUBLIC_DATA_SOURCE = previous;
});
