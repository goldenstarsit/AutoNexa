export interface ExchangeCapabilities {
  spotTrading: boolean;
  marginTrading: boolean;
  makerExecution: boolean;
  takerExecution: boolean;
  hybridExecution: boolean;
  orderTypes: string[];
}
