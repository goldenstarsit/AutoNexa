export interface ExchangeRateLimit {
  limit: number;
  remaining: number;
  resetAt?: number;
}

export interface ExchangeRateLimitPolicy {
  maxRequests: number;
  windowMs: number;
}

export interface ExchangeRateLimiter {
  canRequest(): boolean;
  getState(): ExchangeRateLimit;
  recordRequest(): void;
  update(limit: ExchangeRateLimit): void;
}
