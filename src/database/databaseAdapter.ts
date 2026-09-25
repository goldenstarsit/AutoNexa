export interface DatabaseAdapter {
  exec(sql: string): void;
  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined;
  all<T = unknown>(sql: string, ...params: unknown[]): T[];
  transaction<T>(fn: () => T): T;
  close(): void;
}
