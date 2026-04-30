-- Adicionar campos de bônus na tabela prestadores
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS valor_bonus DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS regra_pagamento_bonus TEXT
    CHECK (regra_pagamento_bonus IN ('mensal', 'trimestral', 'semestral', 'anual'));
