import { costCategories, policySettings, users } from '../schema';
import * as bcrypt from 'bcrypt';
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


const INITIAL_COST_CATEGORIES = [
    {
        code: 'FOB',
        name: 'Free on Board Value',
        description: 'Base purchase price of goods from foreign vendor',
        defaultAllocationMethod: 'by_value',
        isMandatory: true,
    },
    {
        code: 'FREIGHT',
        name: 'International Freight',
        description: 'Sea, air, or land transportation charges from origin to port of entry',
        defaultAllocationMethod: 'by_weight',
        isMandatory: true,
    },
    {
        code: 'INSURANCE',
        name: 'Marine/Transit Insurance',
        description: 'Insurance coverage during transit',
        defaultAllocationMethod: 'by_value',
        isMandatory: true,
    },
    {
        code: 'CUSTOMS_DUTY',
        name: 'Customs Duty',
        description: 'Basic customs duty applied at port of entry',
        defaultAllocationMethod: 'by_value',
        isMandatory: false,
    },
    {
        code: 'EXCISE',
        name: 'Excise Tax',
        description: 'Excise duty on specific commodities',
        defaultAllocationMethod: 'by_value',
        isMandatory: false,
    },
    {
        code: 'VAT',
        name: 'Value Added Tax (VAT)',
        description: 'Import VAT assessed by customs authority',
        defaultAllocationMethod: 'by_value',
        isMandatory: false,
    },
    {
        code: 'SURTAX',
        name: 'Surtax',
        description: 'Import surtax levied on specific goods',
        defaultAllocationMethod: 'by_value',
        isMandatory: false,
    },
    {
        code: 'PORT_HANDLING',
        name: 'Port & Terminal Handling (ESLSE/DP World)',
        description: 'Port storage, stevedoring, and container handling charges',
        defaultAllocationMethod: 'by_weight',
        isMandatory: false,
    },
    {
        code: 'CLEARING',
        name: 'Customs Clearing Agent Fee',
        description: 'Local customs broker/clearing agent service fees',
        defaultAllocationMethod: 'equal_split',
        isMandatory: false,
    },
    {
        code: 'INLAND_TRANSPORT',
        name: 'Inland Transport & Logistics',
        description: 'Haulage from Djibouti/Mojo dry port to destination warehouse',
        defaultAllocationMethod: 'by_weight',
        isMandatory: false,
    },
    {
        code: 'BANK_CHARGES',
        name: 'Bank & LC Opening Charges',
        description: 'Letter of Credit opening, amendment, and SWIFT charges',
        defaultAllocationMethod: 'by_value',
        isMandatory: false,
    },
] as const;


const DEFAULT_POLICY_SETTINGS = [
    { key: 'costVarianceThresholdPct', valueNumeric: '2.00' },
    { key: 'fxToleranceThresholdPct', valueNumeric: '5.00' },
    { key: 'ciVarianceThresholdPct', valueNumeric: '5.00' },
    { key: 'poPrefix', valueText: 'PO' },
    { key: 'shipmentPrefix', valueText: 'SHP' },
    { key: 'grnPrefix', valueText: 'GRN' },
    { key: 'lcPrefix', valueText: 'LC' },
    { key: 'claimPrefix', valueText: 'CLM' },
    { key: 'defaultCurrency', valueText: 'ETB' },
];


const INITIAL_USERS = [
    {
        email: 'admin@company.com',
        fullName: 'System Administrator',
        role: 'system_admin',
    },
    {
        email: 'importer@company.com',
        fullName: 'Import Specialist',
        role: 'procurement_officer',
    },
    {
        email: 'finance.officer@company.com',
        fullName: 'Finance Officer',
        role: 'finance_officer',
    },
    {
        email: 'finance.mgr@company.com',
        fullName: 'Finance Manager',
        role: 'finance_manager',
    },
    {
        email: 'inventory.mgr@company.com',
        fullName: 'Inventory Manager',
        role: 'warehouse_manager',
    },
    {
        email: 'auditor@company.com',
        fullName: 'Internal Auditor',
        role: 'general_manager',
    },
    {
        email: 'executive@company.com',
        fullName: 'Executive Viewer',
        role: 'general_manager',
    },
    {
        email: 'system.service@company.com',
        fullName: 'System Automation Service',
        role: 'system_admin',
    },
] as const;

export async function seedReferenceData(): Promise<void> {
    console.log('Starting reference data seeding...');

    try {

        console.log('Seeding 11 Cost Categories...');
        for (const category of INITIAL_COST_CATEGORIES) {
            await db
                .insert(costCategories)
                .values(category)
                .onConflictDoNothing({ target: costCategories.code });
        }

        console.log('Seeding Policy Settings...');
        await db
            .insert(policySettings)
            .values(DEFAULT_POLICY_SETTINGS)
            .onConflictDoNothing({ target: policySettings.key });


        console.log('Seeding 8 Role-Based Users...');
        const defaultPassword = 'Password123!';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

        for (const user of INITIAL_USERS) {
            await db
                .insert(users)
                .values({
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    passwordHash: passwordHash,
                    isActive: true,
                })
                .onConflictDoNothing({ target: users.email });
        }

        console.log(' Reference data seeding completed successfully!');
    } catch (error) {
        console.error(' Error seeding reference data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}


if (require.main === module) {
    seedReferenceData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
