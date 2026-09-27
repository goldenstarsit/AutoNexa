export type ExchangeErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'rateLimit'
  | 'notFound'
  | 'network'
  | 'server'
  | 'unknown';

export interface ExchangeError {
  category: ExchangeErrorCategory;
  message: string;
  code?: string | number;
  status?: number;
  retryable: boolean;
  cause?: unknown;
}
