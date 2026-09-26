export interface ExchangeSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quotePrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  orderTypes: string[];
  spotTradingAllowed: boolean;
  marginTradingAllowed: boolean;
  quoteAmountPrecision: string;
  baseSizePrecision: string;
  maxQuoteAmount: string;
  quoteAmountPrecisionMarket: string;
  maxQuoteAmountMarket: string;
}
