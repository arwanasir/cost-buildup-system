INSERT INTO public.permissions (code, description)
VALUES ('shipment:read', 'Read import shipment records and details')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT permitted.role_code, 'shipment:read'
FROM (VALUES ('finance_officer'), ('finance_manager')) AS permitted(role_code)
WHERE EXISTS (
  SELECT 1 FROM public.roles WHERE roles.code = permitted.role_code
)
ON CONFLICT DO NOTHING;
