INSERT INTO "roles" ("code", "name", "description") VALUES
  ('finance_officer', 'Finance Officer', 'Maintains rates, costs, and finance records'),
  ('procurement_manager', 'Procurement Manager', 'Manages procurement workflows and approvals'),
  ('finance_manager', 'Finance Manager', 'Approves and finalizes landed cost and finance workflows'),
  ('general_manager', 'General Manager', 'Executive approvals, reporting, and oversight')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

INSERT INTO "permissions" ("code", "description") VALUES
  ('po:approve:tier1', 'po:approve:tier1'),
  ('po:approve:tier2', 'po:approve:tier2'),
  ('po:approve:tier3', 'po:approve:tier3')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

INSERT INTO "role_permissions" ("role_code", "permission_code") VALUES
  ('finance_officer', 'po:approve:tier1'),
  ('procurement_manager', 'po:approve:tier1'),
  ('finance_manager', 'po:approve:tier2'),
  ('general_manager', 'po:approve:tier3')
ON CONFLICT ("role_code", "permission_code") DO NOTHING;
