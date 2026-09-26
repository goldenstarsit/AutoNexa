export type MakerFailureReason =
  | 'maker_unavailable'
  | 'maker_rejected'
  | 'unknown';

export interface MakerFailure {
  reason: MakerFailureReason;
  error: unknown;
}

export function classifyMakerFailure(error: unknown): MakerFailure {
  return {
    reason: 'unknown',
    error,
  };
}
