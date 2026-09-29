## SOFTWARE REQUIREMENTS SPECIFICATION

## Cost Buildup for Imported Items Management System

## Landed Cost Tracking · LC Management · Customs Clearance · Cost Allocation


## Table of Contents


## 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for the Cost Buildup for Imported Items Management System. The system automates the calculation, tracking, and allocation of all costs incurred from the point of raising a Purchase Order to the point at which imported goods are received into the warehouse and assigned an accurate landed unit cost. This document is intended for the development team, QA team, and business stakeholders and forms the contractual basis for system design and testing.

## 1.2 Scope

The system covers the following end-to-end import cost management lifecycle:

- Purchase Order creation and management for imported goods

- Letter of Credit (LC) lifecycle management — from opening to settlement

- Shipment and logistics tracking — Bill of Lading, proforma, packing list

- Customs declaration and clearance documentation

- Landed cost buildup — aggregation of all direct and indirect import charges

- Multi-method cost allocation to individual items within an import lot

- Inventory update with accurate per-unit landed cost upon goods receipt

- Reporting — landed cost per lot, per item, per supplier, per period

The system integrates with the organisation's existing Inventory Management and Financial Accounting modules. It does not replace these modules but feeds accurate landed cost data into them.

## 1.3 Definitions, Acronyms and Abbreviations

| Term / Acronym Definition Letter of Credit — a financial instrument issued by a bank guaranteeing LC payment to a supplier upon presentation of compliant shipping documents Purchase Order — a commercial document authorising purchase of goods PO from a supplier at agreed terms Goods Receipt Note — a document confirming the physical receipt and GRN inspection of goods into the warehouse The total cost of importing goods including product price, freight, insurance, |
| --- |
| Landed Cost customs duty, port charges, bank charges, clearing agent fees, and all other import-related expenses The process of identifying, recording, and aggregating all cost components Cost Buildup associated with an import shipment to calculate the total landed cost The method by which the aggregate landed cost is distributed across Allocation individual items or SKUs in the shipment |


| BL CI CIF FOB ETB | Term / Acronym Definition HS Code |   | receipt of goods for transport quantities, and agreed prices and insurance to the port of destination shipping costs from the port of origin Ethiopian Birr — the currency of Ethiopia | Bill of Lading — a legal document between a shipper and carrier confirming Commercial Invoice — the supplier's invoice presenting the items shipped, Harmonised System Code — an internationally standardised system of names and numbers for classifying traded products for customs Cost, Insurance, and Freight — a trade term where the seller pays freight Free On Board — a trade term where the buyer takes responsibility for |   |
| --- | --- | --- | --- | --- | --- |
| NBE | regulations ERCA |   |   | National Bank of Ethiopia — sets foreign exchange rates and LC Ethiopian Revenue and Customs Authority — the authority responsible for |   |
|   |   | customs duties and tax |   |   |   |
|   |   |   |   | Foreign Exchange Rate — the conversion rate between a foreign currency |   |
|   | FX Rate |   |   |   |   |
|   | and ETB |   |   |   |   |
|   | Per-Unit Landed Cost |   |   | The total landed cost of a shipment divided proportionally across individual |   |
|   |   |   | units of each item in the shipment |   |   |

## 1.4 References

- ISO/IEC 29148:2018 — Systems and Software Engineering Requirements

- Ethiopian Customs Proclamation No. 859/2014

- NBE Directive No. FXD/66/2020 — Foreign Exchange Management

- International Chamber of Commerce Incoterms 2020

- Company Import Process Manual (internal document)


## 2. Overall Description

## 2.1 Product Perspective

The Cost Buildup for Imported Items Management System is a dedicated sub-system within the organisation's broader ERP platform. It operates alongside and feeds data into the Inventory Management module and the Financial Accounting module. The system's primary output is an accurate, auditable per-unit landed cost that is posted to inventory valuation when goods are received, replacing the common practice of estimating import costs based on supplier invoice price alone.

## 2.2 Product Functions — High Level

|   | Function | Description |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   | Create and manage POs for imported goods with multi-currency |   |   |
|   | Import Purchase Order |   |   |   |   |   |
|   |   |   |   | support, supplier details, and item specifications |   |   |
|   |   |   |   | Track the complete LC lifecycle from application to settlement, |   |   |
|   | LC Management |   |   |   |   |   |
|   |   |   |   | linking each LC to its associated PO and shipment |   |   |
|   |   |   |   | Record and manage all shipping documents (BL, CI, Packing List, |   |   |
|   | Shipment Tracking |   |   | Certificate of Origin) per import lot |   |   |
|   | Customs Clearance |   |   | Record customs declaration, HS codes, duty assessment, payment, and goods release per shipment |   |   |
|   |   |   |   | Record every cost component associated with an import lot — |   |   |
|   | Cost Buildup Register |   |   | freight, insurance, bank charges, customs duty, port handling, clearing fees, storage, and any other charges |   |   |
|   |   |   |   | Distribute the total additional import charges across individual |   |   |
|   | Cost Allocation Engine |   |   |   |   |   |
|   |   |   |   | items using one of four allocation methods |   |   |
|   |   |   |   | Compute the per-unit landed cost for each item = (Supplier Price + |   |   |
|   | Landed Cost Calculation Goods Receipt (GRN) Variance Tracking Reporting & Analytics |   |   | Allocated Charges) / Quantity Confirm physical receipt of goods into the warehouse, triggering inventory update with landed cost Capture differences between estimated and actual costs, with management approval for variances above threshold Landed cost reports by lot, item, supplier, category, and period |   |   |

## 2.3 User Classes and Characteristics

| User Class Department Key Responsibilities in this System |
| --- |
| Creates POs, manages supplier Procurement Officer Procurement communication, records shipment documents, initiates LC applications Records bank charges, LC fees, currency Finance Officer Finance conversions, supplier invoice payments, approves cost entries |


| User Class Department Key Responsibilities in this System Customs Clearance Records customs declaration details, duty Logistics / Clearing Officer payments, goods release, clearing agent fees Confirms physical receipt of goods (GRN), Warehouse Manager Warehouse verifies quantities against packing list, triggers stock update Reviews and approves cost buildup records, Finance Manager Finance approves variances above threshold, reviews landed cost reports Views dashboards and landed cost reports; |
| --- |
| General Manager / Management approves LC applications above defined value Director threshold User management, configuration, system System Administrator IT maintenance, audit log review |

## 2.4 Operating Environment

- Web-based application accessible via modern browsers (Chrome, Firefox, Edge, Safari)

- Mobile-responsive for tablet access by warehouse and logistics staff

- Deployment: on-premises server (Ubuntu 22.04 LTS, Docker) or cloud-hosted

- Database: PostgreSQL 16

- Integration: REST API interfaces with Inventory and Financial Accounting modules

- Authentication: JWT-based with role-based access control

## 2.5 Design and Implementation Constraints

- All monetary amounts must be stored as NUMERIC(18,4) — no floating-point types — to prevent rounding errors in cost calculations

- Multi-currency support is required: supplier invoices may be in USD, EUR, CNY, or other currencies; all costs must be convertible to ETB using the exchange rate recorded at the time of the transaction

- Every cost entry must be immutable once the shipment's cost buildup is finalised — only authorised corrections via a reversal mechanism are permitted

- The system must support at least four cost allocation methods simultaneously; the user selects the method per cost component, not per shipment

- Ethiopian customs duty calculation must support both ad valorem (percentage of CIF value) and specific duty (fixed amount per unit) rate structures

## 2.6 Assumptions and Dependencies

- The organisation is an importer of physical goods subject to Ethiopian customs regulations

- The Inventory Management module accepts unit cost input from this system upon GRN confirmation

- Foreign exchange rates are entered manually by the Finance Officer at the time of each transaction; the system does not auto-fetch rates from NBE


- The clearing agent (if external) provides their invoice which is manually entered; no EDI integration with customs is required in Version 1.0

- The system is not responsible for initiating bank payments — it records payment references only


## 3. Functional Requirements

## FR-01: Supplier Master

The system shall maintain a supplier master record for all international suppliers.

## FR-01.1 Supplier Record

- Each supplier record shall contain: Supplier ID (system-generated), Supplier Name, Country, Supplier TIN/Tax ID, Contact Person, Phone, Email, Payment Terms (Net 30, Net 60, etc.), Default Currency, Bank Details (SWIFT, IBAN/Account), and Lead Time (days)

- Suppliers shall be marked as Active or Inactive; inactive suppliers cannot be selected on new POs

- The system shall maintain a history of all POs placed with each supplier

ℹ NOTE: A supplier may have multiple bank accounts for different currencies. Each bank account is stored separately and selectable at payment time.

## FR-02: Import Purchase Order Management

The system shall enable creation and management of Purchase Orders for imported goods.

## FR-02.1 PO Creation

- A PO shall contain: PO Number (auto-generated with configurable prefix), PO Date, Supplier, Incoterm (FOB, CIF, EXW, CFR, etc.), Country of Origin, Estimated Shipment Date, Estimated Arrival Date, Currency, Exchange Rate (at PO date), Port of Loading, Port of Destination

- Each PO shall have one or more line items. Each line item shall contain: Item Code (linked to item master), Item Description, Quantity, Unit of Measure, Unit Price (in supplier currency), Total Line Value, HS Code, and Estimated Duty Rate (%)

- The system shall automatically calculate: Total PO Value (supplier currency), Total PO Value (ETB at PO exchange rate), Estimated Customs Duty (based on CIF value and duty rate)

## FR-02.2 PO Approval Workflow

- POs below a configurable threshold (e.g. USD 10,000) require Finance Officer approval

- POs above the threshold require Finance Manager approval

- POs above a second configurable threshold require General Manager approval

- Approval is done within the system with timestamp and approver recorded

- Only approved POs may proceed to LC application or direct shipment

## FR-02.3 PO Status Lifecycle

PO status shall progress through: Draft → Pending Approval → Approved → LC Applied (if LC required) → Shipped → Partially Received → Fully Received → Closed

BUSINESS RULE: A PO may be partially received across multiple shipments. The system tracks received vs. outstanding quantities per line item.


## FR-03: Letter of Credit (LC) Management

The system shall manage the complete LC lifecycle for each import transaction that requires bank- guaranteed payment.

## FR-03.1 LC Application Record

- LC record shall contain: LC Number, Associated PO(s), Issuing Bank, Advising Bank (supplier's bank), LC Type (Sight, Usance, Deferred Payment), LC Amount (in supplier currency), LC Amount (ETB), Opening Date, Expiry Date, Last Shipment Date, Presentation Period (days)

- LC Terms shall be recorded: Incoterm, partial shipments allowed (Yes/No), transhipment allowed (Yes/No), special conditions

- Document requirements checklist per LC: which documents are required (BL, CI, Packing List, Certificate of Origin, Inspection Certificate, etc.)

## FR-03.2 LC Lifecycle Status

LC status shall track: Applied → Opened by Bank → Advised to Supplier → Amended (if applicable) → Documents Submitted by Supplier → Documents Received by Issuing Bank → Documents Checked → Discrepancies Found (if any) → Accepted → Payment Authorised → Settled

## FR-03.3 LC Cost Recording

- LC Opening Fee: recorded in ETB (bank commission, typically 0.5–1% of LC value)

- LC Amendment Fee: recorded each time LC is amended

- Advising/Confirmation Fee: fee charged by the advising bank

- Acceptance Commission: for Usance LCs, commission for deferred payment

- SWIFT Charges: communication charges per transaction

- All LC-related bank charges are linked to the LC record and automatically pulled into the cost buildup register for that shipment

## FR-03.4 LC Alerts

- Expiry Alert: system sends notification 30 days and 7 days before LC expiry date if goods not yet shipped

- Last Shipment Date Alert: notification 14 days and 3 days before the last shipment date on the LC

- Presentation Period Alert: notification when documents have been received and presentation period is running

ℹ NOTE: Multiple LCs may cover a single large PO. One LC may also cover multiple smaller POs from the same supplier.

## FR-04: Shipment & Document Management

Each approved PO (whether LC-backed or open-account) generates a shipment record when the supplier dispatches goods.


## FR-04.1 Shipment Record

- Shipment record shall contain: Shipment ID, PO Reference(s), LC Reference (if applicable), Supplier, Vessel Name / Flight Number / Truck Reference, Bill of Lading Number, BL Date, Port of Loading, Port of Destination, Estimated Arrival Date (ETA), Actual Arrival Date, Incoterm, Shipping Line / Carrier, Container Number(s), Total Weight (kg), Total Volume (CBM)

## FR-04.2 Document Attachment

- The system shall allow attachment of the following documents per shipment: Bill of Lading (BL), Commercial Invoice (CI), Packing List, Certificate of Origin (CoO), Quality / Inspection Certificate, Phytosanitary Certificate (if applicable), Insurance Certificate (if CIF), any other customs-required documents

- Each document shall record: document type, file attachment (PDF/image), document date, and document reference number

- The system shall display a document checklist per shipment showing which required documents have been uploaded and which are pending

## FR-04.3 Shipment Quantities

- The system shall record the shipped quantity per item per shipment (which may differ from the PO quantity if partial shipment)

- The system shall compare shipped quantity vs. PO quantity and flag over-shipments or shortfalls

## FR-05: Customs Clearance Management

The system shall manage the customs clearance process from document submission to goods release.

## FR-05.1 Customs Declaration

- Customs Declaration record: Declaration Number (assigned by ERCA), Declaration Date, Clearing Agent (internal or external company name), CIF Value (ETB, used as duty base), HS Code per item, Duty Rate per item (%), Calculated Duty Amount per item, VAT on Imports (15% of CIF + Duty in Ethiopia), Excise Tax (if applicable), Withholding Tax (if applicable), Total Tax Assessment (ETB)

- The system shall automatically calculate total customs duty for each item: Duty = CIF Value × Duty Rate (%) per HS Code

- The system shall calculate import VAT: VAT = (CIF Value + Duty) × 15%

## FR-05.2 Duty Payment

- Record actual duty payment: Payment Date, Bank Reference, Amount Paid (ETB), Receipt Number from ERCA/bank

- System shall flag if actual duty paid differs from assessed duty by more than a configurable tolerance

## FR-05.3 Customs Release

- Record goods release: Release Date, Release Reference Number, Customs Officer (if captured)

- Goods release confirmation triggers the system to allow GRN creation in the warehouse


- Clearing agent invoice: record agent's service fee separately as a cost component

## FR-05.4 Port & Storage Charges

- Record port handling charges: port authority invoice, amount, date

- Record storage/demurrage charges: container detention or port storage fees incurred for delayed clearance

- All port and storage charges are linked to the shipment and included in the cost buildup

## FR-06: Cost Buildup Register

The Cost Buildup Register is the central feature of this system. It aggregates all costs associated with an import shipment into a single structured record that drives the landed cost calculation.

## FR-06.1 Cost Components

The system shall support the following cost component categories, each configurable and extensible by system administrators:

|   | Category | Cost Components |   | Default |   | Notes |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   | Allocation |   |   |   |   |   |
|   |   |   | Item invoice value (CI value |   |   |   |   |   |   |
|   | Supplier Cost |   | per item) — sum of all line | By Value |   | Base cost; always present |   |   |   |
|   | item prices |   |   |   |   |   |   |   |   |
|   |   |   | Ocean/air freight, inland |   |   |   |   |   |   |
|   | Freight & Logistics fee Insurance FOB) Bank & LC Charges fees |   | transport from port to warehouse, freight forwarder Cargo insurance premium (required for CIF; optional for LC opening fee, advising fee, acceptance commission, SWIFT charges, amendment | By Weight or Volume By Value By Value |   | Multiple freight invoices possible per shipment Applies to full shipment value Pulled automatically from LC record |   |   |   |
| Fee | Customs Duty rate Import VAT 15%) Port & Handling Storage & Demurrage Clearing Agent Inland Transport | terminal handling, agent service fee | Import duty per HS code and VAT on imports (CIF + Duty × Port authority charges, loading/unloading at port Container detention fees, port storage for delayed clearance Customs broker/clearing Transport from port to warehouse (if buyer arranges) | By Value (per item) By Value (per item) By Weight or Quantity By Value By Value or Equal Split By Weight or Volume |   | Calculated per HS code; item-specific Item-specific; recoverable in some cases One invoice usually for full shipment Avoidable cost — tracked separately for analysis Fixed fee or percentage of CIF Separate from freight if origin is FOB |   |   |   |


| Default Category Cost Components Notes Allocation Any other import-related charge not in above Admin can add new cost Other Charges Configurable |
| --- |
| categories (e.g. fumigation, categories labelling) |

## FR-06.2 Cost Entry

- Each cost entry shall record: Cost Category, Cost Sub-type (e.g. 'Ocean Freight'), Supplier/Provider of that cost, Invoice Number, Invoice Date, Amount in Foreign Currency, Currency, Exchange Rate (ETB), Amount in ETB, Allocation Method, and Attachment (supporting invoice)

- The system shall validate that exchange rates are within a configurable range of the NBE published rate (configurable tolerance, e.g. ±5%) and warn if outside range

- Cost entries may be added at any point before the cost buildup is finalised

## FR-06.3 Cost Buildup Summary

The system shall display a real-time cost buildup summary per shipment showing:

- Total Supplier Cost (ETB)

- Total Additional Charges by category (ETB)

- Grand Total Landed Cost (ETB)

- Estimated vs. Actual comparison with variance amount and percentage

- Per-unit landed cost preview (before finalisation)

BUSINESS RULE: Estimated costs (from PO stage) and actual costs (from invoices) are maintained in parallel until the shipment is finalised. This allows management to see the variance before committing to the final inventory cost.

## FR-07: Cost Allocation Engine

The system shall allocate additional import charges (all costs other than the direct supplier item price) across individual items in the shipment using one of four allocation methods. Different cost components may use different allocation methods.

## FR-07.1 Allocation Methods

|   | Method Formula |   |   | Best Used For |   | Example |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   | Item worth ETB |   |   |   |
|   |   |   | Item Allocation = (Item CI Value | Freight, insurance, |   | 10,000 in a ETB |   |   |   |
|   | By Value (%) Total Charge |   | / Total Shipment CI Value) × | bank charges — cost scales with item value |   | 100,000 shipment |   |   |   |
|   |   |   |   |   |   | gets 10% of freight |   |   |   |
|   |   |   | Item Allocation = (Item Weight | Port handling, inland |   | Item weighing 200kg |   |   |   |
|   |   |   |   | transport — cost |   | in a 1,000kg shipment |   |   |   |
|   | By Weight (kg) |   | kg / Total Shipment Weight kg) × |   |   |   |   |   |   |
|   | Total Charge |   |   | scales with physical |   | gets 20% of port |   |   |   |
|   |   |   |   | weight |   | charges |   |   |   |


| Method | Formula Best Used For Example Item occupying 2 |
| --- | --- |
|   | Item Allocation = (Item Volume Ocean freight (when By Volume CBM in a 20 CBM CBM / Total Shipment Volume quoted per CBM), |
| (CBM) | shipment gets 10% of CBM) × Total Charge storage charges |
| (Units) | freight Equal per-unit Item Allocation = (Item Quantity / 100 units in a 1,000 By Quantity charges like per-unit Total Shipment Quantity) × Total unit shipment get inspection fees, Charge 10% of inspection fee labelling |

## FR-07.2 Allocation Rules

- The system shall allow each cost component to be assigned its own allocation method independently

- When 'By Weight' or 'By Volume' is selected, the system must have weight/volume data per item from the packing list; if missing, the system shall warn and default to 'By Value'

- For item-specific costs (customs duty, import VAT), the system shall not allocate — it shall assign the exact duty/VAT calculated per item's HS code directly

- The allocation engine must ensure that the sum of all item allocations equals exactly the total charge being allocated (rounding differences assigned to the highest-value item)

## FR-07.3 Allocation Calculation Example

BUSINESS RULE: Shipment contains Item A (500 units, CI value ETB 50,000, weight 200kg) and Item B (200 units, CI value ETB 30,000, weight 150kg). Total CI: ETB 80,000. Total weight: 350kg. Freight charge: ETB 8,000 allocated By Weight. Item A freight: (200/350) × 8,000 = ETB 4,571. Item B freight: (150/350) × 8,000 = ETB 3,429.

## FR-08: Landed Cost Calculation

## FR-08.1 Per-Item Landed Cost Formula

For each item in a shipment, the system shall calculate:

BUSINESS RULE: Per-Unit Landed Cost = (Item CI Value + Item Customs Duty + Item Import VAT + Item Allocated Freight + Item Allocated Insurance + Item Allocated Bank Charges + Item Allocated Port Charges + Item Allocated Clearing Fee + All Other Allocated Charges) / Item Quantity Received

## FR-08.2 Calculation Trigger

- A draft landed cost calculation shall be available at any time after cost entries are made

- The final landed cost calculation is locked when the Finance Manager finalises the cost buildup for a shipment

- The finalised per-unit landed cost is transmitted to the Inventory Management module for stock valuation

## FR-08.3 Multi-Currency Handling

- All foreign currency amounts are converted to ETB using the exchange rate recorded at the time of each specific transaction


- The system shall display both foreign currency amounts and ETB equivalents on all screens

- The FX rate used for each cost entry is recorded and immutable after the entry is saved

## FR-09: Goods Receipt Note (GRN)

## FR-09.1 GRN Creation

- GRN can only be created after customs release has been confirmed in the system

- GRN record shall contain: GRN Number, Shipment Reference, PO Reference, Receipt Date, Warehouse Location, Received By (staff name), Inspected By

- The Warehouse Manager shall confirm received quantities per item against the packing list

- The system shall flag quantity discrepancies: received quantity vs. shipped quantity vs. PO quantity

## FR-09.2 Quality Inspection on Receipt

- Option to record inspection result per item: Accepted, Rejected, Accepted with Conditions

- Rejected items are quarantined and not added to usable stock; rejection reason recorded

- Only accepted quantities are posted to inventory

## FR-09.3 Inventory Update

- On GRN confirmation, the system shall post to the Inventory module: Item Code, Received Quantity, Per-Unit Landed Cost (from cost buildup), Lot/Batch Reference, and Date

- If the cost buildup is not yet finalised at GRN time, the system uses the estimated cost and flags the GRN for cost adjustment when the final cost is confirmed

## FR-10: Variance Management

- The system shall compare the total estimated landed cost (from PO stage) against the total actual landed cost (from all invoices and charges)

- Variances are classified as: Price Variance (CI price differs from PO price), Exchange Rate Variance (FX rate moved), Freight Variance (actual freight differs from estimate), Duty Variance (actual duty differs from estimate), Other Charge Variance

- Variances below a configurable threshold (e.g. 2% of total landed cost) are auto-approved

- Variances above the threshold require Finance Manager approval before the cost buildup can be finalised

- All variances are recorded and included in reporting for management review

## FR-11: Reporting Requirements

| Report Name | Content | Audience |
| --- | --- | --- |
| Landed Cost by | All cost components for a shipment, total landed cost, | Finance |
| Shipment | per-unit cost per item, allocation breakdown, estimated | Manager, |
|   | vs. actual variance | Procurement |


|   | Report Name Content Landed Cost by Item shipment Landed Cost by Supplier Import Cost Summary LC Status Report Customs Duty Report Shipment Status Report Cost Variance Report | total as % of CI value | actual vs. assessed duty variances | Audience Per-unit landed cost trend for a specific item across Finance, multiple shipments; cost component breakdown by Procurement Total import value, total charges, average landed cost Management, markup % for each supplier over a selected period Procurement Monthly/quarterly summary of all import costs by category; total freight, total duty, total bank charges, Finance Manager All open LCs with expiry dates, amounts, status, Procurement, associated PO and shipment; alerts for expiring LCs Finance Duty paid per shipment, per HS code, per period; Finance, Compliance All shipments with current status (ordered, shipped, at Procurement, customs, cleared, received); ETA tracking Logistics Estimated vs. actual cost variances by shipment, by Finance Manager cost category, and by period; variance root cause |
| --- | --- | --- | --- | --- |
|   | Supplier Performance |   |   | Delivery lead time accuracy, shipment document Procurement completeness score, price variance, quality rejection |
|   | rate |   |   | Manager |

All reports shall be: filterable by date range, supplier, item, category, status; exportable to PDF and Excel; accessible based on user role permissions.


## 4. Data Requirements

## 4.1 Database Schema — Key Tables

## 4.1.1 import_purchase_orders

|   | Column |   |   |   |   |   |   |   |   |   |   |   |   |   |   | Type |   |   |   |   |   | Description |   |   |   |   |   |   |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | UUID / BIGSERIAL |   |   |   |   |   | Primary key |   |   |   |   |   |   |   |   |   |   |   |
|   | po_number |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | VARCHAR(50) |   |   |   |   |   |   |   |   |   |   | Unique PO number, auto-generated |   |   |   |   |   |
|   | supplier_id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → suppliers |   |   |   |   | Supplier reference |   |   |   |   |   |   |   |   |   |   |   |
|   | po_date |   |   |   |   |   |   |   |   |   |   |   |   |   |   | DATE |   |   |   |   |   | Date PO was raised |   |   |   |   |   |   |   |   |   |   |   |
|   | incoterm |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | VARCHAR(10) |   |   |   |   |   |   |   | FOB, CIF, EXW, CFR, etc. |   |   |   |   |   |   |   |   |
|   | currency |   |   |   |   |   |   |   |   |   |   |   |   |   |   | VARCHAR(3) |   |   |   |   |   |   |   |   |   |   |   | Supplier currency code (USD, EUR, CNY...) |   |   |   |   |   |
|   | fx_rate |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,6) |   |   |   |   |   |   |   | ETB exchange rate at PO date |   |   |   |   |   |   |   |
|   | total_value_foreign |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   |   | Total PO value in supplier currency |   |   |   |   |   |   |
|   | total_value_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   | Total PO value in ETB |   |   |   |   |   |   |   |   |   |   |
|   | estimated_duty_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   |   | Estimated customs duty in ETB |   |   |   |   |   |   |
|   | status |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | VARCHAR(30) |   |   |   |   |   |   |   |   |   |   | draft/pending_approval/approved/shipped/received/closed |   |   |   |   |   |
|   | approved_by |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → users |   |   |   |   |   |   |   |   |   | User who gave final approval |   |   |   |   |   |   |   |
|   | approved_at |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TIMESTAMP |   |   |   |   |   | Approval timestamp |   |   |   |   |   |   |   |   |   |   |   |
|   | notes |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TEXT |   |   |   |   |   |   |   |   |   |   | Any notes or special instructions |   |   |   |   |   |   |
|   | created_by |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → users |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | created_at |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TIMESTAMP |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | updated_at |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TIMESTAMP |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |

## 4.1.2 import_shipments

|   | Column |   | Type |   |   |   | Description |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | shipment_number |   | UUID / BIGSERIAL VARCHAR(50) FK → |   |   |   | Primary key |   | Unique shipment reference |   |   |
| lc_id | po_id bl_number bl_date |   | s VARCHAR(100) DATE | import_purchase_order FK → letters_of_credit |   |   | Associated PO Bill of Lading number BL date |   | Associated LC (nullable if open account) |   |   |
|   | vessel_name |   | VARCHAR(200) |   |   |   |   | Ship/flight/truck reference |   |   |   |


|   | Column |   |   |   |   |   | Type |   |   |   |   | Description |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   | container_numbers |   |   | TEXT[] |   |   |   |   | Array of container numbers |   |
|   |   |   | port_of_loading |   |   |   | VARCHAR(100) |   |   |   |   |   |   |
|   |   |   |   | port_of_destination |   |   | VARCHAR(100) |   |   |   |   |   |   |
| eta |   |   |   |   |   |   | DATE |   |   |   |   | Estimated time of arrival |   |
|   |   |   |   | actual_arrival_date |   |   | DATE |   |   |   |   | Actual arrival date |   |
|   |   |   | total_weight_kg |   |   |   | NUMERIC(18,4) |   |   |   |   | Total shipment weight |   |
|   |   |   |   | total_volume_cbm |   |   | NUMERIC(18,4) |   |   |   |   | Total shipment volume |   |
|   |   |   |   |   |   |   |   |   |   |   |   | ordered/shipped/at_customs/cleared/partially_received/recei |   |
|   | status |   |   |   |   |   | VARCHAR(30) |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   | ved |   |
| e |   |   |   |   | customs_release_dat |   | DATE |   |   |   |   | Date goods released from customs |   |
|   |   |   |   |   | customs_release_ref |   | VARCHAR(100) |   |   |   |   | ERCA release reference number |   |

## 4.1.3 import_cost_entries (Cost Buildup Register)

|   | Column |   |   |   |   |   | Type |   |   |   |   |   |   |   |   |   |   | Description |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id |   | shipment_id |   |   |   |   | UUID / BIGSERIAL FK → import_shipm |   |   |   |   |   |   |   |   |   |   | Primary key |   | Shipment this cost belongs to |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   | ents |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   | VARCHAR(5 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | freight/insurance/bank_charge/customs_duty/import_vat/port_handling/stora |   |   |   |   |   |   |   |   |   |
|   |   | cost_category |   |   |   |   | 0) |   |   |   |   |   |   |   |   |   |   | ge/clearing_fee/other |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | cost_subcateg |   |   |   |   | VARCHAR(1 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | More specific label (e.g. 'Ocean Freight', 'LC Opening Fee') |   |   |   |   |   |   |   |   |   |   |   |   |
| ory |   |   |   |   |   |   | 00) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | provider_nam |   |   |   |   | VARCHAR(2 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| e |   |   |   |   |   |   | 00) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | Who charged this cost (bank name, freight forwarder, port authority, etc.) |   |   |   |   |   |   |   |   |   |
|   |   | invoice_numb |   |   |   |   | VARCHAR(1 |   |   |   |   |   |   |   |   |   |   |   |   |   | Provider's invoice/receipt number |   |   |   |   |   |   |   |   |   |   |   |   |   |
| er |   |   |   |   |   |   | 00) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | invoice_date |   |   |   |   | DATE |   |   |   |   |   |   |   |   |   |   |   | Date of the charge invoice |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | amount_foreig |   |   |   |   | NUMERIC(18 |   |   |   |   |   |   |   |   |   |   |   |   |   | Amount in foreign currency (if applicable) |   |   |   |   |   |   |   |   |   |   |   |   |   |
| n |   |   |   |   |   |   | ,4) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | currency |   |   |   |   |   | VARCHAR(3) |   |   |   |   |   |   |   |   |   |   | Currency of the charge |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | fx_rate |   |   |   |   |   | NUMERIC(18 ,6) |   |   |   |   |   |   |   |   |   |   |   |   |   | ETB rate used for this specific charge |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | amount_etb |   |   |   |   | NUMERIC(18 |   |   |   |   |   |   |   |   |   |   |   |   |   | Amount in ETB (calculated or directly entered) |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   | ,4) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | allocation_met |   |   |   |   | VARCHAR(2 |   |   |   |   |   |   |   |   |   |   |   |   |   |   | by_value/by_weight/by_volume/by_quantity/item_specific |   |   |   |   |   |   |   |   |   |   |   |   |
| hod |   |   |   |   |   |   | 0) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | is_estimated |   |   |   |   | BOOLEAN |   |   |   |   |   |   |   |   |   |   |   |   |   | TRUE if this is an estimate; FALSE if actual invoice |   |   |   |   |   |   |   |   |   |   |   |   |   |


|   | Column Type |   | Description |   |   |   |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   | is_item_specif |   |   |   |   |   |   |   |   |   |   |
|   | BOOLEAN |   |   |   |   |   |   | TRUE for duty/VAT (allocated per HS code, not shared) |   |   |   |
| ic |   |   |   |   |   |   |   |   |   |   |   |
|   | attachment_ur |   |   |   |   |   |   |   |   |   |   |
|   | TEXT |   |   |   |   |   |   | Link to stored invoice document |   |   |   |
| l |   |   |   |   |   |   |   |   |   |   |   |
|   | created_by FK → users |   |   |   |   |   |   |   |   |   |   |
|   | created_at TIMESTAMP |   |   |   |   |   |   |   |   |   |   |

## 4.1.4 import_landed_cost_results (Calculated Output)

|   | Column |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | Type |   |   |   |   |   |   |   | Description |   |   |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | UUID / |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | Primary key |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | BIGSERIAL |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | shipment_id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | import_shipments |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | item_id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → items |   |   |   |   |   |   | Item from the item master |   |   |   |   |   |   |
|   |   | po_line_id |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → po_lines |   |   |   |   |   |   |   | Specific PO line for this item |   |   |   |   |   |
|   |   |   |   | quantity_received |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   |   | Actual quantity received in GRN |   |   |   |   |
|   |   | ci_value_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   |   |   |   | CI price for this item converted to ETB |   |   |
|   |   |   |   | customs_duty_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   | Item-specific customs duty |   |   |   |   |   |   |
|   |   |   | import_vat_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   | Item-specific import VAT |   |   |   |   |   |   |
|   |   |   |   | freight_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   | Allocated freight portion |   |   |   |   |   |   |
|   |   |   |   | insurance_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   | Allocated insurance portion |   |   |   |   |   |
|   |   |   |   |   | bank_charges_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   |   | Allocated bank/LC charges portion |   |   |   |   |
|   |   |   |   | port_charges_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   | Allocated port handling portion |   |   |   |   |   |
|   |   |   |   | clearing_fee_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) |   |   |   |   |   |   |   | Allocated clearing agent fee |   |   |   |   |   |
|   |   |   |   | total_landed_cost_etb per_unit_landed_cost_etb | other_charges_allocated_etb |   |   |   |   |   |   |   |   |   |   |   |   |   |   | NUMERIC(18,4) NUMERIC(18,4) NUMERIC(18,6) |   |   |   |   |   |   |   |   | Sum of all other allocated charges | Sum of all above — total for this item |   | total_landed_cost_etb / quantity_received |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TRUE if based on estimated costs; FALSE if |   |
|   |   | is_estimated |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | BOOLEAN |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | finalised |   |   |   |   |   |   |   |   |
|   |   | is_finalised |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | BOOLEAN |   |   |   |   |   |   |   |   |   |   |   | TRUE when Finance Manager confirms this cost |   |
|   |   | finalised_by |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | FK → users |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | finalised_at |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TIMESTAMP |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   | posted_to_inventory |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | BOOLEAN |   |   |   |   |   |   |   |   |   |   | TRUE once synced to Inventory module |   |   |
|   | posted_at |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TIMESTAMP |   |   |   |   |   |   |   |   |   |   |   |   |   |


## 5. Non-Functional Requirements

## 5.1 Performance

- The cost allocation calculation for a shipment containing up to 200 line items shall complete within 3 seconds

- All list screens (PO list, shipment list, cost register) shall load in under 2 seconds with up to 10,000 records

- Report generation for a date range of up to 12 months shall complete within 10 seconds

- The system shall support up to 50 concurrent users without performance degradation

## 5.2 Security

- All data in transit shall be encrypted using TLS 1.3

- All data at rest shall be encrypted on the database server

- Authentication via JWT tokens with access token expiry of 15 minutes and refresh token expiry of 30 days

- Role-based access control: users see only the modules and data permitted by their assigned role

- All financial records (cost entries, landed cost calculations) are immutable after approval — corrections only via reversal entries with full audit trail

- Failed login attempts exceeding 5 within 10 minutes shall lock the account temporarily

## 5.3 Audit and Traceability

- Every create, update, delete, and approval action shall be logged with: user, timestamp, before- value, after-value, IP address, and action type

- The audit log is read-only — no user may delete or modify audit log entries

- Full lineage from PO line item to landed cost result to inventory entry must be queryable

## 5.4 Data Integrity

- All monetary amounts stored as NUMERIC(18,4) — no floating-point types

- The sum of all item allocations for any cost component must equal the total cost component amount (enforced by the allocation engine with rounding residual assigned to highest-value item)

- Foreign key constraints enforced at database level for all relationships

- Unique constraints on PO numbers, shipment numbers, LC numbers, GRN numbers

## 5.5 Reliability and Availability

- System target availability: 99.5% uptime during business hours (8am–8pm, Monday–Saturday)

- Automated database backups every 6 hours; point-in-time recovery to within 1 hour

- Backup restore shall be tested monthly and take no more than 2 hours


## 5.6 Usability

- All screens shall be accessible in English and Amharic; language switchable without logout

- The cost buildup register shall provide inline totals and a running landed cost estimate that updates as entries are added

- Warning messages shall clearly state the impact of actions on downstream records (e.g. finalising costs updates inventory)

- All data entry forms shall have field-level validation with clear error messages


## 6. Business Rules

|   |   | BR # Business Rule |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   | BR- |   |   |   |   |   |   |   |   | A GRN may only be created after customs release is confirmed in the system. Goods cannot |   |   |   |   |   |   |
|   | 01 |   |   |   |   |   | be received into inventory without customs clearance. |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | A landed cost buildup may only be finalised by the Finance Manager role or above. |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | 02 |   |   | Manager. |   |   |   |   |   | Finalisation is irreversible — corrections require a reversal entry approved by Finance |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | The sum of all item-level landed cost allocations for any cost component must equal exactly |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | the total cost component amount. The system automatically assigns rounding residuals to the |   |   |   |   |   |   |
|   | 03 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   | highest-value item. |   |   |   |   |   |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | Customs duty and import VAT are item-specific charges assigned directly to each item based |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | on HS code and assessed rate. These are never shared or allocated proportionally across |   |   |   |   |   |   |
|   | 04 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   | items. |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | A cost buildup may not be finalised if any cost entry is still marked as 'estimated'. All cost |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | entries must be updated to actual before finalisation, OR the Finance Manager explicitly |   |   |   |   |   |   |
|   | 05 |   |   |   |   |   |   |   | accepts remaining estimates with documented justification. |   |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | Per-unit landed cost is calculated using the actual received quantity (from GRN), not the PO |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | quantity or shipped quantity. If less is received than shipped, the total cost is spread over |   |   |   |   |   |   |
|   | 06 |   |   |   |   | fewer units, increasing the per-unit cost. |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | If the total actual landed cost varies from the estimated landed cost by more than the |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | 07 |   |   |   |   |   |   |   |   | configured variance threshold (default 2%), Finance Manager approval is required before the |   |   |   |   |   |   |
|   |   |   |   |   | cost buildup can be finalised. |   |   |   |   |   |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | An LC must be linked to at least one PO. A PO may be linked to at most one LC (one-to-many |   |   |   |   |   |   |
|   | 08 |   |   |   |   |   |   |   |   | in the other direction: one LC may cover multiple POs from the same supplier). |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | LC bank charges (opening fee, advising fee, acceptance commission, SWIFT charges) are |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | automatically pulled from the LC record into the cost buildup register for the associated |   |   |   |   |   |   |
|   | 09 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   | shipment. They do not need to be entered manually. |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | Foreign exchange rates are locked at the time each cost entry is saved. The rate cannot be |   |   |   |   |   |   |
|   | BR- 10 |   |   |   |   |   |   |   |   | changed after the entry is confirmed. This preserves the audit trail of the ETB equivalent at |   |   |   |   |   |   |
|   |   |   |   |   | the time the charge was incurred. |   |   |   |   |   |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | A supplier invoice (CI) value that differs from the PO value by more than a configurable |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | percentage (default 5%) shall generate a price variance alert requiring Procurement Manager |   |   |   |   |   |   |
|   | 11 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   | acknowledgement before the shipment can proceed to GRN. |   |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   | If 'By Weight' or 'By Volume' is selected as the allocation method but weight/volume data is |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | missing for any item in the shipment, the system must warn and may not allocate until data is |   |   |   |   |   |   |
|   | 12 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | provided, OR the user overrides by switching to 'By Value' for that component. |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | Rejected goods (items failing QC at GRN stage) shall not be included in the landed cost |   |   |   |   |   |   |
|   | BR- 13 |   |   |   |   |   |   |   |   | calculation for inventory posting. A separate claim or write-off entry must be created for |   |   |   |   |   |   |
|   |   |   |   |   | rejected quantities. |   |   |   |   |   |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   | The per-unit landed cost transmitted to the Inventory Management module is immutable. If a |   |   |   |   |   |   |
|   | BR- |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
|   | 14 |   |   |   |   |   |   |   | Financial Accounting module with Finance Manager approval. | correction is required after posting, a journal adjustment entry must be made through the |   |   |   |   |   |   |


## 7. External Interface Requirements

## 7.1 Inventory Management Module Interface

- The system shall expose a REST API endpoint that the Inventory Management module calls to receive landed cost data on GRN confirmation

- Payload: {grn_id, shipment_id, item_id, quantity_received, per_unit_landed_cost_etb, cost_breakdown_json}

- The Inventory module shall respond with: {status: 'posted' | 'error', inventory_transaction_id}

- If the Inventory module returns an error, the GRN is marked as 'posting_failed' and an alert is sent to the System Administrator

## 7.2 Financial Accounting Module Interface

- Upon GRN confirmation, the system shall post a journal entry to the Financial Accounting module: Debit Inventory Asset account, Credit Accounts Payable (for supplier CI amount), Credit Accrued Import Charges (for all non-CI costs)

- When LC bank charges are posted, journal entries are: Debit Import Charges Expense, Credit Bank Account

- When customs duty is paid, journal entry: Debit Customs Duty Expense, Credit Bank Account

## 7.3 Document Storage

- All uploaded documents (BL, CI, customs declarations, invoices) shall be stored in a configured file storage service (MinIO / S3-compatible)

- Documents are stored with: unique filename, shipment reference, document type, upload timestamp, uploaded by

- Documents are accessible via authenticated signed URLs with expiry

## 7.4 Notification Interface

- LC expiry alerts, variance alerts, and approval requests shall be sent via: in-app notification, email (SMTP), and optionally Telegram

- Notification templates shall support English and Amharic


## 8. Acceptance Criteria Summary

The system shall be considered accepted by the client when all of the following criteria are verified in the UAT environment:

| # |   |   |   |   |   |   | Acceptance Criterion |   |   |   |   |   |   |   | Test Ref. |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC- |   |   |   |   |   |   |   |   | A complete import cycle can be executed end-to-end: PO creation → LC |   |   |   |   |   |   |   |
| 01 |   |   |   |   |   |   |   |   | application → shipment recording → customs clearance → cost buildup → allocation → GRN → inventory update, with all data traceable throughout |   |   |   |   |   | TC-E2E-01 |   |
| AC- |   |   |   |   |   |   |   |   | All four allocation methods (By Value, By Weight, By Volume, By Quantity) |   |   |   |   |   | TC-ALLOC- |   |
| 02 |   |   |   |   | amount |   |   |   |   | produce correct item-level allocations that sum exactly to the total cost component |   |   |   |   | 01 to 04 |   |
| AC- |   |   |   |   |   |   |   |   |   | Customs duty and import VAT are correctly calculated per HS code and rate, and |   |   |   |   | TC-DUTY- |   |
| 03 |   |   |   |   |   |   |   | assigned directly to the respective items without cross-allocation |   |   |   |   |   |   | 01 |   |
| AC- |   |   |   |   |   |   |   |   |   | LC bank charges are automatically pulled into the cost buildup register and do not |   |   |   |   |   |   |
| 04 |   |   |   |   |   |   | need to be entered manually |   |   |   |   |   |   |   | TC-LC-02 |   |
| AC- |   |   |   |   |   |   |   |   |   | The per-unit landed cost calculation is mathematically correct per the formula in |   |   |   |   | TC-COST- |   |
| 05 |   |   |   |   |   |   |   | FR-08.1 for a shipment with at least 5 different items |   |   |   |   |   |   | 01 |   |
| AC- 06 |   |   |   |   |   |   | so produces a clear error message |   |   | A GRN cannot be created before customs release is confirmed; attempting to do |   |   |   |   | TC-GRN- 01 |   |
| AC- |   |   |   |   |   |   |   |   |   | Cost buildup finalisation is blocked when any estimated costs remain; the system |   |   |   |   | TC-FINAL- |   |
| 07 |   |   |   |   |   |   |   | clearly identifies which entries are still estimated |   |   |   |   |   |   | 01 |   |
| AC- |   |   |   |   |   |   |   |   |   | Variances above the configured threshold cannot bypass Finance Manager |   |   |   |   |   |   |
| 08 |   |   |   |   |   |   |   | approval; the approval workflow functions correctly |   |   |   |   |   |   | TC-VAR-01 |   |
| AC- |   |   |   |   |   |   |   |   |   | All monetary amounts are stored and displayed with 4 decimal places; no floating- |   |   |   |   | TC-DATA- |   |
| 09 |   |   |   |   |   |   |   | point rounding errors are observed in any calculation |   |   |   |   |   |   | 01 |   |
| AC- |   |   |   |   |   |   |   |   |   | Role-based access control is correctly enforced: Warehouse Manager cannot |   |   |   |   | TC-RBAC- |   |
| 10 |   |   |   |   |   |   |   |   |   | access LC or cost entry screens; Finance Officer cannot approve their own entries |   |   |   |   | 01 to 03 |   |
| AC- |   |   |   |   |   |   |   |   |   | All 9 reports generate correctly with accurate data, are filterable by date range and |   |   |   |   | TC-RPT-01 |   |
| 11 |   |   |   |   |   |   |   | supplier, and export to PDF and Excel |   |   |   |   |   |   | to 09 |   |
| AC- |   |   |   |   |   |   |   |   |   | Audit log captures all financial entries with user, timestamp, and before/after |   |   |   |   |   |   |
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | TC-AUDIT- |   |
| 12 |   |   |   |   |   |   | values; log is read-only to all users |   |   |   |   |   |   |   | 01 |   |
| AC- |   |   |   |   |   |   |   |   |   | System performance: cost allocation for 200-line shipment completes in under 3 |   |   |   |   | TC-PERF- |   |
| 13 |   |   |   |   |   |   |   | seconds; all list screens load in under 2 seconds |   |   |   |   |   |   | 01 |   |
| AC- 14 |   |   |   |   |   |   |   | the correct users via configured channels |   | LC expiry alerts are sent 30 days and 7 days before expiry; alerts are received by |   |   |   |   | TC-ALERT- 01 |   |

SRS-COSTIMPORT-2026-001 | Cost Buildup for Imported Items Management System | Version 1.0 | August 2026
