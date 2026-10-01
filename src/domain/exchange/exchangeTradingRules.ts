export interface ExchangeTradingRules {
  symbol: string;
  status: string;
  orderTypes: string[];
  spotTradingAllowed: boolean;
  marginTradingAllowed: boolean;
  baseAssetPrecision: number;
  quotePrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  quoteAmountPrecision: string;
  baseSizePrecision: string;
  maxQuoteAmount: string;
  quoteAmountPrecisionMarket: string;
  maxQuoteAmountMarket: string;
}
