import type {
  DcaExitOrderModel as DcaExitOrderDomainModel,
  DcaExitOrderModelSelector,
} from '../../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderRepository } from '../dcaExitOrderRepository';

export class DcaExitOrderModelSelectorImpl
  implements DcaExitOrderModelSelector
{
  constructor(private readonly repository: DcaExitOrderRepository) {}

  getByCycleAndType(
    cycleId: string,
    exitType: 'stopLoss' | 'takeProfit',
  ): DcaExitOrderDomainModel | undefined {
    return this.repository.getByCycleAndType(cycleId, exitType);
  }

  getFills(
    exitOrderId: string,
  ): readonly DcaExitOrderDomainModel['fills'][number][] {
    return this.repository.getFills(exitOrderId);
  }
}
