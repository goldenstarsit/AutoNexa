import { createApplicationContext } from './createApplicationContext';

export async function withApplicationContext<T>(
  handler: (
    context: ReturnType<typeof createApplicationContext>,
  ) => Promise<T>,
): Promise<T> {
  const context = createApplicationContext();

  try {
    return await handler(context);
  } finally {
    context.close();
  }
}
