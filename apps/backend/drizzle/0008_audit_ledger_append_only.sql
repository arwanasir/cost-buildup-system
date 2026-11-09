ALTER TABLE public.audit_ledger
  DROP CONSTRAINT IF EXISTS audit_ledger_actor_id_users_id_fk;
--> statement-breakpoint

ALTER TABLE public.audit_ledger
  ADD CONSTRAINT audit_ledger_actor_id_users_id_fk
  FOREIGN KEY (actor_id)
  REFERENCES public.users(id)
  ON DELETE RESTRICT
  ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.prevent_audit_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_ledger is append-only; % is prohibited', TG_OP
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER audit_ledger_prevent_update_delete
BEFORE UPDATE OR DELETE ON public.audit_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_ledger_mutation();
--> statement-breakpoint

CREATE TRIGGER audit_ledger_prevent_truncate
BEFORE TRUNCATE ON public.audit_ledger
FOR EACH STATEMENT
EXECUTE FUNCTION public.prevent_audit_ledger_mutation();
