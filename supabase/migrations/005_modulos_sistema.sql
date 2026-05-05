-- ============================================================
-- 005_modulos_sistema.sql
-- Estrutura modular ERP: tabelas modulos e usuario_modulos
-- ============================================================

-- Tabela de módulos do sistema
CREATE TABLE IF NOT EXISTS modulos (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  descricao   TEXT,
  icone       TEXT        DEFAULT 'Package',
  ativo       BOOLEAN     DEFAULT true,
  ordem       INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tabela de acesso de usuários a módulos (N:M)
CREATE TABLE IF NOT EXISTS usuario_modulos (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id   UUID        NOT NULL REFERENCES modulos(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, modulo_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE modulos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_modulos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler módulos ativos
CREATE POLICY "Autenticados leem modulos" ON modulos
  FOR SELECT TO authenticated USING (true);

-- Apenas administradores gerenciam módulos
CREATE POLICY "Admins gerenciam modulos" ON modulos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

-- Usuários veem seus próprios módulos; admins veem todos
CREATE POLICY "Leitura de usuario_modulos" ON usuario_modulos
  FOR SELECT TO authenticated USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

-- Apenas admins inserem vínculos de módulo
CREATE POLICY "Admins inserem usuario_modulos" ON usuario_modulos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

-- Apenas admins deletam vínculos de módulo
CREATE POLICY "Admins deletam usuario_modulos" ON usuario_modulos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

-- ============================================================
-- Seed: primeiro módulo do ERP
-- ============================================================

INSERT INTO modulos (nome, slug, descricao, icone, ordem) VALUES
  (
    'Administração de Prestadores de Serviço',
    'prestadores',
    'Gestão de prestadores PJ, contratos, financeiro e recessos',
    'Users',
    1
  )
ON CONFLICT (slug) DO NOTHING;
