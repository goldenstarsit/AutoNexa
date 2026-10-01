import type {
  DcaExitOrderModel as DcaExitOrderDomainModel,
  DcaExitOrderModelSelector,
  DcaExitOrderPersistenceModel,
} from '../../../domain/strategy/dca/dcaExitOrderModel';

export class DcaExitOrderModelSelectorImpl
  implements DcaExitOrderModelSelector
{
  constructor(private readonly persistence: DcaExitOrderPersistenceModel) {}

  getByCycleAndType(
    cycleId: string,
    exitType: 'stopLoss' | 'takeProfit',
  ): DcaExitOrderDomainModel | undefined {
    return this.persistence.getByCycleAndType(cycleId, exitType);
  }

  getFills(
    exitOrderId: string,
  ): readonly DcaExitOrderDomainModel['fills'][number][] {
    return this.persistence.getFills(exitOrderId);
  }
}
