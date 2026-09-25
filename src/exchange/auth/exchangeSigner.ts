export interface ExchangeSignRequest {
  timestamp: number;
  queryString: string;
}

export interface ExchangeSigner {
  sign(request: ExchangeSignRequest): string;
}
