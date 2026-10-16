export interface Supplier {
  id: string;
  code: string;
  name: string;
  country: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  code: string;
  description: string;
  uom: string;
  unitWeightKg?: number;
  unitVolumeCbm?: number;
  hsCode?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  poDate: string;
  incoterm?: string;
  status:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'shipped'
    | 'partially_shipped'
    | 'closed'
    | 'cancelled';
  currency: string;
  totalValueForeign: string;
  totalValueEtb: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoLine {
  id: string;
  poId: string;
  itemId: string;
  quantity: number;
  unitPrice: string;
  lineValueForeign: string;
  lineValueEtb: string;
}

export interface LetterOfCredit {
  id: string;
  lcNumber: string;
  supplierId: string;
  poId?: string;
  bankId: string;
  lcType: 'sight' | 'usance' | 'upasu' | 'mixed';
  amountForeign: string;
  currency: string;
  fxRate: string;
  amountEtb: string;
  openingDate?: string;
  expiryDate: string;
  status: 'applied' | 'opened' | 'amended' | 'settled' | 'closed' | 'cancelled';
}

export interface BankCharge {
  id: string;
  lcId: string;
  chargeType:
    | 'opening_commission'
    | 'swift_charge'
    | 'amendment_commission'
    | 'settlement_charge'
    | 'interest'
    | 'other';
  amountEtb: string;
  chargeDate: string;
  bankReference?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  poId: string;
  lcId?: string;
  supplierId: string;
  blNumber?: string;
  blDate?: string;
  status:
    | 'ordered'
    | 'shipped'
    | 'at_customs'
    | 'cleared'
    | 'partially_received'
    | 'received';
  customsReleaseDate?: string;
  isFinalised: boolean;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  poLineId: string;
  itemId: string;
  shippedQuantity: number;
  ciUnitPrice: string;
  ciValueForeign: string;
  ciValueEtb: string;
}

export interface ShipmentDocument {
  id: string;
  shipmentId: string;
  documentType: 'bl' | 'ci' | 'pl' | 'co' | 'other';
  referenceNumber?: string;
  documentDate?: string;
  fileName: string;
  objectKey: string;
  uploadedAt: string;
}

export interface CommercialInvoice {
  id: string;
  shipmentId: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  fxRate: string;
  totalAmountForeign: string;
  totalAmountEtb: string;
  freightAmountEtb: string;
  insuranceAmountEtb: string;
  otherChargesEtb: string;
}

export interface CustomsDeclaration {
  id: string;
  shipmentId: string;
  declarationNumber: string;
  declarationDate: string;
  assessedValueEtb: string;
}

export interface DutyPayment {
  id: string;
  declarationId: string;
  dutyTaxType:
    | 'customs_duty'
    | 'excise_tax'
    | 'vat'
    | 'surtax'
    | 'withholding_tax'
    | 'social_welfare_surtax';
  amountEtb: string;
  receiptNumber?: string;
  paymentDate?: string;
}

export interface CostEntry {
  id: string;
  shipmentId: string;
  costCategory:
    | 'freight'
    | 'insurance'
    | 'bank_charge'
    | 'customs_tax'
    | 'port_clearance'
    | 'inland_transport'
    | 'transit_service'
    | 'warehouse_charge'
    | 'other';
  amountEtb: string;
  vendorId?: string;
  invoiceNumber?: string;
  entryDate: string;
  isProforma: boolean;
}

export interface Allocation {
  id: string;
  costEntryId: string;
  shipmentItemId: string;
  allocatedAmountEtb: string;
  allocationBasis: 'value' | 'weight' | 'volume' | 'quantity' | 'manual';
}

export interface LandedCostResult {
  id: string;
  shipmentId: string;
  shipmentItemId: string;
  fobValueEtb: string;
  freightAllocatedEtb: string;
  insuranceAllocatedEtb: string;
  cifValueEtb: string;
  bankChargesAllocatedEtb: string;
  customsTaxAllocatedEtb: string;
  clearanceAllocatedEtb: string;
  inlandTransportAllocatedEtb: string;
  otherCostsAllocatedEtb: string;
  totalLandedCostEtb: string;
  unitLandedCostEtb: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  shipmentId: string;
  receiptDate: string;
  warehouseId?: string;
  status: 'draft' | 'submitted' | 'approved' | 'synced' | 'failed';
}

export interface Claim {
  id: string;
  shipmentId: string;
  claimType: 'shortage' | 'damage' | 'quality' | 'other';
  claimAmountEtb: string;
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'settled';
}

export interface Variance {
  id: string;
  shipmentId: string;
  shipmentItemId: string;
  varianceType: 'price' | 'quantity' | 'cost';
  expectedAmount: string;
  actualAmount: string;
  varianceAmount: string;
  isFavorable: boolean;
  status: 'pending' | 'investigating' | 'resolved';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
}
