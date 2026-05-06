// Utilitários para Microsoft Graph API (OAuth2 + Calendar)

const CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID!
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!
const TENANT_ID     = process.env.MICROSOFT_TENANT_ID ?? 'common'
const REDIRECT_URI  = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://disdal-corp.vercel.app'}/api/agenda/oauth/microsoft/callback`

const SCOPES = ['Calendars.ReadWrite', 'offline_access', 'User.Read'].join(' ')

// ── URLs ──────────────────────────────────────────────────────
const AUTH_URL  = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
const GRAPH_URL = 'https://graph.microsoft.com/v1.0'

// ──────────────────────────────────────────────────────────────
// OAuth: URL de autorização
// ──────────────────────────────────────────────────────────────
export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    redirect_uri:  REDIRECT_URI,
    response_mode: 'query',
    scope:         SCOPES,
    state,
    prompt:        'select_account',
  })
  return `${AUTH_URL}?${params}`
}

// ──────────────────────────────────────────────────────────────
// OAuth: troca code por tokens
// ──────────────────────────────────────────────────────────────
export interface MicrosoftTokens {
  access_token:  string
  refresh_token: string | null
  expires_in:    number
  token_type:    string
}

export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao trocar code: ${err}`)
  }
  return res.json()
}

// ──────────────────────────────────────────────────────────────
// OAuth: renovar access_token com refresh_token
// ──────────────────────────────────────────────────────────────
export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
      scope:         SCOPES,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao renovar token: ${err}`)
  }
  return res.json()
}

// ──────────────────────────────────────────────────────────────
// Graph: perfil do usuário
// ──────────────────────────────────────────────────────────────
export async function getMicrosoftUserProfile(accessToken: string) {
  const res = await fetch(`${GRAPH_URL}/me?$select=displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Erro ao buscar perfil do usuário')
  return res.json() as Promise<{ displayName: string; mail: string; userPrincipalName: string }>
}

// ──────────────────────────────────────────────────────────────
// Graph: buscar eventos do calendário
// ──────────────────────────────────────────────────────────────
export interface MicrosoftCalendarEvent {
  id:      string
  subject: string
  body:    { content: string; contentType: string }
  start:   { dateTime: string; timeZone: string }
  end:     { dateTime: string; timeZone: string }
  location?: { displayName: string }
  onlineMeeting?: { joinUrl: string }
  isAllDay: boolean
  sensitivity: string
  organizer: { emailAddress: { name: string; address: string } }
}

export async function getMicrosoftCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<MicrosoftCalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: startDate.toISOString(),
    endDateTime:   endDate.toISOString(),
    $select:       'id,subject,body,start,end,location,onlineMeeting,isAllDay,organizer',
    $orderby:      'start/dateTime',
    $top:          '100',
  })

  const res = await fetch(`${GRAPH_URL}/me/calendarView?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer:        'outlook.timezone="America/Sao_Paulo"',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao buscar eventos: ${err}`)
  }

  const data = await res.json()
  return data.value ?? []
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
export function calcularExpiresAt(expiresIn: number): Date {
  return new Date(Date.now() + (expiresIn - 60) * 1000) // -60s de margem
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}
