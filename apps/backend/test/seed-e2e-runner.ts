import { seedReferenceData } from '../src/db/seed/reference';
import { seedTariffAndFxData } from '../src/db/seed/tariffs';

async function run() {
  await seedReferenceData();
  await seedTariffAndFxData();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
