export interface TestBalanceOperations {
  depositTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;

  withdrawTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;
}
