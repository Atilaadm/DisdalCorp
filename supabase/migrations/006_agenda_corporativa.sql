-- ============================================================
-- 006_agenda_corporativa.sql
-- Módulo: Agenda Corporativa
-- ============================================================

-- Registrar módulo no ERP
INSERT INTO modulos (nome, slug, descricao, icone, ordem) VALUES
  ('Agenda Corporativa', 'agenda', 'Gestão unificada de agendas de diretores e gerentes', 'CalendarDays', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE agenda_tipo_evento AS ENUM ('reuniao', 'compromisso', 'viagem', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agenda_status_participante AS ENUM ('pendente', 'aceito', 'recusado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tabelas
-- ============================================================

CREATE TABLE IF NOT EXISTS agenda_eventos (
  id            UUID                      DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo        TEXT                      NOT NULL,
  descricao     TEXT,
  local         TEXT,
  link_reuniao  TEXT,
  inicio        TIMESTAMPTZ               NOT NULL,
  fim           TIMESTAMPTZ               NOT NULL,
  dia_inteiro   BOOLEAN                   DEFAULT false,
  tipo          agenda_tipo_evento        DEFAULT 'reuniao',
  cor           TEXT                      DEFAULT '#1A3A8A',
  criado_por    UUID                      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ               DEFAULT now(),
  updated_at    TIMESTAMPTZ               DEFAULT now(),
  CONSTRAINT fim_apos_inicio CHECK (fim >= inicio)
);

CREATE TABLE IF NOT EXISTS agenda_participantes (
  id             UUID                        DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id      UUID                        NOT NULL REFERENCES agenda_eventos(id) ON DELETE CASCADE,
  usuario_id     UUID                        REFERENCES usuarios(id) ON DELETE CASCADE,
  email_externo  TEXT,
  nome_externo   TEXT,
  status         agenda_status_participante  DEFAULT 'pendente',
  created_at     TIMESTAMPTZ                 DEFAULT now(),
  UNIQUE (evento_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS agenda_preferencias (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id          UUID        NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  notif_email         BOOLEAN     DEFAULT true,
  lembrete_minutos    INTEGER     DEFAULT 60,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS agenda_eventos_updated_at ON agenda_eventos;
CREATE TRIGGER agenda_eventos_updated_at
  BEFORE UPDATE ON agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE agenda_eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_preferencias  ENABLE ROW LEVEL SECURITY;

-- Eventos: todos autenticados leem
CREATE POLICY "Autenticados leem eventos" ON agenda_eventos
  FOR SELECT TO authenticated USING (true);

-- Eventos: qualquer autenticado cria
CREATE POLICY "Autenticados criam eventos" ON agenda_eventos
  FOR INSERT TO authenticated WITH CHECK (true);

-- Eventos: criador ou admin atualiza/deleta
CREATE POLICY "Criador ou admin atualiza evento" ON agenda_eventos
  FOR UPDATE TO authenticated USING (
    criado_por = auth.uid() OR
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

CREATE POLICY "Criador ou admin deleta evento" ON agenda_eventos
  FOR DELETE TO authenticated USING (
    criado_por = auth.uid() OR
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
  );

-- Participantes: todos autenticados leem e gerenciam
CREATE POLICY "Autenticados gerenciam participantes" ON agenda_participantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Preferências: cada usuário gerencia as suas
CREATE POLICY "Usuario gerencia suas preferencias" ON agenda_preferencias
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
