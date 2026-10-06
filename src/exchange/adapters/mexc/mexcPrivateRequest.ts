import type { ExchangeSigner } from '../../auth/exchangeSigner';

export interface MexcPrivateRequest {
  apiKey: string;
  signature: string;
  timestamp: number;
  queryString: string;
}

export class MexcPrivateRequestBuilder {
  constructor(
    private readonly apiKey: string,
    private readonly signer: ExchangeSigner,
  ) {}

  build(
    params: Record<string, string | number | boolean> = {},
    timestamp = Date.now(),
  ): MexcPrivateRequest {
    const queryParams = {
      ...params,
      timestamp,
    };

    const queryString = Object.entries(queryParams)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      )
      .join('&');

    return {
      apiKey: this.apiKey,
      signature: this.signer.sign({
        timestamp,
        queryString,
      }),
      timestamp,
      queryString,
    };
  }
}
