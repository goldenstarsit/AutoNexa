import type { DatabaseModel } from '../../domain/database/databaseModel';

export interface DcaOrderRecord {
  id: string;
  dropPercent: string;
}

export interface DcaConfigurationOrderRecord {
  id: string;
  dcaOrderId: string;
  level: number;
  dropPercent: string;
}

export interface DcaConfigurationRecord {
  id: string;
  strategyTypeId: string;
  name: string;
  balanceModeId: string;
  exchangeId: string;
  executionModeId: string;
  symbol: string;
  takeProfitPercent: string;
  stopLossPercent: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  orders: DcaConfigurationOrderRecord[];
}

interface DcaConfigurationRow {
  id: string;
  strategy_type_id: string;
  name: string;
  balance_mode_id: string;
  exchange_id: string;
  execution_mode_id: string;
  symbol: string;
  take_profit_percent: string;
  stop_loss_percent: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface DcaConfigurationOrderRow {
  id: string;
  dca_order_id: string;
  level: number;
  drop_percent: string;
}

export interface DcaRuntimeConfigurationUpdate {
  balanceModeId: string;
  executionModeId: string;
  takeProfitPercent: string;
  stopLossPercent: string;
  enabled: boolean;
  dropPercents: readonly string[];
}

export class DcaConfigurationRepository {
  constructor(public readonly db: DatabaseModel) {}

  getAll(): DcaConfigurationRecord[] {
    return this.db
      .all<DcaConfigurationRow>(
        `
          SELECT
            id,
            strategy_type_id,
            name,
            balance_mode_id,
            exchange_id,
            execution_mode_id,
            symbol,
            take_profit_percent,
            stop_loss_percent,
            enabled,
            created_at,
            updated_at
          FROM dca_configurations
          ORDER BY symbol
        `,
      )
      .map((row) => this.toRecord(row));
  }

  getById(id: string): DcaConfigurationRecord | undefined {
    const row = this.db.get<DcaConfigurationRow>(
      `
        SELECT
          id,
          strategy_type_id,
          name,
          balance_mode_id,
          exchange_id,
          execution_mode_id,
          symbol,
          take_profit_percent,
          stop_loss_percent,
          enabled,
          created_at,
          updated_at
        FROM dca_configurations
        WHERE id = ?
      `,
      id,
    );

    return row ? this.toRecord(row) : undefined;
  }

  getBySymbol(symbol: string): DcaConfigurationRecord | undefined {
    const row = this.db.get<DcaConfigurationRow>(
      `
        SELECT
          id,
          strategy_type_id,
          name,
          balance_mode_id,
          exchange_id,
          execution_mode_id,
          symbol,
          take_profit_percent,
          stop_loss_percent,
          enabled,
          created_at,
          updated_at
        FROM dca_configurations
        WHERE symbol = ?
      `,
      symbol,
    );

    return row ? this.toRecord(row) : undefined;
  }

  updateRuntimeSettings(
    id: string,
    balanceModeId: string,
    enabled: boolean,
  ): void {
    const now = new Date().toISOString();

    const result = this.db.run(
      `
        UPDATE dca_configurations
        SET balance_mode_id = ?,
            enabled = ?,
            updated_at = ?
        WHERE id = ?
      `,
      balanceModeId,
      enabled ? 1 : 0,
      now,
      id,
    );

    if (result.changes !== 1) {
      throw new Error(`DCA configuration not found: ${id}`);
    }
  }

  updateRuntimeConfiguration(
    id: string,
    update: DcaRuntimeConfigurationUpdate,
  ): void {
    const transaction = this.db.transaction(() => {
      const configuration = this.db.get<{ id: string }>(
        `
          SELECT id
          FROM dca_configurations
          WHERE id = ?
        `,
        id,
      );

      if (!configuration) {
        throw new Error(`DCA configuration not found: ${id}`);
      }

      const now = new Date().toISOString();

      this.db.run(
        `
          UPDATE dca_configurations
          SET balance_mode_id = ?,
              execution_mode_id = ?,
              take_profit_percent = ?,
              stop_loss_percent = ?,
              enabled = ?,
              updated_at = ?
          WHERE id = ?
        `,
        update.balanceModeId,
        update.executionModeId,
        update.takeProfitPercent,
        update.stopLossPercent,
        update.enabled ? 1 : 0,
        now,
        id,
      );

      this.db.run(
        `
          DELETE FROM dca_configuration_orders
          WHERE dca_configuration_id = ?
        `,
        id,
      );

      for (let index = 0; index < update.dropPercents.length; index += 1) {
        const dropPercent = update.dropPercents[index];

        const existingOrder = this.db.get<{ id: string }>(
          `
            SELECT id
            FROM dca_orders
            WHERE drop_percent = ?
          `,
          dropPercent,
        );

        const dcaOrderId = existingOrder?.id ?? `dca-order-${dropPercent}`;

        if (!existingOrder) {
          this.db.run(
            `
              INSERT INTO dca_orders (id, drop_percent)
              VALUES (?, ?)
            `,
            dcaOrderId,
            dropPercent,
          );
        }

        this.db.run(
          `
            INSERT INTO dca_configuration_orders (
              id,
              dca_configuration_id,
              dca_order_id,
              level
            )
            VALUES (?, ?, ?, ?)
          `,
          `${id}-runtime-order-${index + 1}`,
          id,
          dcaOrderId,
          index + 1,
        );
      }
    });
  }

  getOrders(id: string): DcaConfigurationOrderRecord[] {
    return this.db
      .all<DcaConfigurationOrderRow>(
        `
          SELECT
            dco.id,
            dco.dca_order_id,
            dco.level,
            dco_def.drop_percent
          FROM dca_configuration_orders dco
          INNER JOIN dca_orders dco_def
            ON dco_def.id = dco.dca_order_id
          WHERE dco.dca_configuration_id = ?
          ORDER BY dco.level
        `,
        id,
      )
      .map((row) => ({
        id: row.id,
        dcaOrderId: row.dca_order_id,
        level: row.level,
        dropPercent: row.drop_percent,
      }));
  }

  private toRecord(
    row: DcaConfigurationRow,
  ): DcaConfigurationRecord {
    return {
      id: row.id,
      strategyTypeId: row.strategy_type_id,
      name: row.name,
      balanceModeId: row.balance_mode_id,
      exchangeId: row.exchange_id,
      executionModeId: row.execution_mode_id,
      symbol: row.symbol,
      takeProfitPercent: row.take_profit_percent,
      stopLossPercent: row.stop_loss_percent,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orders: this.getOrders(row.id),
    };
  }
}
