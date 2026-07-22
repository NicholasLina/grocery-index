import test from 'node:test';
import assert from 'node:assert/strict';
import { usesStaticData } from '../lib/staticMode.js';

test('usesStaticData returns true when NEXT_PUBLIC_DATA_SOURCE=static', () => {
  const previous = process.env.NEXT_PUBLIC_DATA_SOURCE;
  const previousVercel = process.env.VERCEL;
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'static';
  delete process.env.VERCEL;
  assert.equal(usesStaticData(), true);
  process.env.NEXT_PUBLIC_DATA_SOURCE = previous;
  if (previousVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = previousVercel;
  }
});

test('usesStaticData returns false when NEXT_PUBLIC_DATA_SOURCE=api', () => {
  const previous = process.env.NEXT_PUBLIC_DATA_SOURCE;
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'api';
  assert.equal(usesStaticData(), false);
  process.env.NEXT_PUBLIC_DATA_SOURCE = previous;
});

test('usesStaticData defaults to true on Vercel when unset', () => {
  const previous = process.env.NEXT_PUBLIC_DATA_SOURCE;
  const previousVercel = process.env.VERCEL;
  delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  process.env.VERCEL = '1';
  assert.equal(usesStaticData(), true);
  process.env.NEXT_PUBLIC_DATA_SOURCE = previous;
  if (previousVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = previousVercel;
  }
});
