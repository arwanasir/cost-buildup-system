INSERT INTO public.permissions (code, description)
VALUES ('variance:read', 'Read cost variance records and history')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT role_code, 'variance:read'
FROM (VALUES ('auditor'), ('finance_manager'), ('general_manager')) AS permitted(role_code)
WHERE EXISTS (
  SELECT 1 FROM public.roles WHERE roles.code = permitted.role_code
)
ON CONFLICT DO NOTHING;
