# DISDAL CORP — Guia de Instalação e Configuração

## Pré-requisitos
- Node.js 18+ instalado (https://nodejs.org)
- Conta gratuita no Supabase (https://supabase.com)
- Conta gratuita na Vercel (https://vercel.com)
- Git instalado

---

## PASSO 1 — Criar o projeto no Supabase

1. Acesse **https://supabase.com** e faça login ou crie uma conta
2. Clique em **"New Project"**
3. Defina:
   - **Nome**: `disdal-corp`
   - **Senha do banco**: anote em local seguro
   - **Região**: South America (São Paulo)
4. Aguarde alguns minutos até o projeto ser criado

---

## PASSO 2 — Configurar o banco de dados

1. No painel do Supabase, clique em **"SQL Editor"** (menu lateral)
2. Clique em **"New query"**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Copie **todo o conteúdo** e cole no SQL Editor
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde a confirmação de sucesso

---

## PASSO 3 — Configurar o Storage (para PDFs dos contratos)

1. No painel do Supabase, clique em **"Storage"** (menu lateral)
2. Clique em **"New bucket"**
3. Configure:
   - **Name**: `contratos`
   - **Public bucket**: deixe DESMARCADO (privado)
4. Clique em **"Create bucket"**
5. Na aba **"Policies"** do bucket, clique em **"New policy"**
6. Selecione **"For full customization"** e configure:
   - **Policy name**: `auth_users_contratos`
   - **Allowed operation**: ALL
   - **Target roles**: `authenticated`
   - **USING expression**: `true`
7. Salve a política

---

## PASSO 4 — Obter as credenciais do Supabase

1. No painel do Supabase, vá em **Settings > API**
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public** key (chave pública)

---

## PASSO 5 — Configurar o projeto localmente

1. Abra o terminal na pasta do projeto
2. Copie o arquivo de variáveis:
   ```
   copy .env.example .env.local
   ```
3. Abra o arquivo `.env.local` e preencha com os dados do Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
   CRON_SECRET=qualquer-string-secreta-aqui
   ```

---

## PASSO 6 — Instalar dependências e executar localmente

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
```

4. Acesse **http://localhost:3000**

---

## PASSO 7 — Criar o primeiro usuário (Administrador)

1. No painel do Supabase, vá em **Authentication > Users**
2. Clique em **"Add user" > "Create new user"**
3. Preencha:
   - **Email**: seu e-mail de administrador
   - **Password**: uma senha segura
4. Após criar o usuário, vá em **SQL Editor** e execute:
   ```sql
   UPDATE public.usuarios 
   SET tipo = 'administrador' 
   WHERE email = 'seu@email.com';
   ```

### Para criar usuários adicionais:
```sql
-- Repita para cada usuário adicional
UPDATE public.usuarios 
SET tipo = 'analista_financeiro' 
WHERE email = 'analista@empresa.com';
```

---

## PASSO 8 — Deploy na Vercel (produção)

### 8.1 — Subir o código para o GitHub

```bash
git init
git add .
git commit -m "Initial commit - DISDAL CORP"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/disdal-corp.git
git push -u origin main
```

### 8.2 — Conectar à Vercel

1. Acesse **https://vercel.com** e faça login com sua conta GitHub
2. Clique em **"New Project"**
3. Selecione o repositório `disdal-corp`
4. Na tela de configuração, adicione as **variáveis de ambiente**:
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Chave anon do Supabase
   - `CRON_SECRET` → String secreta para o cron
5. Clique em **"Deploy"**
6. Aguarde o deploy (2-5 minutos)
7. Acesse a URL gerada pela Vercel (ex: `disdal-corp.vercel.app`)

---

## PASSO 9 — Configurar notificações automáticas (Cron)

Para que as notificações sejam geradas automaticamente todo dia:

1. Acesse **https://cron-job.org** (gratuito)
2. Crie uma conta
3. Clique em **"Create cronjob"**
4. Configure:
   - **URL**: `https://SEU-APP.vercel.app/api/notificacoes/gerar?secret=SUA-CRON-SECRET`
   - **Schedule**: Todos os dias às 08:00 (expression: `0 8 * * *`)
5. Salve e ative

Isso vai:
- Atualizar status de contratos vencendo/vencidos
- Gerar alertas de contratos próximos ao vencimento
- Notificar sobre NFs não registradas no mês
- Alertar sobre recessos próximos

---

## Estrutura do projeto

```
disdal-corp/
├── app/
│   ├── (dashboard)/          # Páginas protegidas
│   │   ├── page.tsx          # Dashboard
│   │   ├── prestadores/      # Módulo prestadores
│   │   ├── contratos/        # Módulo contratos
│   │   ├── financeiro/       # Módulo notas fiscais
│   │   ├── recessos/         # Módulo recessos
│   │   └── notificacoes/     # Módulo notificações
│   ├── login/                # Página de login
│   ├── api/                  # API Routes
│   └── layout.tsx
├── components/
│   ├── layout/               # Sidebar, Header
│   └── ui/                   # Componentes reutilizáveis
├── lib/
│   ├── supabase/             # Cliente Supabase
│   └── utils.ts              # Funções auxiliares
├── supabase/
│   └── schema.sql            # Schema do banco
└── middleware.ts             # Proteção de rotas
```

---

## Tipos de usuário

| Tipo | Acesso |
|------|--------|
| **Administrador** | Acesso total ao sistema |
| **Analista Financeiro** | Acesso a todas as telas |

> Para mudar o tipo de um usuário, use o SQL Editor do Supabase:
> ```sql
> UPDATE public.usuarios SET tipo = 'administrador' WHERE email = 'email@exemplo.com';
> ```

---

## Solução de problemas comuns

### Erro "Invalid API key"
- Verifique se as variáveis de ambiente estão corretas no `.env.local`
- Reinicie o servidor com `npm run dev`

### Erro ao fazer login
- Verifique se o usuário foi criado no Supabase Authentication
- Verifique se o e-mail e senha estão corretos

### Upload de PDF não funciona
- Verifique se o bucket `contratos` foi criado no Supabase Storage
- Verifique se a política de acesso foi configurada corretamente

### Notificações não são geradas
- Verifique se as funções SQL foram executadas corretamente
- Clique no botão "Verificar" na página de Notificações para gerar manualmente

---

## Suporte

Em caso de dúvidas:
- Documentação do Supabase: https://supabase.com/docs
- Documentação do Next.js: https://nextjs.org/docs
- Documentação da Vercel: https://vercel.com/docs
