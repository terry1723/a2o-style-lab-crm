import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedSection, StaggerContainer, StaggerItem } from '../components/AnimatedSection'
import {
  MessageCircle, Palette, Shirt, Camera,
  TrendingUp, Heart, Users, Star,
  ArrowRight, Phone, LogIn, UserPlus,
  Play, Pause, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-a2o-beige">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-a2o-beige/90 backdrop-blur-md border-b border-a2o-warm/50">
        <div className="max-w-7xl mx-auto section-padding py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/a2o-logo.png" alt="A₂O Style Lab" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => navigate('/products')}
              className="text-xs sm:text-sm font-medium text-a2o-black hover:text-a2o-pink transition-colors px-2 sm:px-3 py-1.5"
            >
              會員單品
            </button>
            <button
              onClick={() => navigate('/experience')}
              className="text-xs sm:text-sm font-medium text-a2o-black hover:text-a2o-pink transition-colors px-2 sm:px-3 py-1.5"
            >
              形象體驗
            </button>
            <button
              onClick={() => navigate('/crm/login')}
              className="text-xs sm:text-sm font-medium bg-a2o-black text-white px-3 sm:px-4 py-1.5 rounded-full hover:bg-a2o-pink transition-colors"
            >
              客戶登入
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-16">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 rounded-full bg-a2o-pink/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-a2o-pink-light/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center section-padding px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <img
              src="/images/A2O.png"
              alt="A2O Style Lab"
              className="h-auto w-[60vw] sm:w-[45vw] md:w-[38vw] lg:w-[32vw] mx-auto mb-4 object-contain"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="inline-block bg-a2o-pink text-white px-4 py-1.5 rounded-full text-sm sm:text-base font-medium tracking-wide mb-6">
              男士形象提升管理
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-base sm:text-lg md:text-xl text-a2o-black/70 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            專業團隊為你度身定制形象方案，從穿搭到髮型、從色彩到攝影，助你由 Average 走向 Outstanding。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <a
              href="https://wa.me/85254077240"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <UserPlus className="w-4 h-4" />
              立即開始改造
            </a>
            {/* 香港一日體驗暫時隱藏，待完善後開放 */}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-8 text-sm text-a2o-black/40"
          >
            已有帳號？
            <button
              onClick={() => navigate('/crm/login')}
              className="text-a2o-pink hover:underline ml-1 font-medium"
            >
              客戶登入
            </button>
            或
            <button
              onClick={() => navigate('/portal')}
              className="text-a2o-pink hover:underline ml-1 font-medium"
            >
              內部登入
            </button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-a2o-black/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 rounded-full bg-a2o-black/40" />
          </div>
        </motion.div>
      </section>

      {/* Vertical Video Showcase */}
      <section className="py-12 sm:py-16 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-8 sm:mb-10">
            <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">Style in Motion</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-a2o-black mt-2">
              形象改造，由 Average 到 Outstanding
            </h2>
          </AnimatedSection>

          <VerticalGallery />
        </div>
      </section>

      {/* Service Process */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">Service Process</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-a2o-black mt-3">
              形象改造四步曲
            </h2>
            <p className="text-a2o-black/60 mt-4 max-w-xl mx-auto">
              由諮詢到拍攝，每一步都為你精心安排，確保獲得最佳形象提升體驗。
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8" staggerDelay={0.15}>
            {[
              { num: '01', title: '形象諮詢', desc: '了解你的職業、生活方式與穿搭目標，制定專屬方案。', icon: MessageCircle },
              { num: '02', title: '專業檢測', desc: '色彩分析與身型測量，找出最適合你的色調與版型。', icon: Palette },
              { num: '03', title: '穿搭造型', desc: '根據分析結果，打造多套適合不同場合的專屬造型。', icon: Shirt },
              { num: '04', title: '專業拍攝', desc: '形象照拍攝，記錄你的蛻變時刻，可用於社交與職場。', icon: Camera },
            ].map((step) => (
              <StaggerItem key={step.num}>
                <div className="group relative bg-a2o-beige rounded-2xl p-6 sm:p-8 hover-lift cursor-default h-full">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-a2o-pink text-white flex items-center justify-center text-lg sm:text-xl font-serif font-bold mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300">
                    {step.num}
                  </div>
                  <step.icon className="w-6 h-6 text-a2o-pink mb-3" />
                  <h3 className="text-lg sm:text-xl font-bold text-a2o-black mb-2">{step.title}</h3>
                  <p className="text-sm sm:text-base text-a2o-black/60 leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Four Benefits */}
      <section className="py-16 sm:py-24 bg-a2o-beige">
        <div className="max-w-6xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">Benefits</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-a2o-black mt-3">
              四大核心效益
            </h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" staggerDelay={0.12}>
            {[
              { icon: TrendingUp, title: '提升自信', desc: '由外而內建立自信，舉手投足散發從容魅力，在各種場合游刃有餘。' },
              { icon: Star, title: '事業成就', desc: '專業形象助力職場發展，第一印象為你打開更多機會之門。' },
              { icon: Heart, title: '愛情魅力', desc: '得體穿搭與個人氣質，讓你在約會與社交場合更添吸引力。' },
              { icon: Users, title: '人際關係', desc: '良好形象提升他人對你的信任感，拓展人脈與社交圈。' },
            ].map((b) => (
              <StaggerItem key={b.title}>
                <div className="bg-white rounded-2xl p-6 sm:p-8 hover-lift h-full">
                  <div className="w-12 h-12 rounded-xl bg-a2o-pink/10 flex items-center justify-center mb-4">
                    <b.icon className="w-6 h-6 text-a2o-pink" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-a2o-black mb-2">{b.title}</h3>
                  <p className="text-sm sm:text-base text-a2o-black/60 leading-relaxed">{b.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24 bg-a2o-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="max-w-6xl mx-auto section-padding relative z-10">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">Track Record</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mt-3">
              實績數據
            </h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8" staggerDelay={0.12}>
            {[
              { num: '300+', label: '香港男士完成形象改造' },
              { num: '70+', label: '永久會員持續跟進' },
              { num: '30+', label: '企業形象講座舉辦' },
              { num: '10+', label: '年造型團隊經驗' },
            ].map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="text-center">
                  <motion.div
                    className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-a2o-pink mb-2"
                    whileInView={{ scale: [0.8, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    {stat.num}
                  </motion.div>
                  <p className="text-sm sm:text-base text-white/60">{stat.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Team / About */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <AnimatedSection direction="left">
              <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">About Us</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-a2o-black mt-3 mb-6">
                專業造型團隊
              </h2>
              <p className="text-base sm:text-lg text-a2o-black/70 leading-relaxed mb-4">
                我們的造型團隊經驗豐富，曾為藝人及品牌廣告擔任造型及拍攝工作。我們深信每一位男士都值得擁有屬於自己的專屬形象。
              </p>
              <p className="text-base sm:text-lg text-a2o-black/70 leading-relaxed mb-6">
                由色彩分析到穿搭指導、髮型設計到專業攝影，我們提供一站式男士形象提升服務，協助你展現最佳狀態。
              </p>
              <div className="flex flex-wrap gap-3">
                {['穿搭指導', '色彩分析', '髮型設計', '專業攝影'].map((tag) => (
                  <span key={tag} className="bg-a2o-beige text-a2o-black/70 px-3 py-1.5 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right" className="relative">
              <div className="aspect-[4/5] rounded-2xl bg-a2o-warm overflow-hidden relative">
                <img
                  src="/images/team.jpg"
                  alt="A₂O 專業造型團隊"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-a2o-black/10 to-transparent" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Transformation Cases */}
      <section className="py-16 sm:py-24 bg-a2o-beige">
        <div className="max-w-6xl mx-auto section-padding">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <span className="text-a2o-pink text-sm font-medium tracking-widest uppercase">Transformations</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-a2o-black mt-3">
              改造實例
            </h2>
            <p className="text-a2o-black/60 mt-4 max-w-xl mx-auto">
              以下為部分客戶經形象改造後的蛻變。真實案例，真實改變。
            </p>
          </AnimatedSection>

          <TransformationGrid />
        </div>
      </section>

      {/* CTA Login Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto section-padding text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-a2o-black mb-4">
              準備好改變了嗎？
            </h2>
            <p className="text-base sm:text-lg text-a2o-black/60 mb-8 max-w-xl mx-auto">
              註冊帳號開始你的形象改造之旅，或聯繫我們了解更多。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <button
                onClick={() => navigate('/crm/login')}
                className="btn-primary flex items-center gap-2 justify-center text-sm sm:text-base"
              >
                <UserPlus className="w-4 h-4" />
                註冊帳號
              </button>
              <a
                href="https://wa.me/85254077240"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 justify-center text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp 查詢
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
              <button
                onClick={() => navigate('/crm/login')}
                className="text-a2o-pink hover:underline font-medium"
              >
                已有帳號？立即登入
              </button>
              <span className="hidden sm:inline text-a2o-black/30">|</span>
              <button
                onClick={() => navigate('/portal')}
                className="text-a2o-black/50 hover:text-a2o-black transition-colors"
              >
                內部系統登入
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-a2o-black text-white py-12 sm:py-16">
        <div className="max-w-6xl mx-auto section-padding">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            <div>
              <div className="text-2xl font-serif font-bold mb-4">
                A<span className="text-a2o-pink text-sm align-super">2</span>O
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                一站式男士形象提升管理，由 Average 走向 Outstanding。
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">服務</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => navigate('/experience')} className="hover:text-a2o-pink transition-colors">香港一日體驗</button></li>
                <li><button onClick={() => navigate('/crm/login')} className="hover:text-a2o-pink transition-colors">形象改造計劃</button></li>
                <li><span className="hover:text-a2o-pink transition-colors">穿搭教學</span></li>
                <li><span className="hover:text-a2o-pink transition-colors">專業攝影</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">聯繫</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>WhatsApp 5407 7240</span>
                </li>
                <li>荔枝角億利工業中心204</li>
                <li>預約制</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">帳號</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => navigate('/crm/login')} className="hover:text-a2o-pink transition-colors flex items-center gap-2"><LogIn className="w-4 h-4" />客戶登入</button></li>
                <li><button onClick={() => navigate('/portal')} className="hover:text-a2o-pink transition-colors flex items-center gap-2"><LogIn className="w-4 h-4" />內部系統</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-white/40">
            <p> A2O Style Lab. Average to Outstanding.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ───── Transformation Cases (8 Real Before/After) ───── */
const CASE_IMAGES = [
  { src: '/images/case-a.jpg', name: '客戶案例 A' },
  { src: '/images/case-b.jpg', name: '客戶案例 B' },
  { src: '/images/case-c.jpg', name: '客戶案例 C' },
  { src: '/images/case-d.jpg', name: '客戶案例 D' },
  { src: '/images/case-e.jpg', name: '客戶案例 E' },
  { src: '/images/case-f.jpg', name: '客戶案例 F' },
  { src: '/images/case-g.jpg', name: '客戶案例 G' },
  { src: '/images/case-h.jpg', name: '客戶案例 H' },
]

function TransformationGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {CASE_IMAGES.map((item, i) => (
        <motion.div
          key={item.src}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative aspect-square overflow-hidden">
            <img
              src={item.src}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-a2o-pink/0 group-hover:bg-a2o-pink/10 transition-colors duration-300" />
          </div>
          <div className="px-3 py-2.5">
            <p className="text-xs text-a2o-black/50 uppercase tracking-wider">Before / After</p>
            <p className="text-sm font-bold text-a2o-black">{item.name}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ───── Vertical Gallery Carousel (真實客戶照片) ───── */
const GALLERY_ITEMS = [
  {
    image: '/images/anson.jpg',
    name: 'Anson',
    title: 'Barbershop 髮型師',
    quote: '從小透過電影吸收髮型與穿搭靈感，終於融會貫通成屬於自己的風格。',
  },
  {
    image: '/images/sky.jpg',
    name: 'Sky',
    title: '老師 / 賽馬評述員',
    quote: '兩個角色切換頻繁，來到 A2O 後形象更有平衡感。',
  },
  {
    image: '/images/kingsley.jpg',
    name: 'Kingsley',
    title: '媒體企劃',
    quote: '形象是專業的延伸，更是自信的起點。',
  },
  {
    image: '/images/lamk.jpg',
    name: 'LamK',
    title: 'Slasher 創作人',
    quote: '與另一個版本的自己驚喜相遇。',
  },
  {
    image: '/images/steven.jpg',
    name: 'Steven',
    title: '攝影師',
    quote: '讓形象與作品風格達成一致。',
  },
  {
    image: '/images/granada.jpg',
    name: 'Granada',
    title: '普通男生快速改造',
    quote: '變帥真的不需要一個週末，1 小時就夠了。',
  },
]

function VerticalGallery() {
  const [active, setActive] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % GALLERY_ITEMS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isPlaying])

  const goNext = () => setActive(prev => (prev + 1) % GALLERY_ITEMS.length)
  const goPrev = () => setActive(prev => (prev - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length)

  return (
    <div className="relative">
      {/* Main carousel area */}
      <div className="flex items-stretch justify-center gap-3 sm:gap-5 md:gap-8">
        {/* Left thumbnail */}
        <button
          onClick={goPrev}
          className="hidden sm:flex relative w-[18%] max-w-[120px] rounded-2xl overflow-hidden opacity-40 hover:opacity-70 transition-opacity shrink-0 items-center justify-center self-center"
        >
          <img
            src={GALLERY_ITEMS[(active - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length].image}
            alt=""
            className="w-full h-full object-cover rounded-2xl"
          />
          <div className="absolute inset-0 bg-black/20 rounded-2xl" />
        </button>

        {/* Center hero image */}
        <div className="relative w-[85%] sm:w-[45%] max-w-[420px]">
          <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/50">
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={GALLERY_ITEMS[active].image}
                alt={`${GALLERY_ITEMS[active].name} - ${GALLERY_ITEMS[active].title}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                style={{ animation: 'kenBurns 10s ease-in-out infinite alternate' }}
              />
            </AnimatePresence>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-a2o-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Play/Pause button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Caption overlay */}
            <motion.div
              key={`cap-${active}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-4 left-4 right-14 text-white z-10"
            >
              <p className="text-xs font-medium tracking-wider uppercase opacity-70">A₂O Style Lab</p>
              <p className="text-lg sm:text-xl font-bold">{GALLERY_ITEMS[active].name}</p>
              <p className="text-sm opacity-80">{GALLERY_ITEMS[active].title}</p>
            </motion.div>
          </div>

          {/* Quote below image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`quote-${active}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 text-center px-2"
            >
              <p className="text-sm sm:text-base text-a2o-black/70 italic">
                「{GALLERY_ITEMS[active].quote}」
              </p>
              <p className="text-xs text-a2o-pink mt-1 font-medium">
                — {GALLERY_ITEMS[active].name}，{GALLERY_ITEMS[active].title}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right thumbnail */}
        <button
          onClick={goNext}
          className="hidden sm:flex relative w-[18%] max-w-[120px] rounded-2xl overflow-hidden opacity-40 hover:opacity-70 transition-opacity shrink-0 items-center justify-center self-center"
        >
          <img
            src={GALLERY_ITEMS[(active + 1) % GALLERY_ITEMS.length].image}
            alt=""
            className="w-full h-full object-cover rounded-2xl"
          />
          <div className="absolute inset-0 bg-black/20 rounded-2xl" />
        </button>
      </div>

      {/* Mobile navigation arrows */}
      <div className="flex sm:hidden justify-center gap-4 mt-4">
        <button onClick={goPrev} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-a2o-black">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={goNext} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-a2o-black">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-5 sm:mt-6">
        {GALLERY_ITEMS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-a2o-pink' : 'w-2 bg-a2o-warm hover:bg-a2o-pink/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
