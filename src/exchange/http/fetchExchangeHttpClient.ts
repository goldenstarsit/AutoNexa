import { ExchangeHttpError } from './exchangeHttpError';
import type {
  ExchangeHttpClient,
  ExchangeHttpRequest,
  ExchangeHttpResponse,
} from './exchangeHttpClient';

export class FetchExchangeHttpClient implements ExchangeHttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<T = unknown>(
    request: ExchangeHttpRequest,
  ): Promise<ExchangeHttpResponse<T>> {
    const url = new URL(request.path, this.baseUrl);

    for (const [key, value] of Object.entries(request.query ?? {})) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        ...(request.body ? { 'Content-Type': 'application/json' } : {}),
        ...(request.headers ?? {}),
      },
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });

    const text = await response.text();

    let data: unknown;

    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new ExchangeHttpError(
        `Exchange HTTP request failed with status ${response.status}`,
        response.status,
        data,
      );
    }

    return {
      status: response.status,
      data: data as T,
    };
  }
}
