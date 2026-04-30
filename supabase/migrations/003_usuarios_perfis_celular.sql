-- Remover constraint antiga de tipo (nome gerado automaticamente pelo Postgres)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT con.conname INTO v_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'usuarios'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%tipo%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.usuarios DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

-- Adicionar nova constraint com todos os perfis
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_tipo_check
  CHECK (tipo IN ('administrador', 'analista_financeiro', 'coordenador', 'gerente', 'supervisor', 'diretor'));

-- Adicionar campo celular
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS celular TEXT;
