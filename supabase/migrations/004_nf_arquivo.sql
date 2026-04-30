-- Adicionar colunas de arquivo na tabela notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS arquivo_url  TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_nome TEXT;

-- Criar bucket para anexos de NF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notas-fiscais',
  'notas-fiscais',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Políticas de acesso
DROP POLICY IF EXISTS "nfs_upload"  ON storage.objects;
CREATE POLICY "nfs_upload"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "nfs_read"    ON storage.objects;
CREATE POLICY "nfs_read"    ON storage.objects FOR SELECT USING (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "nfs_delete"  ON storage.objects;
CREATE POLICY "nfs_delete"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "nfs_update"  ON storage.objects;
CREATE POLICY "nfs_update"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'notas-fiscais');
