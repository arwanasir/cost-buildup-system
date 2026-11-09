import { prepareE2eDatabase } from './setup-e2e';

prepareE2eDatabase()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[e2e-setup] Failed to prepare the isolated test database.', error);
    process.exit(1);
  });
