import { startApplication, stopApplication } from './application.js';
const resources = await startApplication();
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  resources.logger.info({ signal }, 'shutdown signal received');
  try {
    await stopApplication(resources);
    process.exitCode = 0;
  } catch (error) {
    resources.logger.error({ error }, 'shutdown failed');
    process.exitCode = 1;
  }
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('uncaughtException', (error) => {
  resources.logger.fatal({ error }, 'uncaught exception');
  void shutdown('uncaughtException');
});
process.once('unhandledRejection', (error) => {
  resources.logger.fatal({ error }, 'unhandled rejection');
  void shutdown('unhandledRejection');
});
