import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AnimatedSection, StaggerContainer, StaggerItem } from '../components/AnimatedSection'
import { Clock, MapPin, Camera, Shirt, Palette, Scissors, ArrowRight, MessageCircle, CheckCircle2, Sparkles } from 'lucide-react'

export default function Experience() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-a2o-beige">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-a2o-beige/90 backdrop-blur-md border-b border-a2o-warm/50">
        <div className="max-w-7xl mx-auto section-padding py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="text-xl font-serif font-bold tracking-tight text-a2o-black">
              A<span className="text-a2o-pink text-sm align-super">2</span>O
            </div>
          </button>
          <button onClick={() => navigate('/')} className="text-sm text-a2o-black/60 hover:text-a2o-pink transition-colors">
            返回首頁
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center section-padding px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-a2o-black mb-4">
              香港一日男士形象體驗
            </h1>
            <p className="text-lg sm:text-xl text-a2o-black/60 mb-6">
              半日時間，由頭到腳煥然一新
            </p>
            <div className="text-3xl sm:text-4xl font-serif font-bold text-a2o-pink mb-8">
              HK$3,980
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/booking')} className="btn-primary flex items-center gap-2 justify-center">
                立即預約
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="https://wa.me/85254077240" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 justify-center">
                <MessageCircle className="w-4 h-4" />
                WhatsApp 查詢
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-a2o-black">半天體驗包含什麼</h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" staggerDelay={0.1}>
            {[
              { icon: Scissors, title: '專業髮型設計', desc: '資深髮型師根據你的面型與風格設計最適合髮型。' },
              { icon: Palette, title: '簡易顏色分析', desc: '快速找出最襯你膚色的色調方向。' },
              { icon: Shirt, title: '服裝造型一套', desc: '根據你的身型與喜好，搭配一套完整造型。' },
              { icon: Camera, title: '專業街拍', desc: '在上環/西營盤特色街區進行形象拍攝。' },
              { icon: MapPin, title: '專車接送', desc: '髮型屋往返 Showroom，無縫銜接。' },
              { icon: Clock, title: '4.5 小時', desc: '由中午開始，下午完成，不耽誤行程。' },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="bg-a2o-beige rounded-2xl p-5 sm:p-6 hover-lift h-full">
                  <div className="w-10 h-10 rounded-xl bg-a2o-pink/10 flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-a2o-pink" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-a2o-black mb-1">{item.title}</h3>
                  <p className="text-sm text-a2o-black/60">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-20 bg-a2o-beige">
        <div className="max-w-3xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-a2o-black">行程時間表</h2>
            <p className="text-a2o-black/60 mt-3">12:00 開始，約 16:30 結束</p>
          </AnimatedSection>

          <div className="space-y-6 sm:space-y-8">
            {[
              { time: '12:00', title: '尖沙咀集合', desc: '髮型屋進行髮型設計（約1小時）' },
              { time: '13:30', title: '專車接送', desc: '前往荔枝角 Showroom' },
              { time: '14:00', title: '顏色分析 + 試穿', desc: '簡易色彩分析，試穿 2-3 套造型' },
              { time: '15:00', title: '確定造型', desc: '選定最終造型，整理細節' },
              { time: '15:30', title: '街拍', desc: '上環/西營盤街區專業拍攝（約1小時）' },
              { time: '16:30', title: '完成', desc: '即場選精修相，送風格指南' },
            ].map((step, i) => (
              <AnimatedSection key={step.time} delay={i * 0.1} className="flex gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-a2o-pink text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  {i < 5 && <div className="w-0.5 h-full bg-a2o-pink/20 mt-2 min-h-[30px]" />}
                </div>
                <div className="pb-2">
                  <div className="text-sm font-bold text-a2o-pink mb-0.5">{step.time}</div>
                  <h3 className="text-base sm:text-lg font-bold text-a2o-black">{step.title}</h3>
                  <p className="text-sm text-a2o-black/60 mt-1">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Style Options */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-a2o-black">兩種風格選擇</h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <AnimatedSection direction="left">
              <div className="bg-a2o-beige rounded-2xl overflow-hidden hover-lift">
                <div className="aspect-[4/3] bg-a2o-warm flex items-center justify-center text-a2o-black/20">
                  <div className="text-center">
                    <Shirt className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">港式復古風圖片</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-bold text-a2o-black mb-2">港式復古風</h3>
                  <p className="text-sm text-a2o-black/60 leading-relaxed">
                    致敬經典香港電影美學，寬鬆剪裁、經典配色，散發不羈優雅氣質。
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="bg-a2o-beige rounded-2xl overflow-hidden hover-lift">
                <div className="aspect-[4/3] bg-a2o-warm flex items-center justify-center text-a2o-black/20">
                  <div className="text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">韓式極簡風圖片</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-bold text-a2o-black mb-2">韓式極簡風</h3>
                  <p className="text-sm text-a2o-black/60 leading-relaxed">
                    乾淨線條、柔和配色、層次穿搭，展現現代都市男士的精緻感。
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-20 bg-a2o-beige">
        <div className="max-w-3xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-a2o-black">常見問題</h2>
          </AnimatedSection>

          <div className="space-y-4">
            {[
              { q: '需要提前多久預約？', a: '建議至少提前 7 天預約，以便我們安排髮型師與造型師時間。' },
              { q: '價格已包含所有費用嗎？', a: '是的，HK$3,980 已包含髮型設計、造型搭配、街拍及接送服務。' },
              { q: '可以自帶衣服嗎？', a: '可以，但我們會根據你的風格提供專業搭配建議與服裝選擇。' },
              { q: '照片什麼時候可以拿到？', a: '街拍精修相會在 3-5 個工作日內以電子檔形式發送。' },
            ].map((faq, i) => (
              <AnimatedSection key={i} delay={i * 0.08}>
                <div className="bg-white rounded-xl p-5 sm:p-6">
                  <h4 className="font-bold text-a2o-black mb-2 flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-a2o-pink shrink-0 mt-0.5" />
                    {faq.q}
                  </h4>
                  <p className="text-sm text-a2o-black/60 pl-7">{faq.a}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-a2o-black text-white text-center">
        <div className="max-w-3xl mx-auto section-padding">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              立即預約你的形象體驗
            </h2>
            <p className="text-white/60 mb-8">
              最少提前 7 天預約，週末名額有限，建議盡早預訂。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/booking')} className="btn-primary bg-white text-a2o-black hover:bg-a2o-pink hover:text-white justify-center">
                立即預約
              </button>
              <a href="https://wa.me/85254077240" target="_blank" rel="noopener noreferrer" className="btn-secondary border-white/30 text-white hover:bg-white/10 justify-center">
                WhatsApp 查詢
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
