import { execSync } from 'child_process';
export default async function globalSetup() {
  console.log('Running global setup: db reset and seed...');
  execSync('npm run db:reset && npm run db:seed:demo', { cwd: '../backend', stdio: 'inherit' });
}
