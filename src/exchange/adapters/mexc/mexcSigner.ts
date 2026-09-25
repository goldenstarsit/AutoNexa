import { createHmac } from 'node:crypto';
import type {
  ExchangeSignRequest,
  ExchangeSigner,
} from '../../auth/exchangeSigner';

export class MexcSigner implements ExchangeSigner {
  constructor(private readonly apiSecret: string) {}

  sign(request: ExchangeSignRequest): string {
    return createHmac('sha256', this.apiSecret)
      .update(request.queryString)
      .digest('hex');
  }
}
