export class ExchangeHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = 'ExchangeHttpError';
  }
}
