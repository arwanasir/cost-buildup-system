UPDATE public.cost_categories
SET default_allocation_method = 'by_value'
WHERE code IN ('STORAGE', 'DEMURRAGE')
  AND default_allocation_method IS DISTINCT FROM 'by_value';
