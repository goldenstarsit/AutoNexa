export interface ExchangeAssetBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface ExchangeAccount {
  balances: ExchangeAssetBalance[];
}
