DELETE FROM "role_permissions"
WHERE "role_code" = 'warehouse_manager'
  AND "permission_code" = 'cost:read';
