/**
 * FR-08.1 Official Landed Cost Formula Documentation
 *
 * The true landed cost per unit is the aggregate sum of the physical invoice cost
 * and every categorized expense proportionally allocated to that item, divided by
 * the actual quantity received into the warehouse (or shipped quantity if GRN is pending).
 *
 * Formula:
 * PER_UNIT_LANDED_COST = (
 *     CI_VALUE_ETB (Base item commercial invoice value)
 *   + ALLOCATED_CUSTOMS_DUTY
 *   + ALLOCATED_IMPORT_VAT
 *   + ALLOCATED_FREIGHT
 *   + ALLOCATED_INSURANCE
 *   + ALLOCATED_BANK_CHARGES
 *   + ALLOCATED_PORT_HANDLING
 *   + ALLOCATED_CLEARING
 *   + ALLOCATED_OTHER
 * ) / QUANTITY_RECEIVED
 */
export const LANDED_COST_FORMULA = {
  DOCUMENTATION:
    'per unit = (CI value + duty + VAT + allocated freight + insurance + bank charges + port + clearing + other) / quantity received',
};
