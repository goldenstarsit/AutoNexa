import { ApplicationContext } from './applicationContext';

const context = new ApplicationContext();

let shuttingDown = false;

const shutdown = (): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  context.dcaStrategyRuntimeRunner.stop();
  context.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

context.dcaStrategyRuntimeRunner.start();
