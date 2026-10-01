import type {
  DcaRuntimeOrderModel,
  DcaRuntimeOrderPersistenceModel,
} from '../../../domain/strategy/dca/dcaRuntimeOrderModel';
import { DcaOrderRepository } from '../dcaOrderRepository';

export class DcaRuntimeOrderPersistenceModelImpl
  implements DcaRuntimeOrderPersistenceModel
{
  constructor(private readonly repository: DcaOrderRepository) {}

  getByCycleAndLevel(
    cycleId: string,
    level: number,
  ): DcaRuntimeOrderModel | undefined {
    return this.repository.getByCycleAndLevel(cycleId, level);
  }

  getFills(
    runtimeOrderId: string,
  ): readonly DcaRuntimeOrderModel['fills'][number][] {
    return this.repository.getFills(runtimeOrderId);
  }

  getFillsByCycle(
    cycleId: string,
  ): readonly DcaRuntimeOrderModel['fills'][number][] {
    return this.repository.getFillsByCycle(cycleId);
  }
  saveOrder(
    configurationId: string,
    cycleId: string,
    dcaOrderId: string,
    level: number,
    order: Parameters<DcaOrderRepository['saveOrder']>[4],
    request: Parameters<DcaOrderRepository['saveOrder']>[5],
  ): DcaRuntimeOrderModel {
    return this.repository.saveOrder(
      configurationId,
      cycleId,
      dcaOrderId,
      level,
      order,
      request,
    );
  }

  saveFills(
    runtimeOrderId: string,
    trades: Parameters<DcaOrderRepository['saveFills']>[1],
  ): readonly DcaRuntimeOrderModel['fills'][number][] {
    return this.repository.saveFills(runtimeOrderId, trades);
  }

}
