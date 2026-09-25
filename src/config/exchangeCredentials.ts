export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
}

export function getMexcCredentials(): ExchangeCredentials {
  const apiKey = process.env.MEXC_API_KEY;
  const apiSecret = process.env.MEXC_API_SECRET;

  if (!apiKey) {
    throw new Error('MEXC_API_KEY is not configured');
  }

  if (!apiSecret) {
    throw new Error('MEXC_API_SECRET is not configured');
  }

  return {
    apiKey,
    apiSecret,
  };
}
