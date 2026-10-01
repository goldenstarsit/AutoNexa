import type {
  DcaRuntimeOrderModel,
  DcaRuntimeOrderModelSelector,
} from '../../../domain/strategy/dca/dcaRuntimeOrderModel';
import { DcaOrderRepository } from '../dcaOrderRepository';

export class DcaRuntimeOrderModelSelectorImpl
  implements DcaRuntimeOrderModelSelector
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
}
