# A2O Homepage Motion Design

## Goal

在不改變現有黑白視覺、彩色案例照片、文案、CTA、檢測流程或 CRM 邏輯的前提下，為 A2O 公開主頁加入克制但具記憶點的動態語言。

## Approved Direction

採用「B｜參考式動態」：吸收參考頁的分層、橫向文字與滾動節奏，但保持私人形象顧問品牌應有的沉穩感。動態只套用於 Hero、Hero 與檢測區之間的跑馬燈、檢測區、案例區及服務內容區。其他區塊維持安靜。

## Motion Behaviour

### Hero

- 標題、內文及 CTA 首次載入時由下向上淡入。
- 右側客戶案例圖延遲約 0.15 秒進場。
- 桌面版以指標位置產生極輕微景深偏移；指標離開後回到原位。
- 手機版不啟用景深偏移。
- 不改 Hero 排版、黑白配色或彩色相片。

### Marquee

- 置於 Hero 與檢測區之間。
- 暖白底、黑色粗體字，文字為：`PROPORTION · COLOUR · GROOMING · STYLE · A2O STYLE LAB`。
- 使用多份相同文字形成無縫向左循環，正常速度約 18 秒一圈。
- 指標停留時只減速，不完全停止。
- reduced-motion 模式顯示靜態單行文字。

### Assessment

- 中央直屏檢測及影片不套用縮放、位移或持續動畫。
- 桌面左右案例背景首次進入畫面時由外側輕微滑入，文字稍後淡入。
- 動畫只播放一次。
- 手機版沿用無側欄設計，不新增動畫。
- 檢測互動開始後不得有持續背景動畫。

### Transformations

- 區塊標題先淡入，案例卡片按次序以短距離向上進場。
- 卡片 hover 時圖片只放大至約 1.025，不旋轉。
- 所有 Before／After 圖片保持正常顏色。
- 現有左右輪播、鍵盤操作及 tracking 保持不變。

### Services

- 左側標題首次進入視窗時淡入。
- 右側項目逐行進場，間距約 0.06 秒。
- 圖標只作輕微縮放，箭嘴 hover 時向右移少量距離。
- 不改白底、黑字、服務內容或圖標設計。

## Triggering and Accessibility

- 進場動畫在元素首次約 15–20% 進入可視範圍時播放一次；離開再返回不重播。
- 使用 Framer Motion 與 CSS transform/opacity，不新增依賴。
- 手機版位移和延遲約為桌面的一半。
- `prefers-reduced-motion` 啟用時，取消跑馬燈、景深、滑入及分段進場；內容仍完整可見。
- 不以顏色單獨表達狀態，不改 focus、ARIA 或鍵盤操作。

## Non-goals

- 不修改評估影片播放、聲音、問題流程或資料提交。
- 不修改 CRM、Supabase、Slack、Google Sheets 或 Portal。
- 不加入新顏色、旋轉、彈跳、強烈縮放或全頁 scroll-scrubbing。
- 不為 FAQ、客戶常見轉變、適合對象或底部 CTA 新增進場動畫。

## Verification

- 元件測試驗證跑馬燈文字、motion 結構及圖片保留原色。
- reduced-motion 測試驗證動態被停用而內容仍可見。
- 完整 Vitest、TypeScript/Vite build 與 ESLint。
- 桌面 1440×1000、手機 390×844 實際瀏覽器驗收。
- 核對主頁 CTA、檢測開始、案例輪播及 Portal route 未受影響。

