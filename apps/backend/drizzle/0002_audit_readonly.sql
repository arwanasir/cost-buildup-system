
CREATE OR REPLACE FUNCTION prevent_audit_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'SRS 5.3 Compliance Violation: Records in audit_ledger cannot be updated.'
      USING ERRCODE = '27000';
  ELSIF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'SRS 5.3 Compliance Violation: Records in audit_ledger cannot be deleted.'
      USING ERRCODE = '27000';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_audit_ledger_readonly ON audit_ledger;

CREATE TRIGGER trg_audit_ledger_readonly
BEFORE UPDATE OR DELETE ON audit_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_ledger_tampering();