import type {
  DcaInitialOrderModel,
  DcaInitialOrderPersistenceModel,
} from '../../../domain/strategy/dca/dcaInitialOrderModel';
import { DcaInitialOrderRepository } from '../dcaInitialOrderRepository';

export class DcaInitialOrderPersistenceModelImpl
  implements DcaInitialOrderPersistenceModel
{
  constructor(
    private readonly repository: DcaInitialOrderRepository,
  ) {}

  getByCycle(cycleId: string): DcaInitialOrderModel | undefined {
    return this.repository.getByCycle(cycleId);
  }

  saveOrder(
    configurationId: string,
    cycleId: string,
    order: Parameters<DcaInitialOrderRepository['saveOrder']>[2],
    request: Parameters<DcaInitialOrderRepository['saveOrder']>[3],
  ): DcaInitialOrderModel {
    return this.repository.saveOrder(
      configurationId,
      cycleId,
      order,
      request,
    );
  }

  updateOrder(
    initialOrderId: string,
    order: Parameters<DcaInitialOrderRepository['updateOrder']>[1],
  ): DcaInitialOrderModel {
    return this.repository.updateOrder(initialOrderId, order);
  }

  getFills(initialOrderId: string) {
    return this.repository.getFills(initialOrderId);
  }

  saveFills(
    initialOrderId: string,
    trades: Parameters<DcaInitialOrderRepository['saveFills']>[1],
  ) {
    return this.repository.saveFills(initialOrderId, trades);
  }
}
