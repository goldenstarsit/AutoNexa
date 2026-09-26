import { getExchangeOrderErrorData } from './exchangeOrderError';

export type MakerFailureReason =
  | 'maker_unavailable'
  | 'maker_rejected'
  | 'unknown';

export interface MakerFailure {
  reason: MakerFailureReason;
  error: unknown;
}

export function classifyMakerFailure(error: unknown): MakerFailure {
  const data = getExchangeOrderErrorData(error);

  if (data?.code === 30041 || data?.code === '30041') {
    return {
      reason: 'maker_rejected',
      error,
    };
  }

  return {
    reason: 'unknown',
    error,
  };
}
