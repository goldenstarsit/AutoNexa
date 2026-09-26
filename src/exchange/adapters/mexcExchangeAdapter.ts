import type { ExchangeAdapter } from '../exchange';
import type { ExchangeAccount } from '../account/exchangeAccount';
import type { ExchangeOrder, ExchangeOrderRequest } from '../order/exchangeOrder';
import { MexcAccountApi } from './mexc/mexcAccountApi';
import { MexcOrderApi } from './mexc/mexcOrderApi';
import { OrderExecutionService } from '../order/orderExecutionService';
import { MexcPrivateApiClient } from './mexc/mexcPrivateApiClient';

export class MexcExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mexc';
  readonly name = 'MEXC';

  private readonly privateApiClient = new MexcPrivateApiClient();

  private readonly accountApi = new MexcAccountApi(
    this.privateApiClient,
  );

  private readonly orderApi = new MexcOrderApi(
    this.privateApiClient,
  );

  private readonly orderExecutionService = new OrderExecutionService(
    this.orderApi,
  );

  async connect(): Promise<void> {
    // Connection lifecycle will be expanded in the MEXC integration milestone.
  }

  async disconnect(): Promise<void> {
    // Connection cleanup will be expanded in the MEXC integration milestone.
  }

  async getAccount(): Promise<ExchangeAccount> {
    return this.accountApi.getAccount();
  }

  async placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    return this.orderExecutionService.execute(request);
  }

  async getOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    return this.orderApi.getOrder(symbol, orderId);
  }
}
