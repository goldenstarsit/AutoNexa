import type { DatabaseModel } from '../../domain/database/databaseModel';

export type DcaCycleStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'stopped';

export interface DcaCycleRecord {
  id: string;
  dcaConfigurationId: string;
  cycleNumber: number;
  status: DcaCycleStatus;
  initialEntryPrice?: string;
  entryQuantity?: string;
  entryQuoteQuantity?: string;
  averageEntryPrice?: string;
  createdAt: string;
  updatedAt: string;
}

interface DcaCycleRow {
  id: string;
  dca_configuration_id: string;
  cycle_number: number;
  status: string;
  initial_entry_price: string | null;
  entry_quantity: string | null;
  entry_quote_quantity: string | null;
  average_entry_price: string | null;
  created_at: string;
  updated_at: string;
}

export class DcaCycleRepository {
  constructor(private readonly db: DatabaseModel) {}

  create(
    id: string,
    dcaConfigurationId: string,
    cycleNumber: number,
    createdAt: string = new Date().toISOString(),
  ): DcaCycleRecord {
    if (!Number.isInteger(cycleNumber) || cycleNumber < 1) {
      throw new Error(
        `Invalid DCA cycle number: ${cycleNumber}`,
      );
    }

    dbRun(
      this.db,
      `
        INSERT INTO dca_cycles (
          id,
          dca_configuration_id,
          cycle_number,
          status,
          initial_entry_price,
          entry_quantity,
          entry_quote_quantity,
          average_entry_price,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'pending', NULL, NULL, NULL, NULL, ?, ?)
      `,
      id,
      dcaConfigurationId,
      cycleNumber,
      createdAt,
      createdAt,
    );

    const cycle = this.getById(id);

    if (!cycle) {
      throw new Error(`DCA cycle was not created: ${id}`);
    }

    return cycle;
  }

  getById(id: string): DcaCycleRecord | undefined {
    const row = this.db.get<DcaCycleRow>(
      `
        SELECT
          id,
          dca_configuration_id,
          cycle_number,
          status,
          initial_entry_price,
          entry_quantity,
          entry_quote_quantity,
          average_entry_price,
          created_at,
          updated_at
        FROM dca_cycles
        WHERE id = ?
      `,
      id,
    );

    return row ? this.toRecord(row) : undefined;
  }

  getCurrent(
    dcaConfigurationId: string,
  ): DcaCycleRecord | undefined {
    const row = this.db.get<DcaCycleRow>(
      `
        SELECT
          id,
          dca_configuration_id,
          cycle_number,
          status,
          initial_entry_price,
          entry_quantity,
          entry_quote_quantity,
          average_entry_price,
          created_at,
          updated_at
        FROM dca_cycles
        WHERE dca_configuration_id = ?
        ORDER BY cycle_number DESC
        LIMIT 1
      `,
      dcaConfigurationId,
    );

    return row ? this.toRecord(row) : undefined;
  }

  setInitialEntryPrice(
    id: string,
    initialEntryPrice: string,
    updatedAt: string = new Date().toISOString(),
  ): DcaCycleRecord {
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(initialEntryPrice)) {
      throw new Error(
        `Invalid DCA initial entry price: ${initialEntryPrice}`,
      );
    }

    if (initialEntryPrice === '0') {
      throw new Error(
        `DCA initial entry price must be positive`,
      );
    }

    this.db.run(
      `
        UPDATE dca_cycles
        SET initial_entry_price = ?,
            average_entry_price = ?,
            status = 'active',
            updated_at = ?
        WHERE id = ?
      `,
      initialEntryPrice,
      initialEntryPrice,
      updatedAt,
      id,
    );

    const cycle = this.getById(id);

    if (!cycle) {
      throw new Error(`DCA cycle not found: ${id}`);
    }

    return cycle;
  }

  setEntryTotals(
    id: string,
    entryQuantity: string,
    entryQuoteQuantity: string,
    averageEntryPrice: string,
    updatedAt: string = new Date().toISOString(),
  ): DcaCycleRecord {
    this.db.run(
      `
        UPDATE dca_cycles
        SET entry_quantity = ?,
            entry_quote_quantity = ?,
            average_entry_price = ?,
            updated_at = ?
        WHERE id = ?
      `,
      entryQuantity,
      entryQuoteQuantity,
      averageEntryPrice,
      updatedAt,
      id,
    );

    const cycle = this.getById(id);

    if (!cycle) {
      throw new Error(`DCA cycle not found: ${id}`);
    }

    return cycle;
  }

  updateStatus(
    id: string,
    status: DcaCycleStatus,
    updatedAt: string = new Date().toISOString(),
  ): DcaCycleRecord {
    this.db.run(
      `
        UPDATE dca_cycles
        SET status = ?,
            updated_at = ?
        WHERE id = ?
      `,
      status,
      updatedAt,
      id,
    );

    const cycle = this.getById(id);

    if (!cycle) {
      throw new Error(`DCA cycle not found: ${id}`);
    }

    return cycle;
  }

  private toRecord(row: DcaCycleRow): DcaCycleRecord {
    return {
      id: row.id,
      dcaConfigurationId: row.dca_configuration_id,
      cycleNumber: row.cycle_number,
      status: this.toStatus(row.status),
      ...(row.initial_entry_price !== null
        ? { initialEntryPrice: row.initial_entry_price }
        : {}),
      ...(row.entry_quantity !== null
        ? { entryQuantity: row.entry_quantity }
        : {}),
      ...(row.entry_quote_quantity !== null
        ? { entryQuoteQuantity: row.entry_quote_quantity }
        : {}),
      ...(row.average_entry_price !== null
        ? { averageEntryPrice: row.average_entry_price }
        : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toStatus(value: string): DcaCycleStatus {
    if (
      value !== 'pending' &&
      value !== 'active' &&
      value !== 'completed' &&
      value !== 'stopped'
    ) {
      throw new Error(`Invalid DCA cycle status: ${value}`);
    }

    return value;
  }
}

function dbRun(
  db: DatabaseModel,
  sql: string,
  ...params: unknown[]
): void {
  db.run(sql, ...params);
}
