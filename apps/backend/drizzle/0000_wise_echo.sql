CREATE TYPE "public"."allocation_method_enum" AS ENUM('by_value', 'by_weight', 'by_volume', 'by_quantity', 'item_specific', 'equal_split');--> statement-breakpoint
CREATE TYPE "public"."approval_decision_enum" AS ENUM('approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."audit_action_enum" AS ENUM('create', 'update', 'delete', 'approve', 'reject', 'finalise', 'post', 'reverse', 'login');--> statement-breakpoint
CREATE TYPE "public"."cost_category_code_enum" AS ENUM('fob', 'freight', 'insurance', 'customs_duty', 'excise_tax', 'vat', 'sur_tax', 'withholding_tax', 'port_handling', 'demurrage', 'transportation', 'transit_insurance', 'bank_charges', 'agent_commission', 'inspection_fee', 'miscellaneous');--> statement-breakpoint
CREATE TYPE "public"."cost_entry_source_enum" AS ENUM('manual', 'lc_bank_charge', 'customs', 'commercial_invoice', 'po_estimate');--> statement-breakpoint
CREATE TYPE "public"."customs_declaration_status_enum" AS ENUM('draft', 'assessed', 'paid', 'released');--> statement-breakpoint
CREATE TYPE "public"."duty_structure_enum" AS ENUM('ad_valorem', 'specific');--> statement-breakpoint
CREATE TYPE "public"."erp_sync_entity_type_enum" AS ENUM('inventory_posting', 'journal_entry');--> statement-breakpoint
CREATE TYPE "public"."erp_sync_status_enum" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."grn_status_enum" AS ENUM('draft', 'confirmed', 'posting_failed', 'posted', 'flagged_for_adjustment');--> statement-breakpoint
CREATE TYPE "public"."inspection_result_enum" AS ENUM('pending', 'accepted', 'rejected', 'accepted_with_conditions');--> statement-breakpoint
CREATE TYPE "public"."journal_source_type_enum" AS ENUM('grn', 'lc_charge', 'duty_payment');--> statement-breakpoint
CREATE TYPE "public"."lc_charge_type_enum" AS ENUM('opening_fee', 'amendment_fee', 'advising_confirmation_fee', 'acceptance_commission', 'swift');--> statement-breakpoint
CREATE TYPE "public"."lc_document_type_enum" AS ENUM('bl', 'ci', 'packing_list', 'coo', 'inspection_cert', 'phytosanitary', 'insurance_cert', 'other');--> statement-breakpoint
CREATE TYPE "public"."lc_status_enum" AS ENUM('applied', 'opened', 'advised', 'amended', 'docs_submitted', 'docs_received', 'docs_checked', 'discrepancies_found', 'accepted', 'payment_authorised', 'settled');--> statement-breakpoint
CREATE TYPE "public"."lc_type_enum" AS ENUM('sight', 'usance', 'deferred_payment', 'revolving', 'standby');--> statement-breakpoint
CREATE TYPE "public"."notification_channel_enum" AS ENUM('in_app', 'email', 'webhook', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."notification_type_enum" AS ENUM('lc_expiry', 'lc_last_shipment', 'lc_presentation', 'variance', 'approval_request', 'posting_failed', 'price_variance');--> statement-breakpoint
CREATE TYPE "public"."po_status_enum" AS ENUM('draft', 'pending_approval', 'approved', 'lc_applied', 'shipped', 'partially_received', 'fully_received', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."preferred_language_enum" AS ENUM('en', 'am');--> statement-breakpoint
CREATE TYPE "public"."rejected_claim_status_enum" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."rejected_claim_type_enum" AS ENUM('supplier_claim', 'write_off');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('procurement_officer', 'procurement_manager', 'finance_officer', 'finance_manager', 'customs_officer', 'warehouse_manager', 'general_manager', 'system_admin');--> statement-breakpoint
CREATE TYPE "public"."shipment_document_type_enum" AS ENUM('bl', 'ci', 'packing_list', 'coo', 'customs_declaration', 'release_note', 'insurance_certificate', 'inspection_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."shipment_status_enum" AS ENUM('ordered', 'shipped', 'at_customs', 'cleared', 'partially_received', 'received');--> statement-breakpoint
CREATE TYPE "public"."variance_status_enum" AS ENUM('auto_approved', 'pending_approval', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."variance_type_enum" AS ENUM('price', 'exchange_rate', 'freight', 'duty', 'other');--> statement-breakpoint
CREATE TABLE "audit_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action_enum" NOT NULL,
	"actor_id" uuid,
	"ip_address" "inet",
	"before_value" jsonb,
	"after_value" jsonb,
	"correlation_id" varchar(100),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_date" date NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"fx_rate" numeric(18, 6) NOT NULL,
	"total_foreign" numeric(18, 4) NOT NULL,
	"total_etb" numeric(18, 4) NOT NULL,
	"price_variance_pct" numeric(8, 4) DEFAULT '0.0000',
	"variance_acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cost_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_entry_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"allocation_method" "allocation_method_enum" NOT NULL,
	"allocated_etb" numeric(18, 4) NOT NULL,
	"is_residual_holder" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"default_allocation_method" "allocation_method_enum" DEFAULT 'by_value' NOT NULL,
	"is_item_specific" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cost_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cost_variances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"variance_type" "variance_type_enum" NOT NULL,
	"estimated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"actual_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"variance_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"variance_pct" numeric(18, 6) DEFAULT '0.0000' NOT NULL,
	"status" "variance_status_enum" DEFAULT 'pending_approval' NOT NULL,
	"approver_id" uuid,
	"decided_at" timestamp with time zone,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "customs_declaration_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"declaration_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"hs_code" varchar(20) NOT NULL,
	"duty_structure" "duty_structure_enum" DEFAULT 'ad_valorem' NOT NULL,
	"duty_rate" numeric(18, 6) DEFAULT '0.0000',
	"specific_duty_per_unit" numeric(18, 4) DEFAULT '0.0000',
	"cif_value_etb" numeric(18, 4) NOT NULL,
	"duty_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"vat_rate" numeric(18, 6) DEFAULT '15.0000' NOT NULL,
	"vat_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"excise_rate" numeric(18, 6) DEFAULT '0.0000',
	"excise_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"withholding_rate" numeric(18, 6) DEFAULT '0.0000',
	"withholding_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customs_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"declaration_number" varchar(100) NOT NULL,
	"declaration_date" date NOT NULL,
	"clearing_agent" varchar(255),
	"cif_value_etb" numeric(18, 4) NOT NULL,
	"total_duty_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"total_vat_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"total_excise_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"total_withholding_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"total_assessment_etb" numeric(18, 4) NOT NULL,
	"status" "customs_declaration_status_enum" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customs_declarations_declaration_number_unique" UNIQUE("declaration_number")
);
--> statement-breakpoint
CREATE TABLE "duty_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"declaration_id" uuid NOT NULL,
	"payment_date" date NOT NULL,
	"bank_reference" varchar(100),
	"amount_paid_etb" numeric(18, 4) NOT NULL,
	"receipt_number" varchar(100) NOT NULL,
	"variance_vs_assessed_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "erp_sync_entity_type_enum" NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"response" jsonb,
	"status" "erp_sync_status_enum" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"received_quantity" numeric(18, 4) NOT NULL,
	"accepted_quantity" numeric(18, 4) NOT NULL,
	"rejected_quantity" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"inspection_result" "inspection_result_enum" DEFAULT 'accepted' NOT NULL,
	"rejection_reason" text,
	"quarantine_flag" boolean DEFAULT false NOT NULL,
	"per_unit_landed_cost_etb" numeric(18, 6) NOT NULL,
	"line_value_etb" numeric(18, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_number" varchar(50) NOT NULL,
	"shipment_id" uuid NOT NULL,
	"po_id" uuid NOT NULL,
	"receipt_date" date NOT NULL,
	"warehouse_location" varchar(255) NOT NULL,
	"received_by" uuid NOT NULL,
	"inspected_by" uuid,
	"status" "grn_status_enum" DEFAULT 'draft' NOT NULL,
	"uses_estimated_cost" boolean DEFAULT false NOT NULL,
	"posted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_receipts_grn_number_unique" UNIQUE("grn_number")
);
--> statement-breakpoint
CREATE TABLE "import_cost_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"cost_category_id" uuid NOT NULL,
	"cost_subcategory" varchar(100),
	"provider_name" varchar(255),
	"invoice_number" varchar(100),
	"invoice_date" date,
	"amount_foreign" numeric(18, 4),
	"currency" char(3) DEFAULT 'ETB',
	"fx_rate" numeric(18, 6) DEFAULT '1.000000',
	"amount_etb" numeric(18, 4) NOT NULL,
	"allocation_method" "allocation_method_enum" NOT NULL,
	"is_estimated" boolean DEFAULT false NOT NULL,
	"is_item_specific" boolean DEFAULT false NOT NULL,
	"shipment_item_id" uuid,
	"attachment_key" text,
	"source" "cost_entry_source_enum" DEFAULT 'manual' NOT NULL,
	"source_ref_id" uuid,
	"reversed_by_entry_id" uuid,
	"reverses_entry_id" uuid,
	"estimate_accepted_by" uuid,
	"estimate_justification" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_landed_cost_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"po_line_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"quantity_received" numeric(18, 4) NOT NULL,
	"ci_value_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"customs_duty_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"import_vat_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"freight_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"insurance_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"bank_charges_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"port_charges_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"clearing_fee_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"other_charges_allocated_etb" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"total_landed_cost_etb" numeric(18, 4) NOT NULL,
	"per_unit_landed_cost_etb" numeric(18, 6) NOT NULL,
	"is_estimated" boolean DEFAULT false NOT NULL,
	"is_finalised" boolean DEFAULT false NOT NULL,
	"finalised_by" uuid,
	"finalised_at" timestamp with time zone,
	"posted_to_inventory" boolean DEFAULT false NOT NULL,
	"posted_at" timestamp with time zone,
	"inventory_transaction_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "import_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"po_date" date NOT NULL,
	"supplier_id" uuid NOT NULL,
	"incoterm" varchar(10) NOT NULL,
	"country_of_origin" varchar(100),
	"estimated_shipment_date" date,
	"estimated_arrival_date" date,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"fx_rate" numeric(18, 6) NOT NULL,
	"port_of_loading" varchar(100),
	"port_of_destination" varchar(100),
	"total_value_foreign" numeric(18, 4) NOT NULL,
	"total_value_etb" numeric(18, 4) NOT NULL,
	"estimated_freight_etb" numeric(18, 4) DEFAULT '0.0000',
	"estimated_insurance_etb" numeric(18, 4) DEFAULT '0.0000',
	"estimated_other_charge_etb" numeric(18, 4) DEFAULT '0.0000',
	"estimated_duty_etb" numeric(18, 4) DEFAULT '0.0000',
	"status" "po_status_enum" DEFAULT 'draft' NOT NULL,
	"lc_id" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "import_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_number" varchar(50) NOT NULL,
	"po_id" uuid NOT NULL,
	"lc_id" uuid,
	"supplier_id" uuid NOT NULL,
	"vessel_name" varchar(255),
	"bl_number" varchar(100),
	"bl_date" date,
	"port_of_loading" varchar(100),
	"port_of_destination" varchar(100),
	"incoterm" varchar(10),
	"carrier" varchar(255),
	"container_numbers" text[],
	"eta" date,
	"actual_arrival_date" date,
	"total_weight_kg" numeric(18, 4),
	"total_volume_cbm" numeric(18, 4),
	"status" "shipment_status_enum" DEFAULT 'ordered' NOT NULL,
	"customs_release_date" date,
	"customs_release_ref" varchar(100),
	"is_finalised" boolean DEFAULT false NOT NULL,
	"finalised_by" uuid,
	"finalised_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit_of_measure" varchar(20) NOT NULL,
	"default_hs_code" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "journal_source_type_enum" NOT NULL,
	"source_id" uuid NOT NULL,
	"lines" jsonb NOT NULL,
	"posted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lc_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lc_id" uuid NOT NULL,
	"amendment_no" integer NOT NULL,
	"amended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_delta" numeric(18, 4) DEFAULT '0.0000' NOT NULL,
	"new_expiry_date" date,
	"new_last_shipment_date" date,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lc_bank_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lc_id" uuid NOT NULL,
	"charge_type" "lc_charge_type_enum" NOT NULL,
	"amount_etb" numeric(18, 4) NOT NULL,
	"charge_date" date NOT NULL,
	"bank_reference" varchar(100),
	"register_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lc_required_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lc_id" uuid NOT NULL,
	"document_type" "lc_document_type_enum" NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "letters_of_credit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lc_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"issuing_bank" varchar(255) NOT NULL,
	"advising_bank" varchar(255),
	"lc_type" "lc_type_enum" NOT NULL,
	"amount_foreign" numeric(18, 4) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"fx_rate" numeric(18, 6) NOT NULL,
	"amount_etb" numeric(18, 4) NOT NULL,
	"opening_date" date,
	"expiry_date" date NOT NULL,
	"last_shipment_date" date,
	"presentation_period_days" integer DEFAULT 21,
	"incoterm" varchar(10),
	"partial_shipment_allowed" boolean DEFAULT true NOT NULL,
	"transhipment_allowed" boolean DEFAULT false NOT NULL,
	"special_conditions" text,
	"status" "lc_status_enum" DEFAULT 'applied' NOT NULL,
	"gm_approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "letters_of_credit_lc_number_unique" UNIQUE("lc_number")
);
--> statement-breakpoint
CREATE TABLE "nbe_exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency" char(3) NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"entered_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type_enum" NOT NULL,
	"channel" "notification_channel_enum" DEFAULT 'in_app' NOT NULL,
	"title_en" varchar(255) NOT NULL,
	"title_am" varchar(255),
	"body_en" text NOT NULL,
	"body_am" text,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"required_role" "role_enum" NOT NULL,
	"approver_id" uuid,
	"decision" "approval_decision_enum",
	"comment" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "po_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"description" varchar(500),
	"quantity" numeric(18, 4) NOT NULL,
	"unit_of_measure" varchar(20) NOT NULL,
	"unit_price" numeric(18, 6) NOT NULL,
	"total_line_value" numeric(18, 4) NOT NULL,
	"hs_code" varchar(20),
	"estimated_duty_rate" numeric(18, 6) DEFAULT '0.0000',
	"shipped_quantity" numeric(18, 4) DEFAULT '0.0000',
	"received_quantity" numeric(18, 4) DEFAULT '0.0000'
);
--> statement-breakpoint
CREATE TABLE "policy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value_numeric" numeric(18, 4),
	"value_text" text,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rejected_goods_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_item_id" uuid NOT NULL,
	"claim_type" "rejected_claim_type_enum" NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"value_etb" numeric(18, 4) NOT NULL,
	"status" "rejected_claim_status_enum" DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"document_type" "shipment_document_type_enum" NOT NULL,
	"reference_number" varchar(100),
	"document_date" timestamp with time zone,
	"object_key" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"po_line_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"shipped_quantity" numeric(18, 4) NOT NULL,
	"ci_unit_price" numeric(18, 6) NOT NULL,
	"ci_value_foreign" numeric(18, 4) NOT NULL,
	"ci_value_etb" numeric(18, 4) NOT NULL,
	"weight_kg" numeric(18, 4),
	"volume_cbm" numeric(18, 4)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100),
	"tin" varchar(100),
	"contact_person" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"payment_terms" varchar(100),
	"default_currency" char(3) DEFAULT 'USD' NOT NULL,
	"lead_time_days" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_supplier_code_unique" UNIQUE("supplier_code")
);
--> statement-breakpoint
CREATE TABLE "suppliers_bank_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"swift" varchar(11),
	"iban_or_account" varchar(100) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hs_code" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"duty_structure" "duty_structure_enum" DEFAULT 'ad_valorem' NOT NULL,
	"duty_rate" numeric(18, 6) DEFAULT '0.0000' NOT NULL,
	"specific_duty_per_unit" numeric(18, 4) DEFAULT '0.0000',
	"excise_rate" numeric(18, 6) DEFAULT '0.0000' NOT NULL,
	"withholding_rate" numeric(18, 6) DEFAULT '3.0000' NOT NULL,
	"effective_from" date NOT NULL,
	CONSTRAINT "tariff_rates_hs_code_unique" UNIQUE("hs_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" "role_enum" DEFAULT 'procurement_officer' NOT NULL,
	"department" varchar(100),
	"preferred_language" "preferred_language_enum" DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_ledger" ADD CONSTRAINT "audit_ledger_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_variance_acknowledged_by_users_id_fk" FOREIGN KEY ("variance_acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_cost_entry_id_import_cost_entries_id_fk" FOREIGN KEY ("cost_entry_id") REFERENCES "public"."import_cost_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_variances" ADD CONSTRAINT "cost_variances_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_variances" ADD CONSTRAINT "cost_variances_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ADD CONSTRAINT "customs_declaration_items_declaration_id_customs_declarations_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."customs_declarations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ADD CONSTRAINT "customs_declaration_items_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_payments" ADD CONSTRAINT "duty_payments_declaration_id_customs_declarations_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."customs_declarations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_grn_id_goods_receipts_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_import_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."import_purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_cost_category_id_cost_categories_id_fk" FOREIGN KEY ("cost_category_id") REFERENCES "public"."cost_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_reversed_by_entry_id_import_cost_entries_id_fk" FOREIGN KEY ("reversed_by_entry_id") REFERENCES "public"."import_cost_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_reverses_entry_id_import_cost_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."import_cost_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_estimate_accepted_by_users_id_fk" FOREIGN KEY ("estimate_accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cost_entries" ADD CONSTRAINT "import_cost_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_landed_cost_results" ADD CONSTRAINT "import_landed_cost_results_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_landed_cost_results" ADD CONSTRAINT "import_landed_cost_results_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_landed_cost_results" ADD CONSTRAINT "import_landed_cost_results_po_line_id_po_lines_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_landed_cost_results" ADD CONSTRAINT "import_landed_cost_results_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_landed_cost_results" ADD CONSTRAINT "import_landed_cost_results_finalised_by_users_id_fk" FOREIGN KEY ("finalised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_purchase_orders" ADD CONSTRAINT "import_purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_purchase_orders" ADD CONSTRAINT "import_purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_shipments" ADD CONSTRAINT "import_shipments_po_id_import_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."import_purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_shipments" ADD CONSTRAINT "import_shipments_lc_id_letters_of_credit_id_fk" FOREIGN KEY ("lc_id") REFERENCES "public"."letters_of_credit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_shipments" ADD CONSTRAINT "import_shipments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_shipments" ADD CONSTRAINT "import_shipments_finalised_by_users_id_fk" FOREIGN KEY ("finalised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lc_amendments" ADD CONSTRAINT "lc_amendments_lc_id_letters_of_credit_id_fk" FOREIGN KEY ("lc_id") REFERENCES "public"."letters_of_credit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lc_bank_charges" ADD CONSTRAINT "lc_bank_charges_lc_id_letters_of_credit_id_fk" FOREIGN KEY ("lc_id") REFERENCES "public"."letters_of_credit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lc_required_documents" ADD CONSTRAINT "lc_required_documents_lc_id_letters_of_credit_id_fk" FOREIGN KEY ("lc_id") REFERENCES "public"."letters_of_credit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters_of_credit" ADD CONSTRAINT "letters_of_credit_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters_of_credit" ADD CONSTRAINT "letters_of_credit_gm_approved_by_users_id_fk" FOREIGN KEY ("gm_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nbe_exchange_rates" ADD CONSTRAINT "nbe_exchange_rates_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_approvals" ADD CONSTRAINT "po_approvals_po_id_import_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."import_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_approvals" ADD CONSTRAINT "po_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_po_id_import_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."import_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_settings" ADD CONSTRAINT "policy_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_goods_claims" ADD CONSTRAINT "rejected_goods_claims_grn_item_id_goods_receipt_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."goods_receipt_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_import_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."import_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_po_line_id_po_lines_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_bank_account" ADD CONSTRAINT "suppliers_bank_account_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_ledger_entity" ON "audit_ledger" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_ledger_actor_id" ON "audit_ledger" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_ledger_action" ON "audit_ledger" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_ledger_correlation_id" ON "audit_ledger" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_audit_ledger_occurred_at" ON "audit_ledger" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_ci_shipment_id" ON "commercial_invoices" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_ci_invoice_number" ON "commercial_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cost_allocations_entry_item" ON "cost_allocations" USING btree ("cost_entry_id","shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_cost_allocations_cost_entry_id" ON "cost_allocations" USING btree ("cost_entry_id");--> statement-breakpoint
CREATE INDEX "idx_cost_allocations_shipment_item_id" ON "cost_allocations" USING btree ("shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_cost_categories_code" ON "cost_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_cost_categories_is_active" ON "cost_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_cost_variances_shipment_id" ON "cost_variances" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_cost_variances_variance_type" ON "cost_variances" USING btree ("variance_type");--> statement-breakpoint
CREATE INDEX "idx_cost_variances_status" ON "cost_variances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cd_items_declaration_id" ON "customs_declaration_items" USING btree ("declaration_id");--> statement-breakpoint
CREATE INDEX "idx_cd_items_shipment_item_id" ON "customs_declaration_items" USING btree ("shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_customs_declarations_shipment_id" ON "customs_declarations" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_customs_declarations_decl_number" ON "customs_declarations" USING btree ("declaration_number");--> statement-breakpoint
CREATE INDEX "idx_customs_declarations_status" ON "customs_declarations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_duty_payments_declaration_id" ON "duty_payments" USING btree ("declaration_id");--> statement-breakpoint
CREATE INDEX "idx_duty_payments_receipt_number" ON "duty_payments" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "idx_duty_payments_is_flagged" ON "duty_payments" USING btree ("is_flagged");--> statement-breakpoint
CREATE INDEX "idx_erp_sync_log_entity" ON "erp_sync_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_erp_sync_log_status" ON "erp_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_grn_items_grn_id" ON "goods_receipt_items" USING btree ("grn_id");--> statement-breakpoint
CREATE INDEX "idx_grn_items_shipment_item_id" ON "goods_receipt_items" USING btree ("shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_grn_items_quarantine_flag" ON "goods_receipt_items" USING btree ("quarantine_flag");--> statement-breakpoint
CREATE INDEX "idx_goods_receipts_grn_number" ON "goods_receipts" USING btree ("grn_number");--> statement-breakpoint
CREATE INDEX "idx_goods_receipts_shipment_id" ON "goods_receipts" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_goods_receipts_po_id" ON "goods_receipts" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "idx_goods_receipts_status" ON "goods_receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cost_entries_shipment_id" ON "import_cost_entries" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_cost_entries_category_id" ON "import_cost_entries" USING btree ("cost_category_id");--> statement-breakpoint
CREATE INDEX "idx_cost_entries_source" ON "import_cost_entries" USING btree ("source","source_ref_id");--> statement-breakpoint
CREATE INDEX "idx_cost_entries_is_estimated" ON "import_cost_entries" USING btree ("is_estimated");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_landed_cost_results_shipment_item" ON "import_landed_cost_results" USING btree ("shipment_id","shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_landed_cost_results_shipment_id" ON "import_landed_cost_results" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_landed_cost_results_item_id" ON "import_landed_cost_results" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_landed_cost_results_is_finalised" ON "import_landed_cost_results" USING btree ("is_finalised");--> statement-breakpoint
CREATE INDEX "idx_landed_cost_results_posted_to_inventory" ON "import_landed_cost_results" USING btree ("posted_to_inventory");--> statement-breakpoint
CREATE INDEX "idx_po_number" ON "import_purchase_orders" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "idx_po_supplier_id" ON "import_purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_po_status" ON "import_purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_po_date" ON "import_purchase_orders" USING btree ("po_date");--> statement-breakpoint
CREATE INDEX "idx_shipments_shipment_number" ON "import_shipments" USING btree ("shipment_number");--> statement-breakpoint
CREATE INDEX "idx_shipments_po_id" ON "import_shipments" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_lc_id" ON "import_shipments" USING btree ("lc_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_supplier_id" ON "import_shipments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_status" ON "import_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_items_item_code" ON "items" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "idx_items_is_active" ON "items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_source" ON "journal_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_posted" ON "journal_entries" USING btree ("posted");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lc_amendments_lc_no" ON "lc_amendments" USING btree ("lc_id","amendment_no");--> statement-breakpoint
CREATE INDEX "idx_lc_amendments_lc_id" ON "lc_amendments" USING btree ("lc_id");--> statement-breakpoint
CREATE INDEX "idx_lc_bank_charges_lc_id" ON "lc_bank_charges" USING btree ("lc_id");--> statement-breakpoint
CREATE INDEX "idx_lc_bank_charges_charge_type" ON "lc_bank_charges" USING btree ("charge_type");--> statement-breakpoint
CREATE INDEX "idx_lc_req_docs_lc_id" ON "lc_required_documents" USING btree ("lc_id");--> statement-breakpoint
CREATE INDEX "idx_lc_number" ON "letters_of_credit" USING btree ("lc_number");--> statement-breakpoint
CREATE INDEX "idx_lc_supplier_id" ON "letters_of_credit" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_lc_status" ON "letters_of_credit" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lc_expiry_date" ON "letters_of_credit" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nbe_rates_currency_date" ON "nbe_exchange_rates" USING btree ("currency","rate_date");--> statement-breakpoint
CREATE INDEX "idx_nbe_rates_rate_date" ON "nbe_exchange_rates" USING btree ("rate_date");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_entity" ON "notifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_po_approvals_po_id" ON "po_approvals" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "idx_po_approvals_approver_id" ON "po_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_po_lines_po_line_no" ON "po_lines" USING btree ("po_id","line_no");--> statement-breakpoint
CREATE INDEX "idx_po_lines_po_id" ON "po_lines" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_item_id" ON "po_lines" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_policy_settings_key" ON "policy_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_rejected_claims_grn_item_id" ON "rejected_goods_claims" USING btree ("grn_item_id");--> statement-breakpoint
CREATE INDEX "idx_rejected_claims_claim_type" ON "rejected_goods_claims" USING btree ("claim_type");--> statement-breakpoint
CREATE INDEX "idx_rejected_claims_status" ON "rejected_goods_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_shipment_documents_shipment_id" ON "shipment_documents" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_documents_document_type" ON "shipment_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_shipment_items_shipment_id" ON "shipment_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_items_po_line_id" ON "shipment_items" USING btree ("po_line_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_items_item_id" ON "shipment_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_bank_accounts_supplier_id" ON "suppliers_bank_account" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_tariff_rates_hs_code" ON "tariff_rates" USING btree ("hs_code");--> statement-breakpoint
CREATE INDEX "idx_tariff_rates_effective_from" ON "tariff_rates" USING btree ("effective_from");