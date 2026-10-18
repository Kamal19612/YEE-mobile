-- Suppression définitive des comptes : created_by peut être NULL
-- (groupes / institutions conservés après départ du créateur).

ALTER TABLE app_groups
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE institutions
    ALTER COLUMN created_by DROP NOT NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname, rel.relname
        FROM pg_constraint c
        JOIN pg_class rel ON rel.oid = c.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
        WHERE c.contype = 'f'
          AND nsp.nspname = current_schema()
          AND rel.relname IN ('app_groups', 'institutions')
          AND att.attname = 'created_by'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    END LOOP;
END $$;

ALTER TABLE app_groups
    ADD CONSTRAINT app_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE institutions
    ADD CONSTRAINT institutions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
