export enum Role {
    ADMIN = 'ADMIN',
    IMPORT_SPECIALIST = 'IMPORT_SPECIALIST',
    FINANCE_OFFICER = 'FINANCE_OFFICER',
    FINANCE_MANAGER = 'FINANCE_MANAGER',
    CUSTOMS_OFFICER = 'CUSTOMS_OFFICER',
    INVENTORY_MANAGER = 'INVENTORY_MANAGER',
    EXECUTIVE = 'EXECUTIVE',
    AUDITOR = 'AUDITOR',
    SYSTEM = 'SYSTEM',
};
export enum Permission {
    SUPPLIER_READ = 'supplier:read',
    SUPPLIER_WRITE = 'supplier_write',

    PO_READ = 'po:read',
    PO_WRITE = 'po:write',
    PO_APPROVE_TIER1 = 'po:approve:tier1',
    PO_APPROVE_TIER2 = 'po:approve:tier2',
    PO_APPROVE_TIER3 = 'po:approve:tier3',

    LC_READ = 'lc:read',
    LC_WRITE = 'lc:write',
    LC_APPROVE = 'lc:approve',

    SHIPMENT_READ = 'shipment:read',
    SHIPMENT_WRITE = 'shipment:write',

    CUSTOMS_READ = 'customs:read',
    CUSTOMS_WRITE = 'customs:write',

    COST_READ = 'cost:read',
    COST_WRITE = 'cost:write',
    COST_APPROVE = 'cost:approve',
    COST_FINALIZE = 'cost:finalize',
    VARIANCE_APPROVE = 'variance:approve',

    GRN_READ = 'grn:read',
    GRN_WRITE = 'grn:write',

    REPORT_READ = 'report:read',
    AUDIT_READ = 'audit:read',
    ADMIN_ALL = 'admin:all'

};

export const RolePermission: Record<Role, Permission[]> = {
    [Role.ADMIN]: [Permission.ADMIN_ALL],

    [Role.IMPORT_SPECIALIST]: [
        Permission.LC_READ,
        Permission.LC_WRITE,
        Permission.PO_READ,
        Permission.PO_WRITE,
        Permission.REPORT_READ,
        Permission.SHIPMENT_READ,
        Permission.SHIPMENT_WRITE,
        Permission.SUPPLIER_READ,
        Permission.SHIPMENT_WRITE,
    ],
    [Role.FINANCE_OFFICER]: [
        Permission.PO_READ,
        Permission.PO_APPROVE_TIER1,
        Permission.LC_READ,
        Permission.SHIPMENT_READ,
        Permission.COST_READ,
        Permission.COST_WRITE,
        Permission.COST_APPROVE,
        Permission.REPORT_READ,
    ],
    [Role.FINANCE_MANAGER]: [
        Permission.PO_READ,
        Permission.PO_APPROVE_TIER2,
        Permission.LC_READ,
        Permission.SHIPMENT_READ,
        Permission.COST_READ,
        Permission.COST_APPROVE,
        Permission.COST_FINALIZE,
        Permission.VARIANCE_APPROVE,
        Permission.REPORT_READ,
    ],
    [Role.CUSTOMS_OFFICER]: [
        Permission.SHIPMENT_READ,
        Permission.CUSTOMS_READ,
        Permission.CUSTOMS_WRITE,
        Permission.COST_READ,
        Permission.COST_WRITE,
    ],
    [Role.INVENTORY_MANAGER]: [
        Permission.SHIPMENT_READ,
        Permission.GRN_READ,
        Permission.GRN_WRITE,
    ],
    [Role.EXECUTIVE]: [
        Permission.PO_READ,
        Permission.PO_APPROVE_TIER3,
        Permission.LC_READ,
        Permission.LC_APPROVE,
        Permission.REPORT_READ,
    ],
    [Role.AUDITOR]: [
        Permission.SUPPLIER_READ,
        Permission.PO_READ,
        Permission.LC_READ,
        Permission.SHIPMENT_READ,
        Permission.CUSTOMS_READ,
        Permission.COST_READ,
        Permission.GRN_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
    ],
    [Role.SYSTEM]: [
        Permission.PO_READ,
        Permission.LC_READ,
        Permission.SHIPMENT_READ,
    ]
}