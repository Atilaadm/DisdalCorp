-- ============================================================
-- 007_agenda_oauth.sql
-- Integração OAuth com agendas externas (Microsoft Outlook)
-- ============================================================

-- Tabela de contas OAuth conectadas por usuário
CREATE TABLE IF NOT EXISTS agenda_contas_oauth (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id       UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  provedor         TEXT        NOT NULL, -- 'microsoft' | 'google'
  access_token     TEXT        NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  email_conta      TEXT,
  nome_conta       TEXT,
  sincronizado_em  TIMESTAMPTZ,
  ativo            BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, provedor)
);

-- Colunas de rastreamento de origem nos eventos
ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS source       TEXT DEFAULT 'local',   -- 'local' | 'microsoft' | 'google'
  ADD COLUMN IF NOT EXISTS source_id    TEXT,                   -- ID do evento no provedor externo
  ADD COLUMN IF NOT EXISTS source_owner UUID REFERENCES usuarios(id) ON DELETE SET NULL; -- usuário dono da agenda

-- Índice para evitar duplicatas na sincronização
CREATE UNIQUE INDEX IF NOT EXISTS agenda_eventos_source_uniq
  ON agenda_eventos (source, source_id)
  WHERE source != 'local' AND source_id IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS agenda_contas_oauth_updated_at ON agenda_contas_oauth;
CREATE TRIGGER agenda_contas_oauth_updated_at
  BEFORE UPDATE ON agenda_contas_oauth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE agenda_contas_oauth ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê e gerencia apenas seus próprios tokens
CREATE POLICY "Usuario gerencia seus tokens OAuth" ON agenda_contas_oauth
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Admins podem ver todos (para suporte)
CREATE POLICY "Admin ve todos os tokens OAuth" ON agenda_contas_oauth
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );
