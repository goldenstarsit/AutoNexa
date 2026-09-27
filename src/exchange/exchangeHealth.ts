export type ExchangeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ExchangeHealth {
  state: ExchangeConnectionState;
  checkedAt: number;
  error?: string;
}
