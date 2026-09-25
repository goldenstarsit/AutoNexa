export interface ExchangeHttpRequest {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface ExchangeHttpResponse<T = unknown> {
  status: number;
  data: T;
}

export interface ExchangeHttpClient {
  request<T = unknown>(
    request: ExchangeHttpRequest,
  ): Promise<ExchangeHttpResponse<T>>;
}
