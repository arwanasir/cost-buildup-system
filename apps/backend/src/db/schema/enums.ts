import { pgEnum } from "drizzle-orm/pg-core";


export const roleEnum = pgEnum('role_enum', [
    'procurement_officer',
    'procurement_manager',
    'finance_officer',
    'finance_manager',
    'customs_officer',
    'warehouse_manager',
    'general_manager',
    'system_admin',
]);

export const poStatusEnum = pgEnum('po_status_enum', [
    'draft',
    'pending_approval',
    'approved',
    'lc_applied',
    'shipped',
    'partially_received',
    'fully_received',
    'closed',
    'rejected',
]);


export const lcStatusEnum = pgEnum('lc_status_enum', [
    'applied',
    'opened',
    'advised',
    'amended',
    'docs_submitted',
    'docs_received',
    'docs_checked',
    'discrepancies_found',
    'accepted',
    'payment_authorised',
    'settled',
]);

export const lcTypeEnum = pgEnum('lc_type_enum', [
    'sight',
    'usance',
    'deferred_payment',
    'revolving',
    'standby'
]);

export const shipmentStatusEnum = pgEnum('shipment_status_enum', [
    'ordered',
    'shipped',
    'at_customs',
    'cleared',
    'partially_received',
    'received',
]);


export const allocationMethodEnum = pgEnum('allocation_method_enum', [
    'by_value',
    'by_weight',
    'by_volume',
    'by_quantity',
    'item_specific',
    'equal_split',
]);

export const costCategoryCodeEnum = pgEnum('cost_category_code_enum', [
    'fob',
    'freight',
    'insurance',
    'customs_duty',
    'excise_tax',
    'vat',
    'sur_tax',
    'withholding_tax',
    'port_handling',
    'demurrage',
    'transportation',
    'transit_insurance',
    'bank_charges',
    'agent_commission',
    'inspection_fee',
    'miscellaneous',


]);


export const inspectionResultEnum = pgEnum('inspection_result_enum', [
    'pending',
    'accepted',
    'rejected',
    'accepted_with_conditions',

]);


export const notificationChannelEnum = pgEnum('notification_channel_enum', [
    'in_app',
    'email',
    'webhook',
    'telegram'
]);

export const preferredLanguageEnum = pgEnum('preferred_language_enum', [
    'en',
    'am',
]);

export const approvalDecisionEnum = pgEnum('approval_decision_enum', [
    'approved',
    'rejected',
]);

export const lcDocumentTypeEnum = pgEnum('lc_document_type_enum', [
    'bl',
    'ci',
    'packing_list',
    'coo',
    'inspection_cert',
    'phytosanitary',
    'insurance_cert',
    'other',
]);

export const lcChargeTypeEnum = pgEnum('lc_charge_type_enum', [
    'opening_fee',
    'amendment_fee',
    'advising_confirmation_fee',
    'acceptance_commission',
    'swift',
]);

export const shipmentDocumentTypeEnum = pgEnum('shipment_document_type_enum', [
    'bl',
    'ci',
    'packing_list',
    'coo',
    'customs_declaration',
    'release_note',
    'insurance_certificate',
    'inspection_report',
    'other',
]);

export const customsDeclarationStatusEnum = pgEnum(
    'customs_declaration_status_enum',
    ['draft', 'assessed', 'paid', 'released'],
);

export const dutyStructureEnum = pgEnum('duty_structure_enum', [
    'ad_valorem',
    'specific',
]);

export const costEntrySourceEnum = pgEnum('cost_entry_source_enum', [
    'manual',
    'lc_bank_charge',
    'customs',
    'commercial_invoice',
    'po_estimate',
]);

export const grnStatusEnum = pgEnum('grn_status_enum', [
    'draft',
    'confirmed',
    'posting_failed',
    'posted',
    'flagged_for_adjustment',
]);


export const rejectedClaimTypeEnum = pgEnum('rejected_claim_type_enum', [
    'supplier_claim',
    'write_off',
]);

export const rejectedClaimStatusEnum = pgEnum('rejected_claim_status_enum', [
    'open',
    'closed',
]);

export const varianceTypeEnum = pgEnum('variance_type_enum', [
    'price',
    'exchange_rate',
    'freight',
    'duty',
    'other',
]);

export const varianceStatusEnum = pgEnum('variance_status_enum', [
    'auto_approved',
    'pending_approval',
    'approved',
    'rejected',
]);

export const auditActionEnum = pgEnum('audit_action_enum', [
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'finalise',
    'post',
    'reverse',
    'login',
]);

export const notificationTypeEnum = pgEnum('notification_type_enum', [
    'lc_expiry',
    'lc_last_shipment',
    'lc_presentation',
    'variance',
    'approval_request',
    'posting_failed',
    'price_variance',
]);

export const erpSyncEntityTypeEnum = pgEnum('erp_sync_entity_type_enum', [
    'inventory_posting',
    'journal_entry',
]);

export const erpSyncStatusEnum = pgEnum('erp_sync_status_enum', [
    'pending',
    'success',
    'failed',
]);

export const journalSourceTypeEnum = pgEnum('journal_source_type_enum', [
    'grn',
    'lc_charge',
    'duty_payment',
]);