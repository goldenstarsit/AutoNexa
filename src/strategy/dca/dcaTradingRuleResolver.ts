import type { ExchangeTradingRules } from '../../exchange/market/exchangeTradingRules';
import { ExchangeService } from '../../exchange/exchangeService';

export interface DcaTradingRuleResolution {
  rules: ExchangeTradingRules;
  minimumNotional: string;
}

export class DcaTradingRuleResolver {
  private readonly exchangeService: ExchangeService;

  constructor(db: ConstructorParameters<typeof ExchangeService>[0]) {
    this.exchangeService = new ExchangeService(db);
  }

  async resolve(
    exchangeId: string,
    symbol: string,
  ): Promise<DcaTradingRuleResolution> {
    const rules = await this.exchangeService.getTradingRules(
      exchangeId,
      symbol,
    );

    if (!rules) {
      throw new Error(
        `Trading rules not found: ${exchangeId}:${symbol}`,
      );
    }

    if (!rules.spotTradingAllowed) {
      throw new Error(
        `Spot trading is disabled: ${exchangeId}:${symbol}`,
      );
    }

    const minimumNotional = rules.quoteAmountPrecisionMarket;

    if (!minimumNotional || minimumNotional === '0') {
      throw new Error(
        `Market minimum notional is unavailable: ${exchangeId}:${symbol}`,
      );
    }

    return {
      rules,
      minimumNotional,
    };
  }
}
