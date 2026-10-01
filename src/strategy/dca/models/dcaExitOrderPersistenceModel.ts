import type {
  DcaExitOrderModel,
  DcaExitOrderPersistenceModel,
} from '../../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderRepository } from '../dcaExitOrderRepository';

export class DcaExitOrderPersistenceModelImpl
  implements DcaExitOrderPersistenceModel
{
  constructor(private readonly repository: DcaExitOrderRepository) {}

  getByCycleAndType(
    cycleId: string,
    exitType: 'stopLoss' | 'takeProfit',
  ): DcaExitOrderModel | undefined {
    return this.repository.getByCycleAndType(cycleId, exitType);
  }

  getFills(
    exitOrderId: string,
  ): readonly DcaExitOrderModel['fills'][number][] {
    return this.repository.getFills(exitOrderId);
  }

  saveOrder(
    configurationId: string,
    cycleId: string,
    exitType: 'stopLoss' | 'takeProfit',
    order: Parameters<DcaExitOrderRepository['saveOrder']>[3],
    request: Parameters<DcaExitOrderRepository['saveOrder']>[4],
  ): DcaExitOrderModel {
    return this.repository.saveOrder(
      configurationId,
      cycleId,
      exitType,
      order,
      request,
    );
  }

  updateOrder(
    exitOrderId: string,
    order: Parameters<DcaExitOrderRepository['updateOrder']>[1],
  ): DcaExitOrderModel {
    return this.repository.updateOrder(exitOrderId, order);
  }

  saveFills(
    exitOrderId: string,
    trades: Parameters<DcaExitOrderRepository['saveFills']>[1],
  ): readonly DcaExitOrderModel['fills'][number][] {
    return this.repository.saveFills(exitOrderId, trades);
  }
}
