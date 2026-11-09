import {
  costCategories,
  permissions,
  policySettings,
  rolePermissions,
  roles,
  users,
} from '../schema';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as schema from '../schema/schema';
import { Permission, Role } from '../../auth/permissions';

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
    description:
      'Sea, air, or land transportation charges from origin to port of entry',
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
    code: 'STORAGE',
    name: 'Storage and Demurrage',
    description: 'Port or terminal storage and demurrage charges',
    defaultAllocationMethod: 'by_weight',
    isMandatory: false,
  },
  {
    code: 'DEMURRAGE',
    name: 'Demurrage',
    description: 'Charges for delayed container or cargo handling',
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
  {
    code: 'OTHER',
    name: 'Other Import Costs',
    description: 'Other import-related charges not covered by a listed category',
    defaultAllocationMethod: 'by_value',
    isMandatory: false,
  },
] as const;

/**
 * Policy settings keys MUST match exactly what each domain service queries.
 * All keys are snake_case to align with database conventions and service lookups.
 *
 * Services and the keys they query:
 *  - variances.service.ts           → variance_threshold_pct
 *  - fx-tolerance.service.ts        → fx_tolerance_pct
 *  - commercial-invoices.service.ts → ci_price_variance_pct
 *  - goods-receipts.service.ts      → ci_price_variance_pct
 *  - landed-cost/finalisation-guard → ci_price_variance_pct
 *  - approval-routing.service.ts    → po_approval_threshold_1, po_approval_threshold_2
 *  - lc-status.service.ts           → lc_gm_threshold
 *  - duty-payments.service.ts       → duty_payment_tolerance_pct
 */
const DEFAULT_POLICY_SETTINGS = [
  // Variance & tolerance thresholds
  { key: 'variance_threshold_pct', valueNumeric: '2.00' },
  { key: 'fx_tolerance_pct', valueNumeric: '5.00' },
  { key: 'ci_price_variance_pct', valueNumeric: '5.00' },
  { key: 'duty_payment_tolerance_pct', valueNumeric: '1.00' },

  // PO approval tiered thresholds (ETB amounts)
  { key: 'po_approval_threshold_1', valueNumeric: '10000.00' },
  { key: 'po_approval_threshold_2', valueNumeric: '50000.00' },

  // LC approval threshold for General Manager review (ETB)
  { key: 'lc_gm_threshold', valueNumeric: '100000.00' },

  // Document number prefixes
  { key: 'po_number_prefix', valueText: 'PO' },
  { key: 'shipment_number_prefix', valueText: 'SHP' },
  { key: 'grn_number_prefix', valueText: 'GRN' },
  { key: 'lc_number_prefix', valueText: 'LC' },
  { key: 'claim_number_prefix', valueText: 'CLM' },

  // System defaults
  { key: 'default_currency', valueText: 'ETB' },
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
    // FIX: was incorrectly seeded as 'general_manager' giving full approval
    // authority. Auditors are read-only per SRS requirements.
    email: 'auditor@company.com',
    fullName: 'Internal Auditor',
    role: 'auditor',
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
  {
    email: 'procurement.mgr@company.com',
    fullName: 'Procurement Manager',
    role: 'procurement_manager',
  },
  {
    email: 'customs@company.com',
    fullName: 'Customs Officer',
    role: 'customs_officer',
  },
] as const;

const INITIAL_ROLES = [
  {
    code: Role.SYSTEM_ADMIN,
    name: 'System Admin',
    description: 'Full system access',
  },
  {
    code: Role.PROCUREMENT_OFFICER,
    name: 'Procurement Officer',
    description: 'Creates suppliers, items, purchase orders, and shipments',
  },
  {
    code: Role.PROCUREMENT_MANAGER,
    name: 'Procurement Manager',
    description: 'Manages procurement workflows and approvals',
  },
  {
    code: Role.FINANCE_OFFICER,
    name: 'Finance Officer',
    description: 'Maintains rates, costs, and finance records',
  },
  {
    code: Role.FINANCE_MANAGER,
    name: 'Finance Manager',
    description: 'Approves and finalizes landed cost and finance workflows',
  },
  {
    code: Role.CUSTOMS_OFFICER,
    name: 'Customs Officer',
    description: 'Maintains customs declarations, tariffs, and releases',
  },
  {
    code: Role.WAREHOUSE_MANAGER,
    name: 'Warehouse Manager',
    description: 'Creates and confirms goods receipts',
  },
  {
    code: Role.GENERAL_MANAGER,
    name: 'General Manager',
    description: 'Executive approvals, reporting, and oversight',
  },
  {
    code: Role.AUDITOR,
    name: 'Internal Auditor',
    description:
      'Read-only access to all records and audit trails for compliance review',
  },
] as const;

const ROLE_PERMISSION_MAP: Record<Role, Permission[]> = {
  [Role.SYSTEM_ADMIN]: [Permission.ADMIN_ALL],
  [Role.PROCUREMENT_OFFICER]: [
    Permission.SUPPLIER_READ,
    Permission.SUPPLIER_WRITE,
    Permission.ITEM_READ,
    Permission.ITEM_WRITE,
    Permission.PO_READ,
    Permission.PO_WRITE,
    Permission.LC_READ,
    Permission.SHIPMENT_READ,
    Permission.SHIPMENT_WRITE,
    Permission.COST_READ,
  ],
  [Role.PROCUREMENT_MANAGER]: [
    Permission.SUPPLIER_READ,
    Permission.SUPPLIER_WRITE,
    Permission.ITEM_READ,
    Permission.ITEM_WRITE,
    Permission.PO_READ,
    Permission.PO_WRITE,
    Permission.PO_APPROVE_TIER1,
    Permission.LC_READ,
    Permission.LC_WRITE,
    Permission.SHIPMENT_READ,
    Permission.SHIPMENT_WRITE,
    Permission.COST_READ,
    Permission.REPORT_SHIPMENT_STATUS_READ,
    Permission.REPORT_SUPPLIER_PERFORMANCE_READ,
    Permission.REPORT_LC_STATUS_READ,
  ],
  [Role.FINANCE_OFFICER]: [
    Permission.PO_READ,
    Permission.PO_APPROVE_TIER1,
    Permission.LC_READ,
    Permission.LC_WRITE,
    Permission.RATES_READ,
    Permission.RATES_WRITE,
    Permission.COST_READ,
    Permission.COST_WRITE,
    Permission.REPORT_IMPORT_COST_SUMMARY_READ,
  ],
  [Role.FINANCE_MANAGER]: [
    Permission.PO_READ,
    Permission.PO_APPROVE_TIER2,
    Permission.LC_READ,
    Permission.LC_WRITE,
    Permission.LC_APPROVE,
    Permission.RATES_READ,
    Permission.RATES_WRITE,
    Permission.COST_READ,
    Permission.COST_WRITE,
    Permission.COST_APPROVE,
    Permission.COST_FINALIZE,
    Permission.VARIANCE_APPROVE,
    Permission.REPORT_LANDED_COST_SHIPMENT_READ,
    Permission.REPORT_LANDED_COST_ITEM_READ,
    Permission.REPORT_LANDED_COST_SUPPLIER_READ,
    Permission.REPORT_IMPORT_COST_SUMMARY_READ,
    Permission.REPORT_LC_STATUS_READ,
    Permission.REPORT_CUSTOMS_DUTY_READ,
    Permission.REPORT_COST_VARIANCE_READ,
  ],
  [Role.CUSTOMS_OFFICER]: [
    Permission.SHIPMENT_READ,
    Permission.CUSTOMS_READ,
    Permission.CUSTOMS_WRITE,
    Permission.TARIFFS_READ,
    Permission.TARIFFS_WRITE,
    Permission.COST_READ,
    Permission.COST_WRITE,
    Permission.REPORT_CUSTOMS_DUTY_READ,
  ],
  [Role.WAREHOUSE_MANAGER]: [
    Permission.SHIPMENT_READ,
    Permission.GRN_READ,
    Permission.GRN_WRITE,
  ],
  [Role.GENERAL_MANAGER]: [
    Permission.PO_READ,
    Permission.PO_APPROVE_TIER3,
    Permission.LC_READ,
    Permission.LC_APPROVE,
    Permission.SHIPMENT_READ,
    Permission.CUSTOMS_READ,
    Permission.COST_READ,
    Permission.COST_FINALIZE,
    Permission.VARIANCE_APPROVE,
    Permission.GRN_READ,
    Permission.AUDIT_READ,
    Permission.REPORT_LANDED_COST_SHIPMENT_READ,
    Permission.REPORT_LANDED_COST_ITEM_READ,
    Permission.REPORT_LANDED_COST_SUPPLIER_READ,
    Permission.REPORT_IMPORT_COST_SUMMARY_READ,
    Permission.REPORT_LC_STATUS_READ,
    Permission.REPORT_CUSTOMS_DUTY_READ,
    Permission.REPORT_SHIPMENT_STATUS_READ,
    Permission.REPORT_COST_VARIANCE_READ,
    Permission.REPORT_SUPPLIER_PERFORMANCE_READ,
  ],
  /**
   * AUDITOR: Pure read-only role for internal compliance and audit purposes.
   * Has visibility across all modules but cannot create, modify, approve, or
   * finalize any records.
   */
  [Role.AUDITOR]: [
    Permission.SUPPLIER_READ,
    Permission.ITEM_READ,
    Permission.PO_READ,
    Permission.LC_READ,
    Permission.SHIPMENT_READ,
    Permission.CUSTOMS_READ,
    Permission.TARIFFS_READ,
    Permission.COST_READ,
    Permission.GRN_READ,
    Permission.RATES_READ,
    Permission.AUDIT_READ,
    Permission.SETTINGS_READ,
    Permission.USERS_READ,
    Permission.REPORT_LANDED_COST_SHIPMENT_READ,
    Permission.REPORT_LANDED_COST_ITEM_READ,
    Permission.REPORT_LANDED_COST_SUPPLIER_READ,
    Permission.REPORT_IMPORT_COST_SUMMARY_READ,
    Permission.REPORT_LC_STATUS_READ,
    Permission.REPORT_CUSTOMS_DUTY_READ,
    Permission.REPORT_SHIPMENT_STATUS_READ,
    Permission.REPORT_COST_VARIANCE_READ,
    Permission.REPORT_SUPPLIER_PERFORMANCE_READ,
  ],
};

export async function seedReferenceData(): Promise<void> {
  console.log('Starting reference data seeding...');

  try {
    console.log(`Seeding ${INITIAL_COST_CATEGORIES.length} Cost Categories...`);
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

    console.log('Seeding Roles and Permissions...');
    for (const role of INITIAL_ROLES) {
      await db.insert(roles).values(role).onConflictDoNothing({
        target: roles.code,
      });
    }

    for (const permission of Object.values(Permission)) {
      await db
        .insert(permissions)
        .values({
          code: permission,
          description: permission,
        })
        .onConflictDoNothing({ target: permissions.code });
    }

    for (const [roleCode, rolePermissionList] of Object.entries(
      ROLE_PERMISSION_MAP,
    ) as [Role, Permission[]][]) {
      for (const permissionCode of rolePermissionList) {
        await db
          .insert(rolePermissions)
          .values({ roleCode, permissionCode })
          .onConflictDoNothing();
      }
    }

    console.log('Seeding 10 Role-Based Users...');
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

    console.log('✅ Reference data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding reference data:', error);
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
