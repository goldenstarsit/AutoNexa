import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExchangeSignRequest } from '../../auth/exchangeSigner';
import type { ExchangeSigner } from '../../auth/exchangeSigner';
import { MexcPrivateRequestBuilder } from './mexcPrivateRequest';

class TestSigner implements ExchangeSigner {
  lastRequest?: ExchangeSignRequest;

  sign(request: ExchangeSignRequest): string {
    this.lastRequest = request;
    return 'test-signature';
  }
}

test('MexcPrivateRequestBuilder uses the supplied synchronized timestamp', () => {
  const signer = new TestSigner();
  const builder = new MexcPrivateRequestBuilder('test-api-key', signer);

  const timestamp = 1_700_000_123_456;
  const request = builder.build({ symbol: 'BNBUSDT' }, timestamp);

  assert.equal(request.timestamp, timestamp);
  assert.match(request.queryString, /timestamp=1700000123456/);
  assert.equal(signer.lastRequest?.timestamp, timestamp);
  assert.equal(request.signature, 'test-signature');
});
