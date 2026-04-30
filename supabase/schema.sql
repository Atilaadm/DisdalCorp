-- ============================================================
-- DISDAL CORP - Schema do Banco de Dados (Supabase/PostgreSQL)
-- Seguro para re-executar: usa IF NOT EXISTS em todas as criações
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'analista_financeiro'
    CHECK (tipo IN ('administrador', 'analista_financeiro')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  responsavel TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  tipo_servico TEXT NOT NULL,
  valor_contrato DECIMAL(12,2),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  numero TEXT,
  objeto TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'vencendo', 'vencido', 'encerrado')),
  arquivo_url TEXT,
  arquivo_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contratos_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  mes_referencia TEXT,
  valor DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recessos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  descricao TEXT,
  dias_corridos INTEGER GENERATED ALWAYS AS (
    (data_fim - data_inicio + 1)
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('contrato_vencendo', 'recesso_proximo', 'nf_pendente', 'info', 'alerta')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  referencia_id UUID,
  referencia_tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNÇÕES E TRIGGERS (CREATE OR REPLACE é seguro para re-executar)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prestadores_updated_at ON public.prestadores;
CREATE TRIGGER trg_prestadores_updated_at
  BEFORE UPDATE ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_contratos_updated_at ON public.contratos;
CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_notas_fiscais_updated_at ON public.notas_fiscais;
CREATE TRIGGER trg_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: criar perfil ao cadastrar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'analista_financeiro')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função: atualizar status dos contratos
CREATE OR REPLACE FUNCTION public.atualizar_status_contratos()
RETURNS void AS $$
BEGIN
  UPDATE public.contratos
  SET status = 'vencendo'
  WHERE status = 'ativo'
    AND data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

  UPDATE public.contratos
  SET status = 'vencido'
  WHERE status IN ('ativo', 'vencendo')
    AND data_fim < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Função: gerar notificações automáticas
CREATE OR REPLACE FUNCTION public.gerar_notificacoes()
RETURNS void AS $$
DECLARE
  rec RECORD;
  mes_atual TEXT;
BEGIN
  mes_atual := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  FOR rec IN
    SELECT c.id, c.numero, p.nome_empresa, c.data_fim
    FROM public.contratos c
    JOIN public.prestadores p ON p.id = c.prestador_id
    WHERE c.status IN ('ativo', 'vencendo')
      AND c.data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.referencia_id = c.id
          AND n.tipo = 'contrato_vencendo'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO public.notificacoes (tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      'contrato_vencendo',
      'Contrato vencendo: ' || rec.nome_empresa,
      'O contrato ' || COALESCE(rec.numero, '') || ' de ' || rec.nome_empresa ||
        ' vence em ' || TO_CHAR(rec.data_fim, 'DD/MM/YYYY') || '.',
      rec.id,
      'contrato'
    );
  END LOOP;

  FOR rec IN
    SELECT p.id, p.nome_empresa
    FROM public.prestadores p
    WHERE p.status = 'ativo'
      AND EXISTS (
        SELECT 1 FROM public.contratos c
        WHERE c.prestador_id = p.id AND c.status IN ('ativo', 'vencendo')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notas_fiscais nf
        WHERE nf.prestador_id = p.id
          AND TO_CHAR(nf.data_emissao, 'YYYY-MM') = mes_atual
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.referencia_id = p.id
          AND n.tipo = 'nf_pendente'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO public.notificacoes (tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      'nf_pendente',
      'NF não registrada: ' || rec.nome_empresa,
      'O prestador ' || rec.nome_empresa || ' não possui nota fiscal registrada no mês ' ||
        TO_CHAR(CURRENT_DATE, 'MM/YYYY') || '.',
      rec.id,
      'prestador'
    );
  END LOOP;

  FOR rec IN
    SELECT r.id, p.nome_empresa, r.data_inicio, r.descricao
    FROM public.recessos r
    JOIN public.prestadores p ON p.id = r.prestador_id
    WHERE r.data_inicio BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.referencia_id = r.id
          AND n.tipo = 'recesso_proximo'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO public.notificacoes (tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      'recesso_proximo',
      'Recesso próximo: ' || rec.nome_empresa,
      rec.nome_empresa || ' entrará em recesso em ' ||
        TO_CHAR(rec.data_inicio, 'DD/MM/YYYY') ||
        COALESCE(' (' || rec.descricao || ')', '') || '.',
      rec.id,
      'recesso'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (idempotente — ALTER TABLE é seguro repetir)
-- ============================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas (DROP IF EXISTS antes de recriar para evitar conflito)
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "prestadores_all" ON public.prestadores;
CREATE POLICY "prestadores_all" ON public.prestadores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contratos_all" ON public.contratos;
CREATE POLICY "contratos_all" ON public.contratos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contratos_historico_all" ON public.contratos_historico;
CREATE POLICY "contratos_historico_all" ON public.contratos_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notas_fiscais_all" ON public.notas_fiscais;
CREATE POLICY "notas_fiscais_all" ON public.notas_fiscais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "recessos_all" ON public.recessos;
CREATE POLICY "recessos_all" ON public.recessos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notificacoes_all" ON public.notificacoes;
CREATE POLICY "notificacoes_all" ON public.notificacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE: crie o bucket manualmente no painel do Supabase
-- Storage > New Bucket > Nome: "contratos" > Public: NÃO
-- ============================================================

-- ============================================================
-- APÓS CRIAR O USUÁRIO NO AUTH, execute para torná-lo admin:
-- UPDATE public.usuarios SET tipo = 'administrador' WHERE email = 'seu@email.com';
-- ============================================================
