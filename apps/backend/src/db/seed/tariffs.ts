import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as schema from '../schema/schema';

dotenv.config({ path: '../.env' });

const connectionString =
    process.env.SEED_DATABASE_URL ||
    process.env.DRIZZLE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://cost_buildup_user:password@localhost:5432/cost_buildup_db';

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });



const SAMPLE_TARIFF_RATES = [
    {
        hsCode: '8471.30.00',
        description: 'Portable automatic data processing machines (Laptops/Notebooks)',
        dutyRatePct: '0.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '0.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'PCS',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '8517.13.00',
        description: 'Smartphones and cellular telecommunication equipment',
        dutyRatePct: '35.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '10.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'PCS',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '8703.23.90',
        description: 'Motor vehicles with spark-ignition internal combustion engine (1500cc-3000cc)',
        dutyRatePct: '35.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '60.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'PCS',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '3004.90.00',
        description: 'Medicaments consisting of mixed/unmixed products for therapeutic uses',
        dutyRatePct: '5.000000',
        vatRatePct: '0.000000',
        surTaxRatePct: '0.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'KG',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '1001.99.00',
        description: 'Wheat and meslin (excluding seed for sowing)',
        dutyRatePct: '0.000000',
        vatRatePct: '0.000000',
        surTaxRatePct: '0.000000',
        withholdingRatePct: '0.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '0.000000',
        specificDutyPerUnitEtb: '25.0000',
        uom: 'KG',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '2710.12.10',
        description: 'Motor spirit (Gasoline/Petrol) premium grade',
        dutyRatePct: '10.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '0.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '30.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '1.5000',
        uom: 'LTR',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '7214.20.00',
        description: 'Bars and rods of iron or non-alloy steel (Construction Rebar)',
        dutyRatePct: '20.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'KG',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '2523.29.00',
        description: 'Portland cement (Ordinary Portland Cement - OPC)',
        dutyRatePct: '20.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '12.0000',
        uom: 'KG',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '3926.90.90',
        description: 'Other articles of plastics and articles of other materials',
        dutyRatePct: '30.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '10.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'KG',
        effectiveDate: new Date('2026-01-01'),
    },
    {
        hsCode: '6203.42.00',
        description: 'Trousers, bib and brace overalls, breeches and shorts of cotton',
        dutyRatePct: '35.000000',
        vatRatePct: '15.000000',
        surTaxRatePct: '10.000000',
        withholdingRatePct: '3.000000',
        exciseRatePct: '0.000000',
        socialWelfareLevyRatePct: '3.000000',
        specificDutyPerUnitEtb: '0.0000',
        uom: 'PCS',
        effectiveDate: new Date('2026-01-01'),
    },
];


const SAMPLE_NBE_EXCHANGE_RATES = [
    {
        currency: 'USD',
        buyingRateEtb: '128.500000',
        sellingRateEtb: '131.070000',
        middleRateEtb: '129.785000',
        effectiveDate: new Date('2026-09-01'),
    },
    {
        currency: 'EUR',
        buyingRateEtb: '141.350000',
        sellingRateEtb: '144.170000',
        middleRateEtb: '142.760000',
        effectiveDate: new Date('2026-09-01'),
    },
    {
        currency: 'CNY',
        buyingRateEtb: '18.100000',
        sellingRateEtb: '18.460000',
        middleRateEtb: '18.280000',
        effectiveDate: new Date('2026-09-01'),
    },
];

export async function seedTariffAndFxData(): Promise<void> {
    console.log(' Starting Tariff Rates & NBE Exchange Rates seeding...');
    try {
        const [seedUser] = await db.select().from(schema.users).limit(1);
        if (!seedUser) {
            throw new Error('Cannot seed exchange rates because no users exist. Run reference seed data first.');
        }

        console.log('Seeding 10 Tariff Rates...');
        for (const tariff of SAMPLE_TARIFF_RATES) {
            await db
                .insert(schema.tariffRates)
                .values({
                    hsCode: tariff.hsCode,
                    description: tariff.description,
                    effectiveFrom: tariff.effectiveDate.toISOString().slice(0, 10),
                    dutyRate: tariff.dutyRatePct,
                    specificDutyPerUnit: tariff.specificDutyPerUnitEtb,
                    exciseRate: tariff.exciseRatePct,
                    withholdingRate: tariff.withholdingRatePct,
                })
                .onConflictDoNothing({ target: schema.tariffRates.hsCode });
        }


        console.log('Seeding NBE Exchange Rates (USD, EUR, CNY)...');
        for (const fxRate of SAMPLE_NBE_EXCHANGE_RATES) {
            await db
                .insert(schema.nbeExchangeRates)
                .values({
                    currency: fxRate.currency,
                    rateDate: fxRate.effectiveDate.toISOString().slice(0, 10),
                    rate: fxRate.middleRateEtb,
                    enteredBy: seedUser.id,
                })
                .onConflictDoNothing({
                    target: [schema.nbeExchangeRates.currency, schema.nbeExchangeRates.rateDate],
                });
        }

        console.log('Tariff and NBE Exchange Rates seeding completed successfully!');
    } catch (error) {
        console.error(' Error seeding tariff and FX data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    seedTariffAndFxData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
