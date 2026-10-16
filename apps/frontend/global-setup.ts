import { execSync } from 'child_process';

async function globalSetup() {
  console.log('Running global setup: Resetting DB and seeding demo data in cost_buildup_backend container...');
  try {
    execSync('docker exec cost_buildup_backend npm run db:seed:demo', { stdio: 'inherit' });
    console.log('Database reset and seed completed successfully.');
  } catch (error) {
    console.error('Failed to reset or seed the database.', error);
    throw error;
  }
}

export default globalSetup;
