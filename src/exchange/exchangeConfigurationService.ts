import type { DatabaseAdapter } from '../database/databaseAdapter';
import {
  ExchangeRepository,
  type ExchangeRecord,
} from './exchangeRepository';

export class ExchangeConfigurationService {
  private readonly repository: ExchangeRepository;

  constructor(db: DatabaseAdapter) {
    this.repository = new ExchangeRepository(db);
  }

  list(): ExchangeRecord[] {
    return this.repository.getAll();
  }

  get(id: string): ExchangeRecord | undefined {
    return this.repository.getById(id);
  }

  enable(id: string, updatedAt: string): void {
    this.repository.setEnabled(id, true, updatedAt);
  }

  disable(id: string, updatedAt: string): void {
    this.repository.setEnabled(id, false, updatedAt);
  }
}
