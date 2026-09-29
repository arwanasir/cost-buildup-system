import { seedReferenceData } from './reference';
import { seedTariffAndFxData } from './tariffs';
import { seedDemoData } from './demo';
import { seedPerfData } from './perf';

async function main() {
  const seedType = process.argv[2];

  console.log(
    ` Running database seed sequence (Type: \${seedType || 'default'})...\\n`,
  );
  await seedReferenceData();
  await seedTariffAndFxData();

  if (seedType === 'perf') {
    await seedPerfData();
  } else if (seedType === 'demo') {
    await seedDemoData();
  } else {
    // Keep demo as default behavior for backward compatibility if needed, or do nothing.
    await seedDemoData();
  }

  console.log('\\n Database seeding completed successfully!');
}

main().catch((err) => {
  console.error(' Database seeding failed:', err);
  process.exit(1);
});
