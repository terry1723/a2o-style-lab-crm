export const site = {
  origin: 'https://a2o-style-lab.vercel.app',
  name: 'A2O Style Lab',
  whatsapp: `https://wa.me/85254077240?text=${encodeURIComponent('你好，我想預約一對一形象諮詢。')}`,
  assessment: '/#/?start=assessment',
  address: '香港九龍荔枝角長沙灣道883號億利工業中心204A室',
}

export const knowledgeHub = {
  slug: 'image-guide',
  title: 'A2O 男士形象知識中心',
  description: 'A2O Style Lab 整理給香港男士的實用形象指南，涵蓋工作與約會穿搭、Smart Casual、配色、身形比例、服裝版型及衣櫃規劃。',
  directAnswer: '好的男士形象不是追逐單一潮流，而是讓場合、身形比例、顏色、材質、髮型與生活角色互相配合。你可以先由目前最影響你的場合開始，再逐步建立可重複使用的個人系統。',
}

const priceNote = '造型及預算僅供參考，實際價格以品牌當時售價為準。'

export const knowledgeArticles = [
  {
    slug: 'work-smart-casual',
    navLabel: '工作形象',
    category: '工作場合',
    title: '香港男士工作場合 Smart Casual 指南',
    description: '香港男士如何為辦公、見客及會議建立專業而不拘謹的 Smart Casual 形象？從場合、輪廓、配色、材質及參考預算逐步說明。',
    directAnswer: '工作 Smart Casual 的重點不是穿得最正式，而是先讀懂場合，再用乾淨領口、順直褲線、低對比配色及整潔鞋履建立可信度。見客時增加一件有結構的外套，日常辦公則可保留較柔和的針織與棉麻質感。',
    hero: { src: '/a2o/knowledge/work-look.webp', alt: '深棕外套、米白針織、淺藍襯衫與卡其長褲的男士工作造型參考' },
    sections: [
      {
        heading: '先看場合，再決定正式程度',
        paragraphs: ['日常辦公需要整潔與可重複；見客需要提高可信度；正式會議則要增加結構感。三者不必使用完全不同的衣櫃，而是調整外套、領口、鞋履及色彩對比。'],
        table: {
          headers: ['場合', '搭配方向'],
          rows: [
            ['日常工作', '乾淨領口、直筒褲與低對比色彩，讓專業感保持穩定。'],
            ['見客', '針織 Polo、襯衫或輕量外套配整潔皮鞋，避免過多圖案。'],
            ['正式會議', '選擇有清楚肩線的外套、完整褲線及一致的皮革配件。'],
          ],
        },
      },
      {
        heading: '成熟但不拘謹的配色與材質',
        paragraphs: ['深棕外套建立穩定輪廓，米白針織與淺藍襯衫提亮面色；卡其褲、麂皮鞋及編織皮帶令整體保持柔和層次。當色彩較克制時，羊毛、牛津布、針織、棉麻及麂皮的差異會令造型更完整。'],
        image: { src: '/a2o/knowledge/texture-matrix.webp', alt: '不同上衣與長褲材質的男士搭配矩陣', caption: '一件有紋理，另一件保持平整；一件輕薄，另一件提供穩定垂感。' },
      },
      {
        heading: '工作造型單品與自行選購預算示例',
        paragraphs: ['以下組合示範如何以深棕、米白、淺藍與卡其建立一套可拆開重複配搭的工作造型。毋須一次購入全部單品，應先處理最影響輪廓的外套、長褲與鞋履。'],
        table: {
          headers: ['類別', '造型參考', '參考預算'],
          rows: [
            ['外套', 'Massimo Dutti 棕色羊毛混紡西裝外套', 'HK$2,590'],
            ['上衣', 'Polo Ralph Lauren 米白麻花針織衫', 'HK$1,990'],
            ['襯衫', 'Polo Ralph Lauren 淺藍條紋牛津布襯衫', 'HK$1,290'],
            ['長褲', 'Massimo Dutti 卡其色棉麻褶襇休閒褲', 'HK$1,190'],
            ['鞋履', 'Massimo Dutti 深棕色麂皮便士樂福鞋', 'HK$1,490'],
            ['皮帶', 'Polo Ralph Lauren 編織皮革飾邊腰帶', 'HK$790'],
          ],
        },
        note: priceNote,
      },
    ],
    faqs: [
      ['Smart Casual 是否一定要穿西裝外套？', '不一定。針織 Polo、乾淨襯衫或有結構的 Overshirt 都可以建立專業感，關鍵是場合、肩線、褲線及鞋履保持一致。'],
      ['香港天氣炎熱，見客可以怎樣穿？', '優先選薄身棉、麻或輕量羊毛混紡，利用領口、顏色和褲型維持完整感，而不是依賴厚重層次。'],
    ],
    related: ['colour-summer-style', 'fit-proportion', 'wardrobe-system'],
  },
  {
    slug: 'dating-style',
    navLabel: '約會穿搭',
    category: '約會場合',
    title: '男士約會穿搭與第一印象指南',
    description: '男士約會穿搭如何自然、有個人感又不顯得刻意？以工裝外套、柔和針織、寬直褲與復古跑鞋示範輪廓、配色及預算安排。',
    directAnswer: '約會造型要讓人感覺你有準備，但仍然自然。最穩定的方法是保留一件有質感的重點單品，再以柔和針織、乾淨寬直褲與整潔鞋履平衡；全身控制在兩至三個主色，會比堆疊潮流單品更有親和力。',
    hero: { src: '/a2o/knowledge/dating-look.webp', alt: '棕色工裝外套、針織上衣、寬鬆長褲與復古跑鞋的男士約會造型參考' },
    sections: [
      {
        heading: '約會形象需要親和力與個人感',
        paragraphs: ['棕色工裝外套增加輪廓與質感，寬鬆針織令線條柔和；寬直褲配復古跑鞋方便活動，亦不會顯得過度正式。主色以棕、深灰、白色為主，能保持簡潔層次。'],
        image: { src: '/a2o/knowledge/occasion-style.webp', alt: '不同男士形象改造前後與場合造型示例', caption: '先讀懂約會場合與自己的角色，再決定造型的正式程度。' },
      },
      {
        heading: '用輪廓取代過度緊身',
        paragraphs: ['合身不等於貼身。外套可以稍有份量，但內搭與長褲仍要保留清楚比例；大腿和小腿有自然空間，整體會更成熟。鞋履需要乾淨並有足夠份量承托褲管。'],
        image: { src: '/a2o/knowledge/trouser-silhouettes.webp', alt: '直筒、微寬鬆及過度緊身男士長褲輪廓比較', caption: '直筒與微寬鬆褲型較容易保留自然垂感與現代比例。' },
      },
      {
        heading: '約會造型單品與自行選購預算示例',
        paragraphs: ['這套組合以工裝質感、柔和針織及復古跑鞋為主。可先從外套或鞋履選一件重點，再用衣櫃已有的深灰、白色或棕色單品完成搭配。'],
        table: {
          headers: ['類別', '造型參考', '參考預算'],
          rows: [
            ['外套', 'Carhartt WIP 帆布或燈芯絨工裝外套／襯衫外套', 'HK$1,600–2,000'],
            ['內搭', 'Stüssy 質感寬鬆圓領針織衫', 'HK$1,500'],
            ['長褲', 'Dickies 打褶休閒褲／Carhartt WIP 寬鬆工裝褲', 'HK$800–1,000'],
            ['鞋履', 'New Balance 1906R／2002R 復古運動鞋', 'HK$1,190–1,300'],
          ],
        },
        note: priceNote,
      },
    ],
    faqs: [
      ['第一次約會應否穿西裝？', '除非場地或活動需要，否則毋須刻意穿全套西裝。乾淨、有質感而容易活動的 Smart Casual 通常更自然。'],
      ['怎樣避免約會穿搭太用力？', '只保留一個造型重點，其他單品使用簡潔顏色與輪廓；鞋履、頭髮和衣物整潔度往往比增加配件更重要。'],
    ],
    related: ['colour-summer-style', 'fit-proportion', 'work-smart-casual'],
  },
  {
    slug: 'colour-summer-style',
    navLabel: '配色與夏季穿搭',
    category: '色彩與氣候',
    title: '香港男士配色與夏季穿搭指南',
    description: '香港炎熱潮濕，男士如何以 Clean Fit、近似色和透氣材質穿出清爽層次？提供一週配色、材質平衡及夏季單品方法。',
    directAnswer: '香港夏季穿搭應先處理透氣與整潔，再增加層次。選擇明度接近、飽和度柔和的兩至三個主色，配合薄身棉、麻或輕量混紡；即使層次不多，清楚肩線、直筒褲及乾淨鞋履仍能令形象完整。',
    hero: { src: '/a2o/knowledge/clean-fit-colours.webp', alt: '白、黑、棕、灰、淺藍與卡其的男士 Clean Fit 一週配色示例' },
    sections: [
      {
        heading: '一週低難度 Clean Fit 配色',
        paragraphs: ['Clean Fit 的關鍵不是單品昂貴，而是色彩、剪裁與鞋履保持同一個節奏。先用衣櫃已有的中性色建立七組容易重複的搭配。'],
        table: {
          headers: ['日子', '配色建議'],
          rows: [
            ['星期一', '海軍藍上衣＋米白直筒褲：穩定而清爽。'], ['星期二', '炭灰上衣＋深灰褲：低對比且俐落。'], ['星期三', '白色 T-shirt＋卡其褲：明亮但不浮誇。'], ['星期四', '淺藍襯衫＋深藍褲：適合會議與見客。'], ['星期五', '橄欖綠 Polo＋米色褲：成熟而有層次。'], ['星期六', '燕麥色針織＋棕色褲：柔和且適合社交。'], ['星期日', '黑色上衣＋深靛藍牛仔褲：簡單、乾淨、易重複。'],
          ],
        },
      },
      {
        heading: '近似色令夏日造型更有層次',
        paragraphs: ['近似色並非全身一樣，而是利用深淺、材質和鞋履製造細緻差異。米白配燕麥、淺藍配霧藍、卡其配沙棕、灰綠配橄欖綠，都適合香港夏季。'],
        image: { src: '/a2o/knowledge/summer-analogous-colours.webp', alt: '米白、淺藍、卡其、橄欖綠等近似色男士夏日搭配', caption: '顏色接近時，利用布料質感、深淺及鞋履增加層次。' },
      },
      {
        heading: '香港夏季單品先看透氣與秩序',
        paragraphs: ['短袖襯衫需要有清楚肩線；薄身針織 Polo 比普通 T-shirt 更適合見客；麻質襯衫可接受自然紋理，但領口和下擺仍要整潔；長褲則以棉、麻或薄羊毛混紡為主，避免緊貼小腿。'],
        image: { src: '/a2o/knowledge/hong-kong-summer.webp', alt: '短袖襯衫、針織 Polo、麻質襯衫與輕量外搭的香港男士夏季穿搭', caption: '夏季造型需要空氣感，但剪裁與鞋履仍要有秩序。' },
      },
    ],
    faqs: [['男士全身可以有多少種顏色？', '初學者可先限制為兩至三個主色，再利用深淺、紋理與少量配件增加變化。'], ['夏天是否只能穿 T-shirt？', '不需要。薄身針織 Polo、短袖襯衫和柔軟麻質襯衫都能保持透氣，同時提供更完整的領口與輪廓。']],
    related: ['work-smart-casual', 'dating-style', 'wardrobe-system'],
  },
  {
    slug: 'fit-proportion',
    navLabel: '身形比例與版型',
    category: '比例與剪裁',
    title: '男士身形比例與服裝版型指南',
    description: '男士衣長、褲長、上衣合身度、褲型與鞋履如何影響身形比例？用清晰比較圖及檢查方法改善整體輪廓。',
    directAnswer: '改善身形比例應先處理上下裝的分界與垂直線條：上衣不要壓縮腿部、褲腳不要堆積、鞋型需要承托褲管。合身亦不等於緊身；肩線、胸腹活動空間和褲檔舒適度比標籤上的尺碼更重要。',
    hero: { src: '/a2o/knowledge/top-length.webp', alt: '不同男士上衣衣長對腿部比例影響的比較圖' },
    sections: [
      {
        heading: '衣長決定上下身分界',
        paragraphs: ['T-shirt 下擺可落在褲頭下方約三至六厘米；Polo 覆蓋褲頭但避免接近大腿中段；外穿襯衫略長於褲頭即可。過長的下擺通常比稍寬的肩線更容易壓縮腿部比例。'],
        image: { src: '/a2o/knowledge/top-fit.webp', alt: 'T-shirt、長袖襯衫與短袖襯衫的男士合身示例', caption: '試穿後先看肩線，再看胸腹活動空間與下擺位置。' },
      },
      {
        heading: '褲長要配合鞋面與褲型',
        paragraphs: ['直筒西褲可輕觸鞋面或只有一次自然折痕；微寬鬆長褲可覆蓋鞋面上緣但不能拖地；九分褲則露出少量腳踝或襪子。走動後仍能保持乾淨線條，才是合適褲長。'],
        image: { src: '/a2o/knowledge/trouser-length.webp', alt: '男士不同褲長與鞋面接觸位置比較', caption: '褲腳不堆積，整體造型便會更俐落。' },
      },
      {
        heading: '鞋與褲要使用同一種比例語言',
        paragraphs: ['直筒褲配 Loafer 時，褲腳自然輕觸鞋面；較寬的褲管需要有適度份量的鞋頭承托；丹寧褲配皮革球鞋則要控制鞋底厚度與顏色數量。'],
        image: { src: '/a2o/knowledge/shoe-trouser-continuity.webp', alt: '皮鞋、樂福鞋與球鞋配不同男士長褲的鞋褲連貫示例', caption: '鞋履不必搶眼；鞋型與褲管份量一致，整個人會更完整。' },
      },
    ],
    faqs: [['褲越窄是否越顯瘦？', '不一定。過度緊身會突出臀腿並破壞垂直線條；直筒或微寬鬆輪廓通常更成熟，也更容易平衡上身。'], ['短身男士是否一定要穿九分褲？', '不一定。完整而不堆積的長褲同樣可以延伸腿線，重點是褲腰、褲長、鞋面和上下身色彩分界。']],
    related: ['work-smart-casual', 'dating-style', 'wardrobe-system'],
  },
  {
    slug: 'wardrobe-system',
    navLabel: '衣櫃系統',
    category: '長期管理',
    title: '簡單實用的男士衣櫃系統',
    description: '男士毋須一次更換整個衣櫃。先修正常見形象扣分位，再建立每件單品至少可配搭三次的基礎衣櫃矩陣。',
    directAnswer: '實用衣櫃不是擁有最多衣服，而是每件基礎單品都能配搭至少三次。先建立上衣、下裝、外搭與鞋履的低對比矩陣，再按工作角色、個人色彩和生活需要補充變化，可以同時減少錯誤購物與每天選擇壓力。',
    hero: { src: '/a2o/knowledge/wardrobe-system.webp', alt: '白、深藍、米色、灰色男士上衣長褲外套鞋履組成的基礎衣櫃' },
    sections: [
      {
        heading: '先修正最容易扣分的細節',
        paragraphs: ['形象問題通常不是敗在單件衣服，而是衣長、褲長、鞋履與整潔度沒有一起完成。先處理過長上衣、過緊褲型、褲腳堆積、鞋面凌亂、顏色過多及衣物欠缺整理。'],
        image: { src: '/a2o/knowledge/common-image-mistakes.webp', alt: '過緊及比例混亂造型與乾淨直筒比例的男士穿搭比較', caption: '先修正輪廓與整潔度，效果通常比增加新單品更明顯。' },
      },
      {
        heading: '建立可互相配搭的基礎矩陣',
        paragraphs: ['基礎單品應先覆蓋最常出現的工作與生活場合，再按個人色彩加入變化。顏色不必全部相同，但明度、飽和度及材質應容易互相協調。'],
        table: {
          headers: ['類別', '基礎單品', '優先色彩'],
          rows: [
            ['上衣', '白色 T-shirt、針織 Polo、淺藍襯衫', '白、灰、海軍藍、淺藍'],
            ['下裝', '卡其直筒褲、深灰長褲、深靛丹寧褲', '米白、卡其、灰、深藍'],
            ['外搭', '炭灰 Overshirt、輕量外套或西裝外套', '炭灰、海軍藍、橄欖綠'],
            ['鞋履', '黑色 Loafer、白色皮革球鞋、深棕皮鞋', '黑、白、深棕'],
          ],
        },
      },
      {
        heading: '用三次配搭規則控制購物',
        paragraphs: ['購買前先列出新單品能與現有衣櫃完成的三套搭配。如果只能配一件褲或只適合一個場合，使用率通常偏低。合身修改、熨燙和鞋面清潔亦應視為衣櫃系統的一部分。'],
        image: { src: '/a2o/knowledge/clean-fit-colours.webp', alt: '七組可互相重複使用的男士中性色 Clean Fit 搭配', caption: '一套穩定色盤可以降低每天選擇壓力，亦令新單品更容易融入衣櫃。' },
      },
    ],
    faqs: [['建立基礎衣櫃是否要一次買齊？', '不需要。先處理最高頻場合和最影響比例的單品，再按使用次數逐步補充，會比一次大量購物更準確。'], ['衣櫃應該有多少件衣服？', '沒有固定數字。重點是常用單品能互相配搭、尺碼與狀態合適，而且能覆蓋你的工作、社交與休閒需要。']],
    related: ['colour-summer-style', 'fit-proportion', 'work-smart-casual'],
  },
]

export const knowledgeBySlug = Object.fromEntries(knowledgeArticles.map((article) => [article.slug, article]))
