import * as schema from './schema';
import { relations } from 'drizzle-orm';


export const usersRelations = relations(schema.users, ({ many }) => ({
    createdPos: many(schema.importPurchaseOrders, { relationName: 'poCreatedBy' }),
    approvedPos: many(schema.importPurchaseOrders, { relationName: 'poApprovedBy' }),
    createdShipments: many(schema.importShipments, { relationName: 'shipmentCreatedBy' }),
    enteredCostEntries: many(schema.importCostEntries, { relationName: 'costEntryCreatedBy' }),
    acceptedCostEstimates: many(schema.importCostEntries, { relationName: 'costEntryEstimateAcceptedBy' }),
    receivedGoodsReceipts: many(schema.goodsReceipts, { relationName: 'grnReceivedBy' }),
    inspectedGoodsReceipts: many(schema.goodsReceipts, { relationName: 'grnInspectedBy' }),
    finalisedLandedCosts: many(schema.importLandedCostResults, { relationName: 'landedCostFinalisedBy' }),
    approvedVariances: many(schema.costVariances, { relationName: 'varianceApprovedBy' }),
    enteredExchangeRates: many(schema.nbeExchangeRates, { relationName: 'rateEnteredBy' }),
    updatedPolicySettings: many(schema.policySettings, { relationName: 'policyUpdatedBy' }),
    auditLogs: many(schema.auditLedger, { relationName: 'auditActor' }),
    notifications: many(schema.notifications),
}));

export const suppliersRelations = relations(schema.suppliers, ({ many }) => ({
    purchaseOrders: many(schema.importPurchaseOrders),
}));

// export const hsCodesRelations = relations(schema.hsCodes, ({ many }) => ({
//     items: many(schema.items)
// }));

export const itemsRelations = relations(schema.items, ({ many }) => ({
    poLines: many(schema.poLines),
    shipmentItems: many(schema.shipmentItems),
    landedCostResults: many(schema.importLandedCostResults),
}));

export const importPurchaseOrdersRelations = relations(schema.importPurchaseOrders, ({ one, many }) => ({
    suppliers: one(schema.suppliers, { fields: [schema.importPurchaseOrders.supplierId], references: [schema.suppliers.id] }),
    createdBy: one(schema.users, { fields: [schema.importPurchaseOrders.createdBy], references: [schema.users.id], relationName: 'poCreatedBy', }),
    approvedBy: one(schema.users, { fields: [schema.importPurchaseOrders.approvedBy], references: [schema.users.id], relationName: 'poApprovedBy' }),
    poLines: many(schema.poLines),
    lettersOfCredit: many(schema.lettersOfCredit),
    shipments: many(schema.importShipments),
    goodsreceipts: many(schema.goodsReceipts),

}));

export const poLinesRelations = relations(schema.poLines, ({ one, many }) => ({
    po: one(schema.importPurchaseOrders, { fields: [schema.poLines.poId], references: [schema.importPurchaseOrders.id], }),
    item: one(schema.items, { fields: [schema.poLines.itemId], references: [schema.items.id], }),
    shipmentItems: many(schema.shipmentItems),
    landedCostResults: many(schema.importLandedCostResults),
}));

export const lettersOfCreditRelations = relations(
    schema.lettersOfCredit,
    ({ one, many }) => ({
        po: one(schema.suppliers, {
            fields: [schema.lettersOfCredit.supplierId],
            references: [schema.suppliers.id],
        }),
        amendments: many(schema.lcAmendments),
        bankCharges: many(schema.lcBankCharges),
        // marginDeposits: many(schema.lcMarginDeposits),
        // insurancePolicies: many(schema.lcInsurancePolicies),
        // presentationDocuments: many(schema.lcPresentationDocuments),
        shipments: many(schema.importShipments),
    }),
);

export const lcAmendmentsRelations = relations(schema.lcAmendments, ({ one }) => ({
    lc: one(schema.lettersOfCredit, {
        fields: [schema.lcAmendments.lcId],
        references: [schema.lettersOfCredit.id],
    }),
}));

export const lcBankChargesRelations = relations(schema.lcBankCharges, ({ one }) => ({
    lc: one(schema.lettersOfCredit, {
        fields: [schema.lcBankCharges.lcId],
        references: [schema.lettersOfCredit.id],
    }),
}));

// export const lcMarginDepositsRelations = relations(schema.lcMarginDeposits, ({ one }) => ({
//     lc: one(schema.lettersOfCredit, {
//         fields: [schema.lcMarginDeposits.lcId],
//         references: [schema.lettersOfCredit.id],
//     }),
// }));

// export const lcInsurancePoliciesRelations = relations(schema.lcInsurancePolicies, ({ one }) => ({
//     lc: one(schema.lettersOfCredit, {
//         fields: [schema.lcInsurancePolicies.lcId],
//         references: [schema.lettersOfCredit.id],
//     }),
// }));

// export const lcPresentationDocumentsRelations = relations(
//     schema.lcPresentationDocuments,
//     ({ one }) => ({
//         lc: one(schema.lettersOfCredit, {
//             fields: [schema.lcPresentationDocuments.lcId],
//             references: [schema.lettersOfCredit.id],
//         }),
//     }),
// );

export const importShipmentsRelations = relations(schema.importShipments,
    ({ one, many }) => ({
        po: one(schema.importPurchaseOrders, {
            fields: [schema.importShipments.poId],
            references: [schema.importPurchaseOrders.id],
        }),
        lc: one(schema.lettersOfCredit, {
            fields: [schema.importShipments.lcId],
            references: [schema.lettersOfCredit.id],
        }),
        createdBy: one(schema.users, {
            fields: [schema.importShipments.createdBy],
            references: [schema.users.id],
            relationName: 'shipmentCreatedBy',
        }),
        items: many(schema.shipmentItems),
        // containers: many(schema.shipmentContainers),
        documents: many(schema.shipmentDocuments),
        commercialInvoices: many(schema.commercialInvoices),
        customsDeclarations: many(schema.customsDeclarations),
        costEntries: many(schema.importCostEntries),
        landedCostResults: many(schema.importLandedCostResults),
        goodsReceipts: many(schema.goodsReceipts),
        costVariances: many(schema.costVariances),
    }),
);

export const shipmentItemsRelations = relations(schema.shipmentItems,
    ({ one, many }) => ({
        shipment: one(schema.importShipments, {
            fields: [schema.shipmentItems.shipmentId],
            references: [schema.importShipments.id],
        }),
        poLine: one(schema.poLines, {
            fields: [schema.shipmentItems.poLineId],
            references: [schema.poLines.id],
        }),
        item: one(schema.items, {
            fields: [schema.shipmentItems.itemId],
            references: [schema.items.id],
        }),
        costAllocations: many(schema.costAllocations),
        landedCostResults: many(schema.importLandedCostResults),
        goodsReceiptItems: many(schema.goodsReceiptItems),
        itemSpecificCostEntries: many(schema.importCostEntries),
    }),
);

// export const shipmentContainersRelations = relations(schema.shipmentContainers,
//     ({ one }) => ({
//         shipment: one(schema.importShipments, {
//             fields: [schema.shipmentContainers.shipmentId],
//             references: [schema.importShipments.id],
//         }),
//     }),
// );

export const shipmentDocumentsRelations = relations(schema.shipmentDocuments,
    ({ one }) => ({
        shipment: one(schema.importShipments, {
            fields: [schema.shipmentDocuments.shipmentId],
            references: [schema.importShipments.id],
        }),
    }),
);

export const commercialInvoicesRelations = relations(schema.commercialInvoices,
    ({ one }) => ({
        shipment: one(schema.importShipments, {
            fields: [schema.commercialInvoices.shipmentId],
            references: [schema.importShipments.id],
        }),
    }),
);

export const customsDeclarationsRelations = relations(schema.customsDeclarations,
    ({ one }) => ({
        shipment: one(schema.importShipments, {
            fields: [schema.customsDeclarations.shipmentId],
            references: [schema.importShipments.id],
        }),
    }),
);


export const costCategoriesRelations = relations(schema.costCategories, ({ many }) => ({
    costEntries: many(schema.importCostEntries),
}));

export const importCostEntriesRelations = relations(schema.importCostEntries,
    ({ one, many }) => ({
        shipment: one(schema.importShipments, { fields: [schema.importCostEntries.shipmentId], references: [schema.importShipments.id], }),
        costCategory: one(schema.costCategories, { fields: [schema.importCostEntries.costCategoryId], references: [schema.costCategories.id], }),
        shipmentItem: one(schema.shipmentItems, { fields: [schema.importCostEntries.shipmentItemId], references: [schema.shipmentItems.id], }),
        createdBy: one(schema.users, { fields: [schema.importCostEntries.createdBy], references: [schema.users.id], relationName: 'costEntryCreatedBy', }),
        estimateAcceptedBy: one(schema.users, { fields: [schema.importCostEntries.estimateAcceptedBy], references: [schema.users.id], relationName: 'costEntryEstimateAcceptedBy', }),
        reversedByEntry: one(schema.importCostEntries, { fields: [schema.importCostEntries.reversedByEntryId], references: [schema.importCostEntries.id], relationName: 'entryReversals', }),
        reversesEntry: one(schema.importCostEntries, { fields: [schema.importCostEntries.reversesEntryId], references: [schema.importCostEntries.id], relationName: 'entryReversals', }),
        allocations: many(schema.costAllocations),
    }),
);

export const costAllocationsRelations = relations(schema.costAllocations,
    ({ one }) => ({
        costEntry: one(schema.importCostEntries, { fields: [schema.costAllocations.costEntryId], references: [schema.importCostEntries.id], }),
        shipmentItem: one(schema.shipmentItems, { fields: [schema.costAllocations.shipmentItemId], references: [schema.shipmentItems.id], }),
    }),
);

export const importLandedCostResultsRelations = relations(schema.importLandedCostResults,
    ({ one }) => ({
        shipment: one(schema.importShipments, { fields: [schema.importLandedCostResults.shipmentId], references: [schema.importShipments.id], }),
        item: one(schema.items, { fields: [schema.importLandedCostResults.itemId], references: [schema.items.id], }),
        poLine: one(schema.poLines, { fields: [schema.importLandedCostResults.poLineId], references: [schema.poLines.id], }),
        shipmentItem: one(schema.shipmentItems, { fields: [schema.importLandedCostResults.shipmentItemId], references: [schema.shipmentItems.id], }),
        finalisedBy: one(schema.users, { fields: [schema.importLandedCostResults.finalisedBy], references: [schema.users.id], relationName: 'landedCostFinalisedBy', }),
    }),
);

export const goodsReceiptsRelations = relations(schema.goodsReceipts,
    ({ one, many }) => ({
        shipment: one(schema.importShipments, { fields: [schema.goodsReceipts.shipmentId], references: [schema.importShipments.id], }),
        po: one(schema.importPurchaseOrders, { fields: [schema.goodsReceipts.poId], references: [schema.importPurchaseOrders.id], }),
        receivedBy: one(schema.users, { fields: [schema.goodsReceipts.receivedBy], references: [schema.users.id], relationName: 'grnReceivedBy', }),
        inspectedBy: one(schema.users, { fields: [schema.goodsReceipts.inspectedBy], references: [schema.users.id], relationName: 'grnInspectedBy', }),
        items: many(schema.goodsReceiptItems),
    }),
);

export const goodsReceiptItemsRelations = relations(schema.goodsReceiptItems,
    ({ one, many }) => ({
        goodsReceipt: one(schema.goodsReceipts, { fields: [schema.goodsReceiptItems.grnId], references: [schema.goodsReceipts.id], }),
        shipmentItem: one(schema.shipmentItems, { fields: [schema.goodsReceiptItems.shipmentItemId], references: [schema.shipmentItems.id], }),
        rejectedClaims: many(schema.rejectedGoodsClaims),
    }),
);

export const rejectedGoodsClaimsRelations = relations(schema.rejectedGoodsClaims,
    ({ one }) => ({
        grnItem: one(schema.goodsReceiptItems, { fields: [schema.rejectedGoodsClaims.grnItemId], references: [schema.goodsReceiptItems.id], }),
    }),
);


export const costVariancesRelations = relations(schema.costVariances, ({ one }) => ({
    shipment: one(schema.importShipments, { fields: [schema.costVariances.shipmentId], references: [schema.importShipments.id], }),
    approver: one(schema.users, { fields: [schema.costVariances.approverId], references: [schema.users.id], relationName: 'varianceApprovedBy' }),
}));

export const nbeExchangeRatesRelations = relations(schema.nbeExchangeRates,
    ({ one }) => ({
        enteredBy: one(schema.users, { fields: [schema.nbeExchangeRates.enteredBy], references: [schema.users.id], relationName: 'rateEnteredBy', }),
    }),
);

export const policySettingsRelations = relations(schema.policySettings, ({ one }) => ({
    updatedBy: one(schema.users, { fields: [schema.policySettings.updatedBy], references: [schema.users.id], relationName: 'policyUpdatedBy', }),
}));

export const auditLedgerRelations = relations(schema.auditLedger, ({ one }) => ({
    actor: one(schema.users, { fields: [schema.auditLedger.actorId], references: [schema.users.id], relationName: 'auditActor', }),
}));

export const notificationsRelations = relations(schema.notifications, ({ one }) => ({
    user: one(schema.users, { fields: [schema.notifications.userId], references: [schema.users.id], }),
}));




