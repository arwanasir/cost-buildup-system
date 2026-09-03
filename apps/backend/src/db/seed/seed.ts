import { seedReferenceData } from './reference';
import { seedTariffAndFxData } from './tariffs';

async function main() {
    console.log(' Running complete database seed sequence...\n');
    await seedReferenceData();
    await seedTariffAndFxData();
    console.log('\n Database seeding completed successfully!');
}

main().catch((err) => {
    console.error(' Database seeding failed:', err);
    process.exit(1);
});