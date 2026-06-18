import { supabase, isSupabaseConfigured } from './supabase'

export interface ClientData {
  id: string
  name: string
  phone: string
  age?: string
  occupation?: string
  height?: string
  weight?: string
  shoulder_width?: string
  waist_size?: string
  pant_length?: string
  shoe_size?: string
  body_type?: string
  body_remark?: string
  pain_point?: string
  favorite_style?: string
  purpose?: string
  lifestyle?: string
  desired_effect?: string
  budget?: string
  plan: string
  plan_price: number
  amount_paid: number
  balance_due: number
  pic?: string
  before_photo?: string
  seasonal_type?: string
  suitable_colors?: string[]
  avoid_colors?: string[]
  materials?: string[]
  metals?: string[]
  glasses?: string
  watch?: string
  color_strategy?: string
  neutral_colors?: string[]
  color_notes?: string
  status: string
  created_at?: string
}

export interface ServiceItem {
  id?: string
  client_id?: string
  service_id: string
  name: string
  count: number
}

export interface UserAccount {
  id: string
  phone: string
  password: string
  name: string
  role?: string
}

export interface ServiceSession {
  id?: string
  client_id: string
  service_id: string
  date: string
  time: string
  location: string
  staff: string
  status: 'scheduled' | 'completed' | 'cancelled'
  completed_at?: string
  notes?: string
}

const STORAGE_KEYS = {
  clients: 'a2o_clients',
  services: 'a2o_services',
  sessions: 'a2o_sessions',
  users: 'a2o_users_custom',
  login: 'a2o_login_user',
}

function getJson<T = any[]>(key: string): T {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] as T }
}

function setJson(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

function genId() {
  return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function getAllClients(): Promise<ClientData[]> {
  if (!isSupabaseConfigured()) return getJson<ClientData[]>(STORAGE_KEYS.clients)

  try {
    const query = supabase
      .from('clients')
      .select('id,name,phone,age,occupation,height,weight,shoulder_width,waist_size,pant_length,shoe_size,body_type,body_remark,pain_point,favorite_style,purpose,lifestyle,desired_effect,budget,plan,plan_price,amount_paid,balance_due,pic,seasonal_type,suitable_colors,avoid_colors,materials,metals,glasses,watch,color_strategy,neutral_colors,color_notes,status,created_at')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: ClientData[] | null; error: any }>

    const { data, error } = await query
    if (error) {
      console.error('getAllClients error:', error)
      return getJson<ClientData[]>(STORAGE_KEYS.clients)
    }

    const clients = data || []
    setJson(STORAGE_KEYS.clients, clients)
    return clients
  } catch (error) {
    console.error('getAllClients exception:', error)
    return getJson<ClientData[]>(STORAGE_KEYS.clients)
  }
}

export async function getClientByPhone(phone: string): Promise<ClientData | null> {
  const clean = phone.replace(/^\+852/, '').replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    return getJson<ClientData[]>(STORAGE_KEYS.clients).find(c => c.phone.replace(/^\+852/, '').replace(/\s/g, '') === clean) || null
  }

  const { data, error } = await supabase.from('clients').select('*').ilike('phone', '%' + clean + '%').limit(1)
  if (error) {
    console.error('getClientByPhone error:', error)
    return null
  }
  return ((data || [])[0] || null) as ClientData | null
}

export async function getClientById(id: string): Promise<ClientData | null> {
  if (!isSupabaseConfigured()) return getJson<ClientData[]>(STORAGE_KEYS.clients).find(c => c.id === id) || null
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.error('getClientById error:', error)
    return null
  }
  return data as ClientData | null
}

export async function saveClient(data: Partial<ClientData>): Promise<ClientData> {
  const id = data.id || genId()
  const payload = { ...data, id, updated_at: new Date().toISOString() }

  if (!isSupabaseConfigured()) {
    const clients = getJson<ClientData[]>(STORAGE_KEYS.clients)
    const index = clients.findIndex(c => c.id === id)
    const client = { ...(index >= 0 ? clients[index] : {}), ...payload, status: payload.status || 'active' } as ClientData
    if (index >= 0) clients[index] = client
    else clients.push(client)
    setJson(STORAGE_KEYS.clients, clients)
    return client
  }

  const { data: existing } = await supabase.from('clients').select('id').eq('id', id).maybeSingle()
  const result = existing
    ? await supabase.from('clients').update(payload).eq('id', id).select().maybeSingle()
    : await supabase.from('clients').insert({ ...payload, created_at: new Date().toISOString() }).select().maybeSingle()

  if (result.error) throw result.error
  return result.data as ClientData
}

export async function getClientServices(clientId: string): Promise<ServiceItem[]> {
  if (!isSupabaseConfigured()) return getJson<ServiceItem[]>(STORAGE_KEYS.services).filter(s => s.client_id === clientId)
  const { data, error } = await supabase.from('services').select('*').eq('client_id', clientId)
  if (error) {
    console.error('getClientServices error:', error)
    return getJson<ServiceItem[]>(STORAGE_KEYS.services).filter(s => s.client_id === clientId)
  }
  return (data || []) as ServiceItem[]
}

export async function saveClientServices(clientId: string, services: ServiceItem[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    const other = getJson<ServiceItem[]>(STORAGE_KEYS.services).filter(s => s.client_id !== clientId)
    setJson(STORAGE_KEYS.services, [...other, ...services.map(s => ({ ...s, client_id: clientId, id: s.id || genId() }))])
    return
  }
  await supabase.from('services').delete().eq('client_id', clientId)
  if (services.length) {
    const { error } = await supabase.from('services').insert(services.map(s => ({ ...s, client_id: clientId, id: s.id || genId() })))
    if (error) console.error('saveClientServices error:', error)
  }
}

export async function getServiceSessions(clientId: string): Promise<ServiceSession[]> {
  if (!isSupabaseConfigured()) return getJson<ServiceSession[]>(STORAGE_KEYS.sessions).filter(s => s.client_id === clientId)
  const { data, error } = await supabase.from('service_sessions').select('*').eq('client_id', clientId).order('date')
  if (error) {
    console.error('getServiceSessions error:', error)
    return getJson<ServiceSession[]>(STORAGE_KEYS.sessions).filter(s => s.client_id === clientId)
  }
  return (data || []) as ServiceSession[]
}

export async function saveServiceSession(session: ServiceSession): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const all = getJson<ServiceSession[]>(STORAGE_KEYS.sessions)
    const id = session.id || genId()
    const next = { ...session, id }
    const index = all.findIndex(s => s.id === id)
    if (index >= 0) all[index] = next
    else all.push(next)
    setJson(STORAGE_KEYS.sessions, all)
    return true
  }

  const result = session.id
    ? await supabase.from('service_sessions').update(session).eq('id', session.id)
    : await supabase.from('service_sessions').insert({ ...session, id: crypto?.randomUUID ? crypto.randomUUID() : genId() })

  if (result.error) console.error('saveServiceSession error:', result.error)
  return true
}

export async function deleteServiceSession(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    setJson(STORAGE_KEYS.sessions, getJson<ServiceSession[]>(STORAGE_KEYS.sessions).filter(s => s.id !== sessionId))
    return true
  }
  const { error } = await supabase.from('service_sessions').delete().eq('id', sessionId)
  if (error) console.error('deleteServiceSession error:', error)
  return true
}

export async function registerUser(user: Omit<UserAccount, 'id'>): Promise<UserAccount | null> {
  const cleanPhone = user.phone.replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    const users = getJson<UserAccount[]>(STORAGE_KEYS.users)
    if (users.some(u => u.phone.replace(/\s/g, '') === cleanPhone)) return null
    const newUser = { ...user, id: 'u_' + Date.now(), role: 'client' }
    users.push(newUser)
    setJson(STORAGE_KEYS.users, users)
    return newUser
  }

  const { data: existing, error: existsError } = await supabase.from('users_custom').select('phone').eq('phone', cleanPhone).maybeSingle()
  if (existsError) throw new Error('查詢失敗：' + existsError.message)
  if (existing) return null

  const { data, error } = await supabase.from('users_custom').insert({
    id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    phone: cleanPhone,
    password: user.password,
    name: user.name,
    role: 'client',
  }).select().maybeSingle()

  if (error) throw new Error('註冊失敗：' + error.message)
  return data as UserAccount
}

export async function loginUser(phone: string, password: string): Promise<UserAccount | null> {
  const cleanPhone = phone.replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    const user = getJson<UserAccount[]>(STORAGE_KEYS.users).find(u => {
      const a = u.phone.replace(/^\+852/, '').replace(/\s/g, '')
      const b = cleanPhone.replace(/^\+852/, '')
      return (a === b || u.phone.replace(/\s/g, '') === cleanPhone) && u.password === password
    })
    if (user) localStorage.setItem(STORAGE_KEYS.login, JSON.stringify(user))
    return user || null
  }

  const { data, error } = await supabase.from('users_custom').select('*').eq('phone', cleanPhone).eq('password', password).maybeSingle()
  if (error) throw new Error('登入查詢失敗：' + error.message)
  if (data) localStorage.setItem(STORAGE_KEYS.login, JSON.stringify(data))
  return data as UserAccount | null
}

export function getLoggedInUser(): UserAccount | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.login) || 'null') } catch { return null }
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.login)
}

export function verifyStaff(pin: string): boolean {
  return pin === ['a2o', '2026'].join('')
}

export async function verifyStaffDb(pin: string): Promise<{ name: string; role: string } | null> {
  if (!isSupabaseConfigured()) return verifyStaff(pin) ? { name: 'Admin', role: 'admin' } : null
  const { data, error } = await supabase.from('staff_profiles').select('*').eq('pin', pin).maybeSingle()
  if (error || !data) return null
  return { name: data.name, role: data.role }
}

export const SEASON_PRESETS: Record<string, {
  suitable: string[]
  avoid: string[]
  materials: string[]
  metals: string[]
  glasses: string
  watch: string
  strategy: string
  neutral: string[]
}> = {}
