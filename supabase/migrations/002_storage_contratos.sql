-- Criar bucket público para contratos (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos',
  'contratos',
  true,
  10485760,  -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- Políticas de acesso ao Storage
DROP POLICY IF EXISTS "contratos_upload" ON storage.objects;
CREATE POLICY "contratos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_read" ON storage.objects;
CREATE POLICY "contratos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_delete" ON storage.objects;
CREATE POLICY "contratos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_update" ON storage.objects;
CREATE POLICY "contratos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contratos');
