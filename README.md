# cost-buildup-system

## Cost Buildup for Imported Items Management System

An ERP subsystem for managing the costs of imported items, including purchase orders, shipments, customs, import costs, landed costs, and goods receiving.

## Tech Stack

* NestJS + TypeScript
* Drizzle ORM
* PostgreSQL
* Docker + Docker Compose
* MinIO
* Mailpit

## Current Progress

* Set up the project structure and Git.
* Set up Docker services for PostgreSQL, MinIO, Mailpit, and an ERP mock service.
* Set up the NestJS backend with TypeScript strict mode.
* Added environment configuration and validation.
* Added API configuration and a health check endpoint.
* Dockerized the backend and enabled hot reload.
* Set up Drizzle ORM with PostgreSQL.
* Created the main database schema and relationships based on the project requirements.
* Added database indexes, constraints, migrations, and audit logging.
* Added initial seed data for users, cost categories, policies, tariffs, and exchange rates.
* Added database migration, seed, and reset commands.

## Running Locally

Start the required services:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Start the backend:

```bash
docker compose -f docker/docker-compose.yml up backend
```

The API will be available at:

```text
http://localhost:3000/api/v1
```

Health check:

```text
http://localhost:3000/api/v1/health
```

environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}



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



{
      "idx": 2,
      "version": "7",
      "when": 1710000002000,
      "tag": "0002_audit_readonly",
      "breakpoints": true
    },