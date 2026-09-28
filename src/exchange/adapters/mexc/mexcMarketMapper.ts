import type { ExchangeSymbolInfo } from '../../market/exchangeMarket';
import type { MexcExchangeInfoResponse } from './mexcMarketApi';

export type MexcSymbolInfo = MexcExchangeInfoResponse['symbols'][number];

export function mapMexcSymbolInfo(
  info: MexcSymbolInfo | undefined,
): ExchangeSymbolInfo | undefined {
  if (!info) {
    return undefined;
  }

  return {
    symbol: info.symbol,
    status: info.status,
    baseAsset: info.baseAsset,
    quoteAsset: info.quoteAsset,
    baseAssetPrecision: info.baseAssetPrecision,
    quotePrecision: info.quotePrecision,
    quoteAssetPrecision: info.quoteAssetPrecision,
    baseCommissionPrecision: info.baseCommissionPrecision,
    quoteCommissionPrecision: info.quoteCommissionPrecision,
    orderTypes: info.orderTypes,
    spotTradingAllowed: info.isSpotTradingAllowed,
    marginTradingAllowed: info.isMarginTradingAllowed,
    quoteAmountPrecision: info.quoteAmountPrecision,
    baseSizePrecision: info.baseSizePrecision,
    maxQuoteAmount: info.maxQuoteAmount,
    quoteAmountPrecisionMarket: info.quoteAmountPrecisionMarket,
    maxQuoteAmountMarket: info.maxQuoteAmountMarket,
  };
}
