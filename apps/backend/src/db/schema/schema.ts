import { boolean, bigint, char, text, integer, bigserial, inet, index, uniqueIndex, pgTable, timestamp, uuid, varchar, date, numeric, jsonb, } from 'drizzle-orm/pg-core';
import { auditColumns, money, rate, unitCost } from './_shared';
import { preferredLanguageEnum, journalSourceTypeEnum, rejectedClaimStatusEnum, rejectedClaimTypeEnum, auditActionEnum, erpSyncEntityTypeEnum, erpSyncStatusEnum, inspectionResultEnum, costEntrySourceEnum, allocationMethodEnum, dutyStructureEnum, shipmentDocumentTypeEnum, shipmentStatusEnum, roleEnum, poStatusEnum, approvalDecisionEnum, lcStatusEnum, lcTypeEnum, lcDocumentTypeEnum, lcChargeTypeEnum, customsDeclarationStatusEnum, grnStatusEnum, notificationChannelEnum, notificationTypeEnum, varianceStatusEnum, varianceTypeEnum, } from './enums';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: roleEnum('role').notNull().default('procurement_officer'),
    department: varchar('department', { length: 100 }),
    preferredLanguage: preferredLanguageEnum('preferred_language').notNull().default('en'),
    isActive: boolean('is_active').notNull().default(true),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', {
        mode: 'string',
        withTimezone: true
    }),
    ...auditColumns,

});

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', {
        mode: 'string',
        withTimezone: true,
    }).notNull(),
    revokedAt: timestamp('revoked_at', {
        mode: 'string',
        withTimezone: true,
    }),
    createdIp: varchar('created_ip,', { length: 45 }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        index('idx_refresh_tokens_user_id').on(table.userId),
        index('idx_refresh_tokens_expires_at').on(table.expiresAt),
    ],
)


export const suppliers = pgTable('suppliers', {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierCode: varchar('supplier_code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    country: varchar('country', { length: 100 }),
    tin: varchar('tin', { length: 100 }),
    contactPerson: varchar('contact_person', { length: 100 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    paymentTerms: varchar('payment_terms', { length: 100 }),
    defaultCurrency: char('default_currency', { length: 3 }).notNull().default('USD'),
    leadTimeDays: integer('lead_time_days').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
});

export const suppliersBankAccounts = pgTable('suppliers_bank_account', {
    id: uuid('id').notNull().defaultRandom(),
    supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    bankName: varchar('bank_name', { length: 255 }).notNull(),
    swift: varchar('swift', { length: 11 }),
    ibanOrAccount: varchar('iban_or_account', { length: 100 }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    isDefault: boolean('is_default').notNull().default(false),
},
    (table) => [
        index('idx_supplier_bank_accounts_supplier_id').on(table.supplierId),
    ],);

export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    itemCode: varchar('item_code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    unitOfMeasure: varchar('unit_of_measure', { length: 20 }).notNull(),
    defaultHsCode: varchar('default_hs_code', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
},
    (table) => [
        index('idx_items_item_code').on(table.itemCode),
        index('idx_items_is_active').on(table.isActive),
    ],);

export const importPurchaseOrders = pgTable('import_purchase_orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
    poDate: date('po_date').notNull(),
    supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    incoterm: varchar('incoterm', { length: 10 }).notNull(),
    countryOfOrigin: varchar('country_of_origin', { length: 100 }),
    estimatedShipmentDate: date('estimated_shipment_date'),
    estimatedArrivalDate: date('estimated_arrival_date'),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    fxRate: rate('tf_rate').notNull(),
    portOfLoading: varchar('port_of_loading', { length: 100 }),
    portOfDestination: varchar('port_of_destination', { length: 100 }),
    totalValueForeign: money('total_value_foreign').notNull(),
    totalValueEtb: money('total_value_etb').notNull(),

    estimatedFreightEtb: money('estimated_freight_etb').default('0.0000'),
    estimatedInsuranceEtb: money('estimated_insurance_etb').default('0.0000'),
    estimatedOtherChargesEtb: money('estimated_other_charge_etb').default('0.0000'),
    estimatedDutyEtb: money('estimated_duty_etb').default('0.0000'),
    status: poStatusEnum('status').notNull().default('draft'),
    ldId: uuid('lc_id'),
    approvedBy: uuid('approved_by').references(() => users.id, {
        onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', {
        mode: 'string',
        withTimezone: true,
    }),
    notes: text('notes'),

    ...auditColumns,
}, (table) => [
    index('idx_po_number').on(table.poNumber),
    index('idx_po_supplier_id').on(table.supplierId),
    index('idx_po_status').on(table.status),
    index('idx_po_date').on(table.poDate),
],
);

export const poLines = pgTable('po_lines', {
    id: uuid('id').primaryKey().defaultRandom(),
    poId: uuid('po_id').notNull().references(() => importPurchaseOrders.id, {
        onDelete: 'cascade'
    }),
    lineNo: integer('line_no').notNull(),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
    description: varchar('description', { length: 500 }),
    quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
    unitOfMeasure: varchar('unit_of_measure', { length: 20 }).notNull(),
    unitPrice: unitCost('unit_price').notNull(),
    totalLineValue: money('total_line_value').notNull(),
    hsCode: varchar('hs_code', { length: 20 }),
    estimatedDutyRate: numeric('estimated_duty_rate', { precision: 18, scale: 6, }).default('0.0000'),
    shippedQuantity: numeric('shipped_quantity', { precision: 18, scale: 4, }).default('0.0000'),
    receivedQuantity: numeric('received_quantity', { precision: 18, scale: 4, }).default('0.0000'),

},
    (table) => [
        uniqueIndex('uq_po_lines_po_line_no').on(table.poId, table.lineNo),
        index('idx_po_lines_po_id').on(table.poId),
        index('idx_po_lines_item_id').on(table.itemId),
    ],)

export const poApprovals = pgTable('po_approvals', {
    id: uuid('id').primaryKey().defaultRandom(),
    poId: uuid('po_id').notNull().references(() => importPurchaseOrders.id, { onDelete: 'cascade' }),
    requiredRole: roleEnum('required_role').notNull(),
    approverId: uuid('approver_id').references(() => users.id, { onDelete: 'set null', }),
    decision: approvalDecisionEnum('decision'),
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { mode: 'string', withTimezone: true, }),
},
    (table) => [
        index('idx_po_approvals_po_id').on(table.poId),
        index('idx_po_approvals_approver_id').on(table.approverId),
    ],);

export const lettersOfCredit = pgTable('letters_of_credit', {
    id: uuid('id').primaryKey().defaultRandom(),
    lcNumber: varchar('lc_number', { length: 50 }).notNull().unique(),
    supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    issuingBank: varchar('issuing_bank', { length: 255 }).notNull(),
    advisingBank: varchar('advising_bank', { length: 255 }),
    lcType: lcTypeEnum('lc_type').notNull(),
    amountForeign: money('amount_foreign').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    fxRate: rate('fx_rate').notNull(),
    amountEtb: money('amount_etb').notNull(),
    openingDate: date('opening_date'),
    expiryDate: date('expiry_date').notNull(),
    lastShipmentDate: date('last_shipment_date'),
    presentationPeriodDays: integer('presentation_period_days').default(21),
    incoterm: varchar('incoterm', { length: 10 }),
    partialShipmentAllowed: boolean('partial_shipment_allowed').notNull().default(true),
    transhipmentAllowed: boolean('transhipment_allowed').notNull().default(false),
    specialConditions: text('special_conditions'),

    status: lcStatusEnum('status').notNull().default('applied'),
    gmApprovedBy: uuid('gm_approved_by').references(() => users.id, { onDelete: 'set null' }),
    ...auditColumns,
},
    (table) => [
        index('idx_lc_number').on(table.lcNumber),
        index('idx_lc_supplier_id').on(table.supplierId),
        index('idx_lc_status').on(table.status),
        index('idx_lc_expiry_date').on(table.expiryDate),
    ],);


export const lcRequiredDocuments = pgTable('lc_required_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    lcId: uuid('lc_id').notNull().references(() => lettersOfCredit.id, { onDelete: 'cascade' }),
    documentType: lcDocumentTypeEnum('document_type').notNull(),
    isRequired: boolean('is_required').notNull().default(true),
    notes: text('notes'),
},
    (table) => [
        index('idx_lc_req_docs_lc_id').on(table.lcId),
    ],);

export const lcBankCharges = pgTable('lc_bank_charges', {
    id: uuid('id').primaryKey().defaultRandom(),
    lcId: uuid('lc_id').notNull().references(() => lettersOfCredit.id, { onDelete: 'cascade' }),
    chargeType: lcChargeTypeEnum('charge_type').notNull(),
    amountEtb: money('amount_etb').notNull(),
    chargeDate: date('charge_date').notNull(),
    bankReference: varchar('bank_reference', { length: 100 }),
    registerEntryId: uuid('register_entry_id'),
    ...auditColumns,
},
    (table) => [
        index('idx_lc_bank_charges_lc_id').on(table.lcId),
        index('idx_lc_bank_charges_charge_type').on(table.chargeType),
    ],);

export const lcAmendments = pgTable('lc_amendments', {
    id: uuid('id').primaryKey().defaultRandom(),
    lcId: uuid('lc_id').notNull().references(() => lettersOfCredit.id, { onDelete: 'cascade' }),
    amendmentNo: integer('amendment_no').notNull(),
    amendedAt: timestamp('amended_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
    amountDelta: money('amount_delta').notNull().default('0.0000'),
    newExpiryDate: date('new_expiry_date'),
    newLastShipmentDate: date('new_last_shipment_date'),
    description: text('description').notNull(),
},
    (table) => [
        uniqueIndex('uq_lc_amendments_lc_no').on(table.lcId, table.amendmentNo),
        index('idx_lc_amendments_lc_id').on(table.lcId),
    ],);

export const importShipments = pgTable('import_shipments', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentNumber: varchar('shipment_number', { length: 50 }).notNull().unique(),
    poId: uuid('po_id').notNull().references(() => importPurchaseOrders.id, { onDelete: 'restrict' }),
    lcId: uuid('lc_id').references(() => lettersOfCredit.id, { onDelete: 'restrict', }),
    supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    vesselName: varchar('vessel_name', { length: 255 }),
    blNumber: varchar('bl_number', { length: 100 }),
    blDate: date('bl_date'),
    portOfLoading: varchar('port_of_loading', { length: 100 }),
    portOfDestination: varchar('port_of_destination', { length: 100 }),
    incoterm: varchar('incoterm', { length: 10 }),
    carrier: varchar('carrier', { length: 255 }),
    containerNumbers: text('container_numbers').array(),
    eta: date('eta'),
    actualArrivalDate: date('actual_arrival_date'),
    totalWeightKg: numeric('total_weight_kg', { precision: 18, scale: 4 }),
    totalVolumeCbm: numeric('total_volume_cbm', { precision: 18, scale: 4 }),
    status: shipmentStatusEnum('status').notNull().default('ordered'),
    customsReleaseDate: date('customs_release_date'),
    customsReleaseRef: varchar('customs_release_ref', { length: 100 }),
    isFinalised: boolean('is_finalised').notNull().default(false),
    finalisedBy: uuid('finalised_by').references(() => users.id, { onDelete: 'set null', }),
    finalisedAt: timestamp('finalised_at', { mode: 'string', withTimezone: true, }),
    ...auditColumns,
},
    (table) => [
        index('idx_shipments_shipment_number').on(table.shipmentNumber),
        index('idx_shipments_po_id').on(table.poId),
        index('idx_shipments_lc_id').on(table.lcId),
        index('idx_shipments_supplier_id').on(table.supplierId),
        index('idx_shipments_status').on(table.status),
    ],);

export const shipmentItems = pgTable('shipment_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
    poLineId: uuid('po_line_id').notNull().references(() => poLines.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
    shippedQuantity: numeric('shipped_quantity', { precision: 18, scale: 4, }).notNull(),
    ciUnitPrice: unitCost('ci_unit_price').notNull(),
    ciValueForeign: money('ci_value_foreign').notNull(),
    ciValueEtb: money('ci_value_etb').notNull(),
    weightKg: numeric('weight_kg', { precision: 18, scale: 4 }),
    volumeCbm: numeric('volume_cbm', { precision: 18, scale: 4 }),
},
    (table) => [
        index('idx_shipment_items_shipment_id').on(table.shipmentId),
        index('idx_shipment_items_po_line_id').on(table.poLineId),
        index('idx_shipment_items_item_id').on(table.itemId),
    ],);

export const shipmentDocuments = pgTable('shipment_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
    documentType: shipmentDocumentTypeEnum('document_type').notNull(),
    referenceNumber: varchar('reference_number', { length: 100 }),
    documentDate: timestamp('document_date', { mode: 'string', withTimezone: true, }),
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    uploadedAt: timestamp('uploaded_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_shipment_documents_shipment_id').on(table.shipmentId),
        index('idx_shipment_documents_document_type').on(table.documentType),
    ],)

export const commercialInvoices = pgTable(
    'commercial_invoices',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
        invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
        invoiceDate: date('invoice_date').notNull(),
        currency: char('currency', { length: 3 }).notNull().default('USD'),
        fxRate: rate('fx_rate').notNull(),
        totalForeign: money('total_foreign').notNull(),
        totalEtb: money('total_etb').notNull(),
        priceVariancePct: numeric('price_variance_pct', { precision: 8, scale: 4, }).default('0.0000'),
        varianceAcknowledgedBy: uuid('variance_acknowledged_by').references(() => users.id, { onDelete: 'set null' },),
        acknowledgedAt: timestamp('acknowledged_at', { mode: 'string', withTimezone: true, }),
    },
    (table) => [
        index('idx_ci_shipment_id').on(table.shipmentId),
        index('idx_ci_invoice_number').on(table.invoiceNumber),
    ],
);

export const customsDeclarations = pgTable('customs_declarations', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'restrict' }),
    declarationNumber: varchar('declaration_number', { length: 100 }).notNull().unique(),
    declarationDate: date('declaration_date').notNull(),
    clearingAgent: varchar('clearing_agent', { length: 255 }),
    cifValueEtb: money('cif_value_etb').notNull(),
    totalDutyEtb: money('total_duty_etb').notNull().default('0.0000'),
    totalVatEtb: money('total_vat_etb').notNull().default('0.0000'),
    totalExciseEtb: money('total_excise_etb').notNull().default('0.0000'),
    totalWithholdingEtb: money('total_withholding_etb').notNull().default('0.0000'),
    totalAssessmentEtb: money('total_assessment_etb').notNull(),
    status: customsDeclarationStatusEnum('status').notNull().default('draft'),
    ...auditColumns,
},
    (table) => [
        index('idx_customs_declarations_shipment_id').on(table.shipmentId),
        index('idx_customs_declarations_decl_number').on(table.declarationNumber,),
        index('idx_customs_declarations_status').on(table.status),
    ],
);

export const customsDeclarationItems = pgTable('customs_declaration_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    declarationId: uuid('declaration_id').notNull().references(() => customsDeclarations.id, { onDelete: 'cascade' }),
    shipmentItemId: uuid('shipment_item_id').notNull().references(() => shipmentItems.id, { onDelete: 'restrict' }),
    hsCode: varchar('hs_code', { length: 20 }).notNull(),
    dutyStructure: dutyStructureEnum('duty_structure').notNull().default('ad_valorem'),
    dutyRate: numeric('duty_rate', { precision: 18, scale: 6 }).default('0.0000'),
    specificDutyPerUnit: money('specific_duty_per_unit').default('0.0000'),
    cifValueEtb: money('cif_value_etb').notNull(),
    dutyEtb: money('duty_etb').notNull().default('0.0000'),
    vatRate: numeric('vat_rate', { precision: 18, scale: 6 }).notNull().default('15.0000'),
    vatEtb: money('vat_etb').notNull().default('0.0000'),
    exciseRate: numeric('excise_rate', { precision: 18, scale: 6 }).default('0.0000'),
    exciseEtb: money('excise_etb').notNull().default('0.0000'),
    withholdingRate: numeric('withholding_rate', { precision: 18, scale: 6 }).default('0.0000'),
    withholdingEtb: money('withholding_etb').notNull().default('0.0000'),
},
    (table) => [
        index('idx_cd_items_declaration_id').on(table.declarationId),
        index('idx_cd_items_shipment_item_id').on(table.shipmentItemId),
    ],
);


export const dutyPayments = pgTable('duty_payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    declarationId: uuid('declaration_id').notNull().references(() => customsDeclarations.id, { onDelete: 'restrict' }),
    paymentDate: date('payment_date').notNull(),
    bankReference: varchar('bank_reference', { length: 100 }),
    amountPaidEtb: money('amount_paid_etb').notNull(),
    receiptNumber: varchar('receipt_number', { length: 100 }).notNull(),
    varianceVsAssessedEtb: money('variance_vs_assessed_etb').notNull().default('0.0000'),
    isFlagged: boolean('is_flagged').notNull().default(false),
    ...auditColumns,
},
    (table) => [
        index('idx_duty_payments_declaration_id').on(table.declarationId),
        index('idx_duty_payments_receipt_number').on(table.receiptNumber),
        index('idx_duty_payments_is_flagged').on(table.isFlagged),
    ],
);

export const tariffRates = pgTable('tariff_rates', {
    id: uuid('id').primaryKey().defaultRandom(),
    hsCode: varchar('hs_code', { length: 20 }).notNull().unique(),
    description: text('description').notNull(),
    dutyStructure: dutyStructureEnum('duty_structure').notNull().default('ad_valorem'),
    dutyRate: numeric('duty_rate', { precision: 18, scale: 6 }).notNull().default('0.0000'),
    specificDutyPerUnit: money('specific_duty_per_unit').default('0.0000'),
    exciseRate: numeric('excise_rate', { precision: 18, scale: 6 }).notNull().default('0.0000'),
    withholdingRate: numeric('withholding_rate', { precision: 18, scale: 6 }).notNull().default('3.0000'), // Default 3% withholding tax rate in Ethiopia
    effectiveFrom: date('effective_from').notNull(),
},
    (table) => [
        index('idx_tariff_rates_hs_code').on(table.hsCode),
        index('idx_tariff_rates_effective_from').on(table.effectiveFrom),
    ],
);

export const costCategories = pgTable('cost_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    defaultAllocationMethod: allocationMethodEnum('default_allocation_method').notNull().default('by_value'),
    isItemSpecific: boolean('is_item_specific').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
},
    (table) => [
        index('idx_cost_categories_code').on(table.code),
        index('idx_cost_categories_is_active').on(table.isActive),
    ],
);


export const importCostEntries = pgTable('import_cost_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
    costCategoryId: uuid('cost_category_id').notNull().references(() => costCategories.id, { onDelete: 'restrict' }),
    costSubcategory: varchar('cost_subcategory', { length: 100 }),
    providerName: varchar('provider_name', { length: 255 }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    invoiceDate: date('invoice_date'),
    amountForeign: money('amount_foreign'),
    currency: char('currency', { length: 3 }).default('ETB'),
    fxRate: rate('fx_rate').default('1.000000'),
    amountEtb: money('amount_etb').notNull(),
    allocationMethod: allocationMethodEnum('allocation_method').notNull(),
    isEstimated: boolean('is_estimated').notNull().default(false),
    isItemSpecific: boolean('is_item_specific').notNull().default(false),
    shipmentItemId: uuid('shipment_item_id').references(() => shipmentItems.id, { onDelete: 'restrict' },),
    attachmentKey: text('attachment_key'),
    source: costEntrySourceEnum('source').notNull().default('manual'),
    sourceRefId: uuid('source_ref_id'),
    reversedByEntryId: uuid('reversed_by_entry_id').references((): any => importCostEntries.id, { onDelete: 'set null' },),
    reversesEntryId: uuid('reverses_entry_id').references((): any => importCostEntries.id, { onDelete: 'set null' },),
    estimateAcceptedBy: uuid('estimate_accepted_by').references(() => users.id, { onDelete: 'set null' },),
    estimateJustification: text('estimate_justification'),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_cost_entries_shipment_id').on(table.shipmentId),
        index('idx_cost_entries_category_id').on(table.costCategoryId),
        index('idx_cost_entries_source').on(table.source, table.sourceRefId),
        index('idx_cost_entries_is_estimated').on(table.isEstimated),
    ],
);


export const costAllocations = pgTable('cost_allocations', {
    id: uuid('id').primaryKey().defaultRandom(),
    costEntryId: uuid('cost_entry_id').notNull().references(() => importCostEntries.id, { onDelete: 'cascade' }),
    shipmentItemId: uuid('shipment_item_id').notNull().references(() => shipmentItems.id, { onDelete: 'cascade' }),
    allocationMethod: allocationMethodEnum('allocation_method').notNull(),
    allocatedEtb: money('allocated_etb').notNull(),
    isResidualHolder: boolean('is_residual_holder').notNull().default(false),
},
    (table) => [
        uniqueIndex('uq_cost_allocations_entry_item').on(table.costEntryId, table.shipmentItemId,),
        index('idx_cost_allocations_cost_entry_id').on(table.costEntryId),
        index('idx_cost_allocations_shipment_item_id').on(table.shipmentItemId,),
    ],
);

export const nbeExchangeRates = pgTable('nbe_exchange_rates', {
    id: uuid('id').primaryKey().defaultRandom(),
    currency: char('currency', { length: 3 }).notNull(),
    rateDate: date('rate_date').notNull(),
    rate: rate('rate').notNull(),
    enteredBy: uuid('entered_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        uniqueIndex('uq_nbe_rates_currency_date').on(table.currency, table.rateDate),
        index('idx_nbe_rates_rate_date').on(table.rateDate),
    ],
);

export const policySettings = pgTable('policy_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    /* Config Keys (FR-02.2, BR07, BR11):
       - po_approval_threshold_1
       - po_approval_threshold_2
       - lc_gm_threshold
       - variance_threshold_pct
       - fx_tolerance_pct
       - ci_price_variance_pct
       - duty_payment_tolerance_pct
       - po_number_prefix
       - shipment_number_prefix
       - grn_number_prefix
    */
    key: varchar('key', { length: 100 }).notNull().unique(),
    valueNumeric: numeric('value_numeric', { precision: 18, scale: 4 }),
    valueText: text('value_text'),
    description: text('description'),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null', }),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_policy_settings_key').on(table.key),
    ],
);

export const importLandedCostResults = pgTable('import_landed_cost_results', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
    poLineId: uuid('po_line_id').notNull().references(() => poLines.id, { onDelete: 'restrict' }),
    shipmentItemId: uuid('shipment_item_id').notNull().references(() => shipmentItems.id, { onDelete: 'cascade' }),
    quantityReceived: numeric('quantity_received', { precision: 18, scale: 4, }).notNull(),
    ciValueEtb: money('ci_value_etb').notNull().default('0.0000'),
    customsDutyEtb: money('customs_duty_etb').notNull().default('0.0000'),
    importVatEtb: money('import_vat_etb').notNull().default('0.0000'),
    freightAllocatedEtb: money('freight_allocated_etb').notNull().default('0.0000'),
    insuranceAllocatedEtb: money('insurance_allocated_etb').notNull().default('0.0000'),
    bankChargesAllocatedEtb: money('bank_charges_allocated_etb').notNull().default('0.0000'),
    portChargesAllocatedEtb: money('port_charges_allocated_etb').notNull().default('0.0000'),
    clearingFeeAllocatedEtb: money('clearing_fee_allocated_etb').notNull().default('0.0000'),
    otherChargesAllocatedEtb: money('other_charges_allocated_etb').notNull().default('0.0000'),
    totalLandedCostEtb: money('total_landed_cost_etb').notNull(),
    perUnitLandedCostEtb: numeric('per_unit_landed_cost_etb', { precision: 18, scale: 6, }).notNull(),
    isEstimated: boolean('is_estimated').notNull().default(false),
    isFinalised: boolean('is_finalised').notNull().default(false),
    finalisedBy: uuid('finalised_by').references(() => users.id, { onDelete: 'set null', }),
    finalisedAt: timestamp('finalised_at', { mode: 'string', withTimezone: true, }),
    postedToInventory: boolean('posted_to_inventory').notNull().default(false),
    postedAt: timestamp('posted_at', { mode: 'string', withTimezone: true, }),
    inventoryTransactionId: uuid('inventory_transaction_id'),
},
    (table) => [
        uniqueIndex('uq_landed_cost_results_shipment_item').on(table.shipmentId, table.shipmentItemId,),
        index('idx_landed_cost_results_shipment_id').on(table.shipmentId),
        index('idx_landed_cost_results_item_id').on(table.itemId),
        index('idx_landed_cost_results_is_finalised').on(table.isFinalised),
        index('idx_landed_cost_results_posted_to_inventory').on(table.postedToInventory,),
    ],
);


export const goodsReceipts = pgTable('goods_receipts', {
    id: uuid('id').primaryKey().defaultRandom(),
    grnNumber: varchar('grn_number', { length: 50 }).notNull().unique(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'restrict' }),
    poId: uuid('po_id').notNull().references(() => importPurchaseOrders.id, { onDelete: 'restrict' }),
    receiptDate: date('receipt_date').notNull(),
    warehouseLocation: varchar('warehouse_location', { length: 255 }).notNull(),
    receivedBy: uuid('received_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    inspectedBy: uuid('inspected_by').references(() => users.id, { onDelete: 'set null', }),
    status: grnStatusEnum('status').notNull().default('draft'),
    usesEstimatedCost: boolean('uses_estimated_cost').notNull().default(false),
    postedAt: timestamp('posted_at', { mode: 'string', withTimezone: true, }),
    ...auditColumns,
},
    (table) => [
        index('idx_goods_receipts_grn_number').on(table.grnNumber),
        index('idx_goods_receipts_shipment_id').on(table.shipmentId),
        index('idx_goods_receipts_po_id').on(table.poId),
        index('idx_goods_receipts_status').on(table.status),
    ],
);

export const goodsReceiptItems = pgTable('goods_receipt_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    grnId: uuid('grn_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
    shipmentItemId: uuid('shipment_item_id').notNull().references(() => shipmentItems.id, { onDelete: 'restrict' }),
    receivedQuantity: numeric('received_quantity', { precision: 18, scale: 4, }).notNull(),
    acceptedQuantity: numeric('accepted_quantity', { precision: 18, scale: 4, }).notNull(),
    rejectedQuantity: numeric('rejected_quantity', { precision: 18, scale: 4, }).notNull().default('0.0000'),
    inspectionResult: inspectionResultEnum('inspection_result').notNull().default('accepted'),
    rejectionReason: text('rejection_reason'),
    quarantineFlag: boolean('quarantine_flag').notNull().default(false),
    perUnitLandedCostEtb: unitCost('per_unit_landed_cost_etb').notNull(),
    lineValueEtb: money('line_value_etb').notNull(),
},
    (table) => [
        index('idx_grn_items_grn_id').on(table.grnId),
        index('idx_grn_items_shipment_item_id').on(table.shipmentItemId),
        index('idx_grn_items_quarantine_flag').on(table.quarantineFlag),
    ],
);

export const rejectedGoodsClaims = pgTable('rejected_goods_claims', {
    id: uuid('id').primaryKey().defaultRandom(),
    grnItemId: uuid('grn_item_id').notNull().references(() => goodsReceiptItems.id, { onDelete: 'restrict' }),
    claimType: rejectedClaimTypeEnum('claim_type').notNull(),
    quantity: numeric('quantity', { precision: 18, scale: 4, }).notNull(),
    valueEtb: money('value_etb').notNull(),
    status: rejectedClaimStatusEnum('status').notNull().default('open'),
    notes: text('notes'),
    ...auditColumns,
},
    (table) => [
        index('idx_rejected_claims_grn_item_id').on(table.grnItemId),
        index('idx_rejected_claims_claim_type').on(table.claimType),
        index('idx_rejected_claims_status').on(table.status),
    ],
);

export const costVariances = pgTable('cost_variances', {
    id: uuid('id').primaryKey().defaultRandom(),
    shipmentId: uuid('shipment_id').notNull().references(() => importShipments.id, { onDelete: 'cascade' }),
    varianceType: varianceTypeEnum('variance_type').notNull(),
    estimatedEtb: money('estimated_etb').notNull().default('0.0000'),
    actualEtb: money('actual_etb').notNull().default('0.0000'),
    varianceEtb: money('variance_etb').notNull().default('0.0000'),
    variancePct: numeric('variance_pct', { precision: 18, scale: 6, }).notNull().default('0.0000'),
    status: varianceStatusEnum('status').notNull().default('pending_approval'),
    approverId: uuid('approver_id').references(() => users.id, { onDelete: 'set null', }),
    decidedAt: timestamp('decided_at', { mode: 'string', withTimezone: true, }),
    comment: text('comment'),
},
    (table) => [
        index('idx_cost_variances_shipment_id').on(table.shipmentId),
        index('idx_cost_variances_variance_type').on(table.varianceType),
        index('idx_cost_variances_status').on(table.status),
    ],
);

export const auditLedger = pgTable('audit_ledger', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: auditActionEnum('action').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', }),
    ipAddress: inet('ip_address'),
    beforeValue: jsonb('before_value'),
    afterValue: jsonb('after_value'),
    correlationId: varchar('correlation_id', { length: 100 }),
    occurredAt: timestamp('occurred_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_audit_ledger_entity').on(table.entityType, table.entityId),
        index('idx_audit_ledger_actor_id').on(table.actorId),
        index('idx_audit_ledger_action').on(table.action),
        index('idx_audit_ledger_correlation_id').on(table.correlationId),
        index('idx_audit_ledger_occurred_at').on(table.occurredAt),
    ],
);

export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    channel: notificationChannelEnum('channel').notNull().default('in_app'),
    titleEn: varchar('title_en', { length: 255 }).notNull(),
    titleAm: varchar('title_am', { length: 255 }),
    bodyEn: text('body_en').notNull(),
    bodyAm: text('body_am'),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: uuid('entity_id'),
    isRead: boolean('is_read').notNull().default(false),
    sentAt: timestamp('sent_at', { mode: 'string', withTimezone: true, }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_notifications_user_id').on(table.userId),
        index('idx_notifications_type').on(table.type),
        index('idx_notifications_is_read').on(table.isRead),
        index('idx_notifications_entity').on(table.entityType, table.entityId),
    ],
);

export const erpSyncLog = pgTable('erp_sync_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: erpSyncEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    payload: jsonb('payload').notNull(),
    response: jsonb('response'),
    status: erpSyncStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { mode: 'string', withTimezone: true, }),
},
    (table) => [
        index('idx_erp_sync_log_entity').on(table.entityType, table.entityId),
        index('idx_erp_sync_log_status').on(table.status),
    ],
);

export const journalEntries = pgTable('journal_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceType: journalSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),

    lines: jsonb('lines').notNull(),

    posted: boolean('posted').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true, }).defaultNow().notNull(),
},
    (table) => [
        index('idx_journal_entries_source').on(table.sourceType, table.sourceId),
        index('idx_journal_entries_posted').on(table.posted),
    ],
);