import type {
  ExchangeRateLimit,
  ExchangeRateLimitPolicy,
  ExchangeRateLimiter,
} from './exchangeRateLimit';

export class InMemoryExchangeRateLimiter implements ExchangeRateLimiter {
  private windowStartedAt = Date.now();
  private requestCount = 0;
  private state: ExchangeRateLimit;

  constructor(private readonly policy: ExchangeRateLimitPolicy) {
    this.state = {
      limit: policy.maxRequests,
      remaining: policy.maxRequests,
      resetAt: this.windowStartedAt + policy.windowMs,
    };
  }

  canRequest(): boolean {
    this.refreshWindow();

    return this.requestCount < this.policy.maxRequests;
  }

  getState(): ExchangeRateLimit {
    this.refreshWindow();

    return { ...this.state };
  }

  recordRequest(): void {
    this.refreshWindow();

    if (this.requestCount >= this.policy.maxRequests) {
      return;
    }

    this.requestCount += 1;
    this.state = {
      ...this.state,
      remaining: this.policy.maxRequests - this.requestCount,
    };
  }

  update(limit: ExchangeRateLimit): void {
    this.state = { ...limit };
  }

  private refreshWindow(): void {
    const now = Date.now();

    if (now < this.windowStartedAt + this.policy.windowMs) {
      return;
    }

    this.windowStartedAt = now;
    this.requestCount = 0;
    this.state = {
      limit: this.policy.maxRequests,
      remaining: this.policy.maxRequests,
      resetAt: now + this.policy.windowMs,
    };
  }
}
