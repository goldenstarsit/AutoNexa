import type { ExecutionModeId } from './executionModeModel';

export interface ExecutionModeProvider {
  isEnabled(mode: ExecutionModeId): boolean;
}
