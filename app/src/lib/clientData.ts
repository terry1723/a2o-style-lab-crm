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

// ────────────── LOCALSTORAGE FALLBACK ──────────────
const STORAGE_KEYS = {
  clients: 'a2o_clients',
  services: 'a2o_services',
  users: 'a2o_users_custom',
  login: 'a2o_login_user',
}
function getJson(key: string) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function setJson(key: string, data: any) { localStorage.setItem(key, JSON.stringify(data)) }
function genId() { return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36) }

// ────────────── SUPABASE CLIENTS API ──────────────
export async function getAllClients(): Promise<ClientData[]> {
  if (!isSupabaseConfigured()) return getJson(STORAGE_KEYS.clients)

  try {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    const cachedClients = getJson(STORAGE_KEYS.clients) as ClientData[]

    if (error) {
      console.error('getAllClients error:', error)
      return cachedClients
    }

    const clients = data || []
    setJson(STORAGE_KEYS.clients, clients)
    return clients
  } catch (error) {
    console.error('getAllClients exception:', error)
    return getJson(STORAGE_KEYS.clients)
  }
}

export async function getClientByPhone(phone: string): Promise<ClientData | null> {
  const clean = phone.replace(/^\+852/, '').replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    return getJson(STORAGE_KEYS.clients).find((c: ClientData) => {
      const cPhone = c.phone.replace(/^\+852/, '').replace(/\s/g, '')
      return cPhone === clean
    }) || null
  }
  // Try exact match first, then partial
  let { data, error } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle()
  if (!data && !error) {
    ({ data, error } = await supabase.from('clients').select('*').eq('phone', '+852' + clean).maybeSingle())
  }
  if (!data && !error) {
    ({ data } = await supabase.from('clients').select('*').ilike('phone', '%' + clean + '%').limit(1))
    if (data && data.length > 0) data = data[0]
  }
  if (error && error.code !== 'PGRST116') { console.error('getClientByPhone error:', error); return null }
  return data || null
}

export async function getClientById(id: string): Promise<ClientData | null> {
  if (!isSupabaseConfigured()) return getJson(STORAGE_KEYS.clients).find((c: ClientData) => c.id === id) || null
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') { console.error('getClientById error:', error); return null }
  return data || null
}

export async function saveClient(data: Partial<ClientData>): Promise<ClientData> {
  const id = data.id || genId()
  const payload = { ...data, id, updated_at: new Date().toISOString() }

  if (!isSupabaseConfigured()) {
    const clients = getJson(STORAGE_KEYS.clients)
    const idx = clients.findIndex((c: ClientData) => c.id === id)
    const existing = idx >= 0 ? clients[idx] : {}
    const client: ClientData = { ...existing, ...payload, status: payload.status || 'active' }
    if (idx >= 0) clients[idx] = client
    else clients.push(client)
    setJson(STORAGE_KEYS.clients, clients)
    return client
  }

  // Check if exists
  const { data: existing } = await supabase.from('clients').select('id').eq('id', id).maybeSingle()
  let result
  if (existing) {
    const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().maybeSingle()
    if (error) { console.error('saveClient update error:', error); throw error }
    result = data
  } else {
    const { data, error } = await supabase.from('clients').insert({ ...payload, created_at: new Date().toISOString() }).select().maybeSingle()
    if (error) { console.error('saveClient insert error:', error); throw error }
    result = data
  }
  return result
}

// ────────────── SUPABASE SERVICES API ──────────────
export async function getClientServices(clientId: string): Promise<ServiceItem[]> {
  if (!isSupabaseConfigured()) return getJson(STORAGE_KEYS.services).filter((s: any) => s.client_id === clientId)
  try {
    const { data, error } = await supabase.from('services').select('*').eq('client_id', clientId)
    if (error) {
      console.error('getClientServices error:', error)
      // Fallback to localStorage
      return getJson(STORAGE_KEYS.services).filter((s: any) => s.client_id === clientId)
    }
    return data || []
  } catch (e) {
    console.error('getClientServices exception:', e)
    return getJson(STORAGE_KEYS.services).filter((s: any) => s.client_id === clientId)
  }
}

export async function saveClientServices(clientId: string, services: ServiceItem[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = getJson(STORAGE_KEYS.services).filter((s: any) => s.client_id !== clientId)
    const newServices = services.map(s => ({ ...s, client_id: clientId, id: s.id || genId() }))
    setJson(STORAGE_KEYS.services, [...all, ...newServices])
    return
  }
  // Delete existing then insert new
  await supabase.from('services').delete().eq('client_id', clientId)
  if (services.length > 0) {
    const { error } = await supabase.from('services').insert(
      services.map(s => ({ ...s, client_id: clientId, id: s.id || genId() }))
    )
    if (error) console.error('saveClientServices error:', error)
  }
}

// ────────────── SERVICE SESSIONS (Appointments) ──────────────
export interface ServiceSession {
  id?: string
  client_id: string
  service_id: string
  date: string        // e.g. "2025/6/15"
  time: string        // e.g. "14:00"
  location: string    // e.g. "荔枝角億利工業中心204"
  staff: string       // e.g. "Jerry"
  status: 'scheduled' | 'completed' | 'cancelled'
  completed_at?: string
  notes?: string
}

const SESSIONS_KEY = 'a2o_sessions'

export async function getServiceSessions(clientId: string): Promise<ServiceSession[]> {
  if (!isSupabaseConfigured()) {
    return getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.client_id === clientId)
  }
  try {
    const { data, error } = await supabase.from('service_sessions').select('*').eq('client_id', clientId).order('date')
    if (error) {
      console.error('getServiceSessions error:', error)
      return getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.client_id === clientId)
    }
    return data || []
  } catch (e) {
    console.error('getServiceSessions exception:', e)
    return getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.client_id === clientId)
  }
}

export async function saveServiceSession(session: ServiceSession): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const all = getJson(SESSIONS_KEY) as ServiceSession[]
    const idx = all.findIndex(s => s.id === session.id)
    const newSession = { ...session, id: session.id || genId() }
    if (idx >= 0) all[idx] = newSession
    else all.push(newSession)
    setJson(SESSIONS_KEY, all)
    return true
  }
  try {
    if (session.id) {
      const { error } = await supabase.from('service_sessions').update(session).eq('id', session.id)
      if (error) {
        console.error('saveServiceSession update error:', error)
        // Fallback to localStorage on error
        const all = getJson(SESSIONS_KEY) as ServiceSession[]
        const idx = all.findIndex(s => s.id === session.id)
        if (idx >= 0) all[idx] = session
        else all.push(session)
        setJson(SESSIONS_KEY, all)
        return true
      }
    } else {
      const newId = crypto?.randomUUID ? crypto.randomUUID() : genId()
      const { error } = await supabase.from('service_sessions').insert({ ...session, id: newId })
      if (error) {
        console.error('saveServiceSession insert error:', error)
        // Fallback to localStorage on error
        const all = getJson(SESSIONS_KEY) as ServiceSession[]
        all.push({ ...session, id: newId })
        setJson(SESSIONS_KEY, all)
        return true
      }
    }
    return true
  } catch (e) {
    console.error('saveServiceSession exception:', e)
    // Emergency fallback to localStorage
    const all = getJson(SESSIONS_KEY) as ServiceSession[]
    all.push({ ...session, id: session.id || genId() })
    setJson(SESSIONS_KEY, all)
    return true
  }
}

export async function deleteServiceSession(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const all = getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.id !== sessionId)
    setJson(SESSIONS_KEY, all)
    return true
  }
  try {
    const { error } = await supabase.from('service_sessions').delete().eq('id', sessionId)
    if (error) {
      console.error('deleteServiceSession error:', error)
      // Fallback to localStorage
      const all = getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.id !== sessionId)
      setJson(SESSIONS_KEY, all)
      return true
    }
    return true
  } catch (e) {
    console.error('deleteServiceSession exception:', e)
    const all = getJson(SESSIONS_KEY).filter((s: ServiceSession) => s.id !== sessionId)
    setJson(SESSIONS_KEY, all)
    return true
  }
}

// ────────────── SUPABASE USERS (CUSTOM AUTH) ──────────────
export async function registerUser(user: Omit<UserAccount, 'id'>): Promise<UserAccount | null> {
  const cleanPhone = user.phone.replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    const users = getJson(STORAGE_KEYS.users) as UserAccount[]
    if (users.find((u) => u.phone.replace(/\s/g, '') === cleanPhone)) return null
    const newUser: UserAccount = { ...user, id: 'u_' + Date.now(), role: 'client' }
    users.push(newUser)
    setJson(STORAGE_KEYS.users, users)
    return newUser
  }

  // 1. Check if exists
  const { data: existing, error: existsError } = await supabase.from('users_custom').select('phone').eq('phone', cleanPhone).maybeSingle()
  if (existsError) {
    console.error('registerUser exists check error:', existsError)
    throw new Error('查詢失敗：' + existsError.message)
  }
  if (existing) return null

  // 2. Insert with explicit ID (in case default doesn't work)
  const { data, error } = await supabase.from('users_custom').insert({
    id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    phone: cleanPhone,
    password: user.password,
    name: user.name,
    role: 'client',
  }).select().maybeSingle()

  if (error) {
    console.error('registerUser insert error:', error)
    throw new Error('註冊失敗：' + error.message)
  }

  return data
}

export async function loginUser(phone: string, password: string): Promise<UserAccount | null> {
  const cleanPhone = phone.replace(/\s/g, '')
  if (!isSupabaseConfigured()) {
    const users = getJson(STORAGE_KEYS.users) as UserAccount[]
    const user = users.find((u) => {
      const uPhone = u.phone.replace(/^\+852/, '').replace(/\s/g, '')
      const cPhone = cleanPhone.replace(/^\+852/, '')
      return (uPhone === cPhone || u.phone.replace(/\s/g, '') === cleanPhone) && u.password === password
    })
    if (user) localStorage.setItem(STORAGE_KEYS.login, JSON.stringify(user))
    return user || null
  }
  const { data, error } = await supabase.from('users_custom').select('*')
    .eq('phone', cleanPhone).eq('password', password).maybeSingle()
  if (error) {
    console.error('loginUser error:', error)
    throw new Error('登入查詢失敗：' + error.message)
  }
  if (!data) {
    // Try with +852 prefix
    const { data: data2, error: err2 } = await supabase.from('users_custom').select('*')
      .eq('phone', '+852' + cleanPhone).eq('password', password).maybeSingle()
    if (err2) {
      console.error('loginUser +852 error:', err2)
      throw new Error('登入查詢失敗：' + err2.message)
    }
    if (data2) {
      localStorage.setItem(STORAGE_KEYS.login, JSON.stringify(data2))
      return data2
    }
    return null
  }
  localStorage.setItem(STORAGE_KEYS.login, JSON.stringify(data))
  return data
}

export function getLoggedInUser(): UserAccount | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.login) || 'null') } catch { return null }
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.login)
}

// ────────────── STAFF ──────────────
const STAFF_PASSWORDS = ['a2o2026']
export function verifyStaff(pin: string): boolean {
  return STAFF_PASSWORDS.includes(pin)
}

export async function verifyStaffDb(pin: string): Promise<{ name: string; role: string } | null> {
  if (!isSupabaseConfigured()) return STAFF_PASSWORDS.includes(pin) ? { name: 'Admin', role: 'admin' } : null
  const { data, error } = await supabase.from('staff_profiles').select('*').eq('pin', pin).maybeSingle()
  if (error || !data) return null
  return { name: data.name, role: data.role }
}

// ────────────── SEASON PRESETS ──────────────
export const SEASON_PRESETS: Record<string, {
  suitable: string[]
  avoid: string[]
  materials: string[]
  metals: string[]
  glasses: string
  watch: string
  strategy: string
  neutral: string[]
}> = {
  '春季型': {
    suitable: ['珊瑚橙', '金黃', '駝色', '蜜桃粉', '蘋果綠', '象牙白'],
    avoid: ['純黑', '純白', '冷灰', '紫藍色', '深咖啡'],
    materials: ['亞麻', '柔軟棉布', '絲質', '麂皮'],
    metals: ['黃金', '玫瑰金', '古銅金'],
    glasses: '玳瑁色（暖棕）、淺金色',
    watch: '棕色皮帶、玫瑰金錶盤',
    strategy: '以暖色調為主，選擇帶有黃底調的顏色，營造明亮活力的整體形象。',
    neutral: ['米色', '淺駝色', '香檳色'],
  },
  '夏季型': {
    suitable: ['薰衣草紫', '玫瑰粉', '灰藍', '鼠尾草綠', '莫蘭迪灰', '柔白'],
    avoid: ['純黑', '深咖啡', '橘色', '深紫', '螢光色'],
    materials: ['真絲', '細亞麻', '精紡羊毛', '雪紡'],
    metals: ['銀色', '白金', '香檳銀'],
    glasses: '銀灰、灰玳瑁、銀色金屬框',
    watch: '銀色金屬錶帶、淺色錶盤',
    strategy: '選擇帶灰調的柔和色彩，避免過於鮮豔或沉重的顏色，營造優雅清透感。',
    neutral: ['淺灰', '石板灰', '灰棕色'],
  },
  '秋季型': {
    suitable: ['鐵鏽紅', '磚紅', '橄欖綠', '芥末黃', '咖啡', '焦糖色', '古銅'],
    avoid: ['純黑', '純白', '寶藍', '冷灰', '螢光色', '亮粉紅'],
    materials: ['天鵝絨', '燈芯絨', '粗紡羊毛', '皮革', '麂皮', '法蘭絨'],
    metals: ['古銅金', '玫瑰金', '做舊金', '香檳金'],
    glasses: '深玳瑁（棕黑）、深咖啡、古銅色',
    watch: '深棕色皮質錶帶、復古皮革、古銅色錶盤',
    strategy: '選擇深沉濃郁的暖色調，強調質感與大地色系，營造沉穩內斂的成熟形象。',
    neutral: ['深咖啡', '暖深灰', '可可色'],
  },
  '冬季型': {
    suitable: ['純黑', '純白', '寶藍', '翡翠綠', '酒紅', '紫紅', '亮白'],
    avoid: ['大地色', '駝色', '橄欖綠', '暗黃色', '芥末色'],
    materials: ['光澤感面料', '重磅羊毛', '皮革', '精紡毛料'],
    metals: ['白金', '銀色', '亮面金屬'],
    glasses: '純黑、銀灰、亮面金屬框',
    watch: '銀鋼錶帶、黑色錶盤、冷色金屬',
    strategy: '選擇高對比、高飽和度的冷色調，營造鮮明有力的視覺衝擊。',
    neutral: ['純黑', '深灰', '冷白', '炭灰'],
  },
}