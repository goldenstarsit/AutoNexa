import type {
  DcaConfigurationModelRecord,
  DcaConfigurationPersistenceModel,
} from '../../../domain/strategy/dca/dcaConfigurationModel';
import { DcaConfigurationRepository } from '../dcaConfigurationRepository';

export class DcaConfigurationPersistenceModelImpl
  implements DcaConfigurationPersistenceModel
{
  constructor(private readonly repository: DcaConfigurationRepository) {}

  getById(id: string): DcaConfigurationModelRecord | undefined {
    return this.repository.getById(id);
  }

  getAll(): readonly DcaConfigurationModelRecord[] {
    return this.repository.getAll();
  }
}
