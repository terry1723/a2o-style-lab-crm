from pathlib import Path

p = Path('app/src/pages/PortalStaff.tsx')
s = p.read_text()

if 'editingProfile, setEditingProfile' not in s:
    s = s.replace(
        "  const [savingPic, setSavingPic] = useState<string | null>(null)\n",
        "  const [savingPic, setSavingPic] = useState<string | null>(null)\n  const [editingProfile, setEditingProfile] = useState<string | null>(null)\n  const [profileDrafts, setProfileDrafts] = useState<Record<string, Partial<ClientData>>>({})\n"
    )

if 'const startProfileEdit = (client: ClientData)' not in s:
    marker = "  const handlePicChange = async (client: ClientData, pic: string) => {\n"
    insert = r'''
  const startProfileEdit = (client: ClientData) => {
    setEditingProfile(client.id)
    setProfileDrafts(prev => ({
      ...prev,
      [client.id]: {
        name: client.name || '',
        phone: client.phone || '',
        occupation: client.occupation || '',
        height: client.height || '',
        weight: client.weight || '',
        shoulder_width: client.shoulder_width || '',
        waist_size: client.waist_size || '',
        pant_length: client.pant_length || '',
        shoe_size: client.shoe_size || '',
        body_type: client.body_type || '',
        body_remark: client.body_remark || '',
        pain_point: client.pain_point || '',
        favorite_style: client.favorite_style || '',
        purpose: client.purpose || '',
        lifestyle: client.lifestyle || '',
        desired_effect: client.desired_effect || '',
        budget: client.budget || '',
        plan: client.plan || '',
        plan_price: Number(client.plan_price || 0),
        amount_paid: Number(client.amount_paid || 0),
        status: client.status || 'active',
        before_photo: client.before_photo || '',
      }
    }))
  }

  const updateProfileDraft = (clientId: string, key: keyof ClientData, value: string | number) => {
    setProfileDrafts(prev => ({
      ...prev,
      [clientId]: { ...(prev[clientId] || {}), [key]: value }
    }))
  }

  const handleProfilePhoto = (clientId: string, file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => updateProfileDraft(clientId, 'before_photo', reader.result as string)
    reader.readAsDataURL(file)
  }

  const saveProfileEdit = async (client: ClientData) => {
    const draft = profileDrafts[client.id] || {}
    const price = Number(draft.plan_price || 0)
    const paid = Number(draft.amount_paid || 0)
    await saveClient({
      id: client.id,
      ...draft,
      plan_price: price,
      amount_paid: paid,
      balance_due: Math.max(0, price - paid),
    })
    setEditingProfile(null)
    await refresh()
  }

  const copyWelcomeMessage = async (client: ClientData) => {
    const services = await getClientServices(client.id)
    const lines = services.length
      ? services.filter(s => Number(s.count || 0) > 0).map(s => `・${s.name} x${s.count}`).join('\n')
      : '・服務項目待職員更新'
    const price = Number(client.plan_price || 0).toLocaleString()
    const paid = Number(client.amount_paid || 0).toLocaleString()
    const due = Number(client.balance_due || Math.max(0, Number(client.plan_price || 0) - Number(client.amount_paid || 0))).toLocaleString()
    const text = `你好 ${client.name}，歡迎加入 A2O Style Lab！\n\n我哋已經為你建立會員檔案，之後會根據你嘅身型、風格方向、顏色分析同服務進度，協助你逐步完成形象提升。\n\n你的計劃：Plan ${client.plan || '待確認'}\n計劃金額：HK$${price}\n已付款：HK$${paid}\n尚餘：HK$${due}\n\n服務項目：\n${lines}\n\n之後我哋會喺呢個 WhatsApp group 入面更新你嘅預約、造型建議、顏色分析結果同後續跟進。如有任何問題，可以直接喺呢度問我哋。\n\nA2O Style Lab`
    safeCopy(text, client.id + '_welcome')
  }

'''
    if marker not in s:
        raise SystemExit('handlePicChange marker not found')
    s = s.replace(marker, insert + marker)

if '編輯會員資料' not in s:
    target = '''                      {/* Basic Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">'''
    repl = '''                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">會員資料</span>
                        <button
                          onClick={() => editingProfile === client.id ? setEditingProfile(null) : startProfileEdit(client)}
                          className="text-xs text-a2o-pink hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {editingProfile === client.id ? '取消' : '編輯會員資料'}
                        </button>
                      </div>

                      {editingProfile === client.id && (
                        <div className="bg-a2o-beige rounded-xl p-3 space-y-3">
                          {(() => {
                            const d = profileDrafts[client.id] || {}
                            const field = (key: keyof ClientData, label: string, type = 'text') => (
                              <div>
                                <label className="block text-xs text-a2o-black/50 mb-1">{label}</label>
                                <input
                                  type={type}
                                  value={(d as any)[key] || ''}
                                  onChange={e => updateProfileDraft(client.id, key, type === 'number' ? Number(e.target.value) : e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
                                />
                              </div>
                            )
                            const area = (key: keyof ClientData, label: string) => (
                              <div>
                                <label className="block text-xs text-a2o-black/50 mb-1">{label}</label>
                                <textarea
                                  value={(d as any)[key] || ''}
                                  onChange={e => updateProfileDraft(client.id, key, e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
                                />
                              </div>
                            )
                            return (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {field('name','姓名')}{field('phone','電話')}{field('occupation','職業')}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                  {field('height','身高')}{field('weight','體重')}{field('shoulder_width','肩闊')}{field('waist_size','腰圍')}{field('pant_length','褲長')}{field('shoe_size','鞋碼')}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {area('body_type','身型描述')}{area('pain_point','痛點')}{area('purpose','目的')}{area('favorite_style','風格')}{area('desired_effect','希望效果')}{area('body_remark','備註')}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {field('plan','Plan')}{field('plan_price','計劃價格','number')}{field('amount_paid','已付款','number')}
                                  <div>
                                    <label className="block text-xs text-a2o-black/50 mb-1">狀態</label>
                                    <select
                                      value={String(d.status || 'active')}
                                      onChange={e => updateProfileDraft(client.id, 'status', e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm"
                                    >
                                      <option value="active">進行中</option>
                                      <option value="completed">已完成</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-a2o-warm">
                                  {(d.before_photo || client.before_photo) ? (
                                    <img src={String(d.before_photo || client.before_photo)} className="w-16 h-16 rounded-lg object-cover" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg bg-a2o-beige flex items-center justify-center text-xs text-a2o-black/40">相片</div>
                                  )}
                                  <input type="file" accept="image/*" onChange={e => handleProfilePhoto(client.id, e.target.files?.[0])} className="text-xs" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveProfileEdit(client)} className="px-3 py-2 bg-a2o-black text-white rounded-lg text-xs font-medium">保存會員資料</button>
                                  <button onClick={() => setEditingProfile(null)} className="px-3 py-2 border border-a2o-warm bg-white rounded-lg text-xs">取消</button>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Basic Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">'''
    if target not in s:
        raise SystemExit('basic info marker not found')
    s = s.replace(target, repl)

if '複製歡迎訊息' not in s:
    marker = '''                        <button
                          onClick={() => copyFullAnalysis(client)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-a2o-warm text-a2o-black rounded-lg text-xs font-medium hover:bg-a2o-black hover:text-white transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          複製完整報告
                        </button>'''
    addition = '''                        <button
                          onClick={() => copyWelcomeMessage(client)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          {copiedId === client.id + '_welcome' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === client.id + '_welcome' ? '已複製' : '複製歡迎訊息'}
                        </button>

''' + marker
    if marker not in s:
        raise SystemExit('copy full analysis button marker not found')
    s = s.replace(marker, addition)

p.write_text(s)
print('patched PortalStaff.tsx')
