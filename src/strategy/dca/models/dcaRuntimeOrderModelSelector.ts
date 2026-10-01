import type {
  DcaRuntimeOrderModel,
  DcaRuntimeOrderModelSelector,
  DcaRuntimeOrderPersistenceModel,
} from '../../../domain/strategy/dca/dcaRuntimeOrderModel';

export class DcaRuntimeOrderModelSelectorImpl
  implements DcaRuntimeOrderModelSelector
{
  constructor(private readonly persistence: DcaRuntimeOrderPersistenceModel) {}

  getByCycleAndLevel(
    cycleId: string,
    level: number,
  ): DcaRuntimeOrderModel | undefined {
    return this.persistence.getByCycleAndLevel(cycleId, level);
  }

  getFills(
    runtimeOrderId: string,
  ): readonly DcaRuntimeOrderModel['fills'][number][] {
    return this.persistence.getFills(runtimeOrderId);
  }

  getFillsByCycle(
    cycleId: string,
  ): readonly DcaRuntimeOrderModel['fills'][number][] {
    return this.persistence.getFillsByCycle(cycleId);
  }
}
