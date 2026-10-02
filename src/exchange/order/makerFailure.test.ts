import assert from 'node:assert/strict';
import { ExchangeHttpError } from '../http/exchangeHttpError';
import {
  classifyMakerFailure,
  shouldFallbackToTaker,
} from './makerFailure';

const unavailable = classifyMakerFailure(
  new ExchangeHttpError('maker unavailable', 503, { code: 10001 }),
);
assert.equal(unavailable.reason, 'unknown');
assert.equal(shouldFallbackToTaker(unavailable), false);

const rejected = classifyMakerFailure(
  new ExchangeHttpError('maker rejected', 400, { code: 30041 }),
);
assert.equal(rejected.reason, 'maker_rejected');
assert.equal(shouldFallbackToTaker(rejected), false);

const rejectedStringCode = classifyMakerFailure(
  new ExchangeHttpError('maker rejected', 400, { code: '30041' }),
);
assert.equal(rejectedStringCode.reason, 'maker_rejected');
assert.equal(shouldFallbackToTaker(rejectedStringCode), false);

const fallback = {
  reason: 'maker_unavailable' as const,
  error: new Error('maker unavailable'),
};
assert.equal(shouldFallbackToTaker(fallback), true);

console.log('makerFailure tests passed');
