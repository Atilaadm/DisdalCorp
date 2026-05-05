import { Resend } from 'resend'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Requer RESEND_API_KEY no .env.local e na Vercel
// Sender configurável via RESEND_FROM_EMAIL (necessita domínio verificado no Resend)
// Sem configuração, notificações são silenciosamente ignoradas
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_NAME = 'DISDAL CORP — Agenda Corporativa'

// ──────────────────────────────────────────────────────────────
// Convite de evento
// ──────────────────────────────────────────────────────────────
export interface EmailConviteEvento {
  para: string[]
  titulo: string
  inicio: Date
  fim: Date
  local?: string | null
  linkReuniao?: string | null
  descricao?: string | null
  criadorNome: string
}

export async function enviarConviteEvento(params: EmailConviteEvento): Promise<void> {
  if (!resend || params.para.length === 0) return

  const { para, titulo, inicio, fim, local, linkReuniao, descricao, criadorNome } = params

  const dataHora = format(inicio, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
  const horaFim  = format(fim, 'HH:mm', { locale: ptBR })

  const html = gerarHtmlEvento({
    assunto: 'Convite para evento',
    titulo,
    dataHora: `${dataHora} – ${horaFim}`,
    local,
    linkReuniao,
    descricao,
    criadorNome,
    corDestaque: '#1A3A8A',
  })

  await enviar({ para, assunto: `📅 Convite: ${titulo}`, html })
}

// ──────────────────────────────────────────────────────────────
// Atualização de evento
// ──────────────────────────────────────────────────────────────
export interface EmailAtualizacaoEvento extends EmailConviteEvento {}

export async function enviarAtualizacaoEvento(params: EmailAtualizacaoEvento): Promise<void> {
  if (!resend || params.para.length === 0) return

  const { para, titulo, inicio, fim, local, linkReuniao, descricao, criadorNome } = params

  const dataHora = format(inicio, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
  const horaFim  = format(fim, 'HH:mm', { locale: ptBR })

  const html = gerarHtmlEvento({
    assunto: 'Evento atualizado',
    titulo,
    dataHora: `${dataHora} – ${horaFim}`,
    local,
    linkReuniao,
    descricao,
    criadorNome,
    corDestaque: '#009B94',
  })

  await enviar({ para, assunto: `✏️ Atualização: ${titulo}`, html })
}

// ──────────────────────────────────────────────────────────────
// Lembrete de evento
// ──────────────────────────────────────────────────────────────
export async function enviarLembreteEvento(params: Omit<EmailConviteEvento, 'criadorNome'> & { minutosRestantes: number }): Promise<void> {
  if (!resend || params.para.length === 0) return

  const { para, titulo, inicio, fim, local, linkReuniao, minutosRestantes } = params

  const dataHora = format(inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const horaFim  = format(fim, 'HH:mm', { locale: ptBR })

  const html = gerarHtmlEvento({
    assunto: `Lembrete: em ${minutosRestantes} minuto(s)`,
    titulo,
    dataHora: `${dataHora} – ${horaFim}`,
    local,
    linkReuniao,
    descricao: null,
    criadorNome: '',
    corDestaque: '#C8D42A',
    corTextoDestaque: '#1A3A8A',
  })

  await enviar({ para, assunto: `⏰ Lembrete: ${titulo} em ${minutosRestantes}min`, html })
}

// ──────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────
async function enviar({ para, assunto, html }: { para: string[]; assunto: string; html: string }) {
  try {
    await resend!.emails.send({ from: FROM, to: para, subject: assunto, html })
  } catch (err) {
    // Falha de email não deve bloquear a operação principal
    console.error('[email] Erro ao enviar:', err)
  }
}

interface HtmlParams {
  assunto: string
  titulo: string
  dataHora: string
  local?: string | null
  linkReuniao?: string | null
  descricao?: string | null
  criadorNome: string
  corDestaque: string
  corTextoDestaque?: string
}

function gerarHtmlEvento(p: HtmlParams): string {
  const corTexto = p.corTextoDestaque ?? '#ffffff'
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:${p.corDestaque};padding:24px 32px;">
          <p style="margin:0;color:${corTexto};font-size:13px;opacity:.8;">${APP_NAME}</p>
          <h1 style="margin:8px 0 0;color:${corTexto};font-size:20px;">${p.assunto}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 20px;color:#111827;font-size:18px;">📅 ${p.titulo}</h2>

          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px;">Data/hora</td>
              <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${p.dataHora}</td>
            </tr>
            ${p.local ? `<tr>
              <td style="padding:8px 0;color:#6b7280;font-size:13px;">Local</td>
              <td style="padding:8px 0;color:#111827;font-size:13px;">${p.local}</td>
            </tr>` : ''}
            ${p.linkReuniao ? `<tr>
              <td style="padding:8px 0;color:#6b7280;font-size:13px;">Link</td>
              <td style="padding:8px 0;font-size:13px;"><a href="${p.linkReuniao}" style="color:${p.corDestaque};">${p.linkReuniao}</a></td>
            </tr>` : ''}
            ${p.criadorNome ? `<tr>
              <td style="padding:8px 0;color:#6b7280;font-size:13px;">Organizado por</td>
              <td style="padding:8px 0;color:#111827;font-size:13px;">${p.criadorNome}</td>
            </tr>` : ''}
          </table>

          ${p.descricao ? `<div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px;border-left:3px solid ${p.corDestaque};">
            <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">${p.descricao}</p>
          </div>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Este é um e-mail automático enviado pelo sistema DISDAL CORP.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
