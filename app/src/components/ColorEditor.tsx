import { useState, useEffect } from 'react';
import { Save, X, Check } from 'lucide-react';
import { type ClientData, SEASON_PRESETS } from '../lib/clientData';

const ALL_COLORS = [
  { name: '珊瑚橙', hex: '#FF7F50' }, { name: '金黃', hex: '#FFD700' }, { name: '駝色', hex: '#C19A6B' },
  { name: '蜜桃粉', hex: '#FFCBA4' }, { name: '蘋果綠', hex: '#8DB600' }, { name: '象牙白', hex: '#FFFFF0' },
  { name: '薰衣草紫', hex: '#E6E6FA' }, { name: '玫瑰粉', hex: '#FF66CC' }, { name: '灰藍', hex: '#7393B3' },
  { name: '鼠尾草綠', hex: '#9DC183' }, { name: '鐵鏽紅', hex: '#B7410E' }, { name: '磚紅', hex: '#CB4154' },
  { name: '茄紅', hex: '#C2185B' }, { name: '深咖啡', hex: '#4B3621' }, { name: '可可棕', hex: '#D2691E' },
  { name: '芥末黃', hex: '#E1AD01' }, { name: '薑黃', hex: '#B08D57' }, { name: '純黑', hex: '#1A1A1A' },
  { name: '寶藍', hex: '#0F4C81' }, { name: '翡翠綠', hex: '#50C878' }, { name: '洋紅', hex: '#FF00FF' },
  { name: '炭灰', hex: '#36454F' }, { name: '米白', hex: '#F5F5DC' }, { name: '橄欖綠', hex: '#808000' },
];

const ALL_TRAP_COLORS = [
  { name: '純黑', hex: '#000000' }, { name: '純白', hex: '#FFFFFF' }, { name: '寶藍', hex: '#0F4C81' },
  { name: '冷灰', hex: '#8C92AC' }, { name: '正紅', hex: '#FF0000' }, { name: '酒紅（冷）', hex: '#722F37' },
  { name: '薰衣草紫', hex: '#E6E6FA' }, { name: '螢光綠', hex: '#CCFF00' }, { name: '亮橘', hex: '#FF6700' },
  { name: '翠綠', hex: '#00A86B' }, { name: '淺粉', hex: '#FFB6C1' }, { name: '淡藍', hex: '#ADD8E6' },
  { name: '米白', hex: '#F5F5DC' }, { name: '檸檬黃', hex: '#FFF44F' }, { name: '金黃', hex: '#FFD700' },
  { name: '螢光粉', hex: '#FF1493' },
];

const ALL_MATERIALS = ['亞麻','柔軟棉布','絲質','麂皮','天鵝絨','燈芯絨','粗紡羊毛','皮革','法蘭絨','針織','牛仔','防水尼龍'];
const ALL_METALS = ['古銅金','玫瑰金','做舊金','香檳金','黃金','白金','銀色','啞光銀'];
const ALL_NEUTRALS = ['深咖啡','炭灰（暖）','暖深灰','可可色','海軍藍','石色','米色','橄欖綠'];

interface ColorEditorProps {
  client: ClientData;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ColorEditor({ client, onSave, onCancel }: ColorEditorProps) {
  const [seasonalType, setSeasonalType] = useState(client.seasonal_type || '');
  const [strategy, setStrategy] = useState(client.color_strategy || '');
  const [suitableColors, setSuitableColors] = useState<string[]>(client.suitable_colors || []);
  const [avoidColors, setAvoidColors] = useState<string[]>(client.avoid_colors || []);
  const [materials, setMaterials] = useState<string[]>(client.materials || []);
  const [metals, setMetals] = useState<string[]>(client.metals || []);
  const [glasses, setGlasses] = useState(client.glasses || '');
  const [watchStr, setWatchStr] = useState(client.watch || '');
  const [neutralColors, setNeutralColors] = useState<string[]>(client.neutral_colors || []);
  const [notes, setNotes] = useState(client.color_notes || '');

  useEffect(() => {
    if (seasonalType) {
      const preset = (SEASON_PRESETS as any)[seasonalType];
      if (preset) {
        setStrategy(preset.strategy || '');
        if (preset.materials) setMaterials(preset.materials);
        if (preset.metals) setMetals(preset.metals);
      }
    }
  }, [seasonalType]);

  const handleSave = () => {
    onSave({
      seasonal_type: seasonalType,
      color_strategy: strategy,
      suitable_colors: suitableColors,
      avoid_colors: avoidColors,
      materials,
      metals,
      glasses,
      watch: watchStr,
      neutral_colors: neutralColors,
      color_notes: notes,
    });
  };

  return (
    <div className="space-y-4 mt-3">
      {/* Season Type */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">季節類型</label>
        <select value={seasonalType} onChange={e => setSeasonalType(e.target.value)} className="w-full p-2 border rounded text-sm">
          <option value="">-- 選擇 --</option>
          {Object.keys(SEASON_PRESETS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Strategy */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">核心策略</label>
        <textarea value={strategy} onChange={e => setStrategy(e.target.value)} rows={2} className="w-full p-2 border rounded text-sm" />
      </div>

      {/* Suitable Colors - FREE PICK */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          適合顏色 <span className="text-xs font-normal text-gray-500">（自由點選）</span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ALL_COLORS.map((color) => (
            <button key={color.name} type="button" onClick={() => {
              setSuitableColors(prev => prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]);
            }} className={`relative rounded-lg p-2 border-2 transition-all ${suitableColors.includes(color.name) ? 'border-[#D4849A] bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="w-full aspect-square rounded-md mb-1 shadow-inner" style={{ backgroundColor: color.hex, border: ['#FFFFF0','#F5F5DC','#FFFFFF','#CCFF00','#FFF44F'].includes(color.hex) ? '1px solid #e5e5e5' : 'none' }}>
                {suitableColors.includes(color.name) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#D4849A] rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                  </div>
                )}
              </div>
              <span className="text-[10px] block text-center leading-tight text-gray-700">{color.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">已選 {suitableColors.length} 個：{suitableColors.join('、') || '未選擇'}</p>
      </div>

      {/* Avoid Colors */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          必須遠離 <span className="text-xs font-normal text-gray-500">（自由點選）</span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ALL_TRAP_COLORS.map((color) => (
            <button key={`avoid-${color.name}`} type="button" onClick={() => {
              setAvoidColors(prev => prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]);
            }} className={`relative rounded-lg p-2 border-2 transition-all ${avoidColors.includes(color.name) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="w-full aspect-square rounded-md mb-1 shadow-inner relative" style={{ backgroundColor: color.hex, border: ['#FFFFFF','#F5F5DC','#CCFF00','#FFF44F','#E6E6FA','#FFB6C1','#ADD8E6'].includes(color.hex) ? '1px solid #e5e5e5' : 'none' }}>
                {avoidColors.includes(color.name) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md"><X className="w-5 h-5 text-red-500" /></div>
                )}
              </div>
              <span className="text-[10px] block text-center leading-tight text-gray-700">{color.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">已標記 {avoidColors.length} 個：{avoidColors.join('、') || '未選擇'}</p>
      </div>

      {/* Neutral Colors */}
      <div>
        <label className="block text-sm font-semibold mb-2">最佳中性色</label>
        <div className="flex flex-wrap gap-2">
          {ALL_NEUTRALS.map((n) => (
            <button key={n} type="button" onClick={() => setNeutralColors(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${neutralColors.includes(n) ? 'bg-[#D4849A] text-white border-[#D4849A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#D4849A]'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div>
        <label className="block text-sm font-semibold mb-2">推薦材質</label>
        <div className="flex flex-wrap gap-2">
          {ALL_MATERIALS.map((m) => (
            <button key={m} type="button" onClick={() => setMaterials(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${materials.includes(m) ? 'bg-[#D4849A] text-white border-[#D4849A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#D4849A]'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Metals */}
      <div>
        <label className="block text-sm font-semibold mb-2">推薦金屬飾品</label>
        <div className="flex flex-wrap gap-2">
          {ALL_METALS.map((m) => (
            <button key={m} type="button" onClick={() => setMetals(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${metals.includes(m) ? 'bg-[#D4849A] text-white border-[#D4849A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#D4849A]'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Glasses & Watch */}
      <div className="grid grid-cols-2 gap-3">
        <input value={glasses} onChange={e => setGlasses(e.target.value)} placeholder="眼鏡框建議" className="p-2 border rounded text-sm" />
        <input value={watchStr} onChange={e => setWatchStr(e.target.value)} placeholder="手錶建議" className="p-2 border rounded text-sm" />
      </div>

      {/* Notes */}
      <div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="顏色分析備註" rows={2} className="w-full p-2 border rounded text-sm" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="flex-1 bg-[#D4849A] text-white py-2 rounded-lg hover:bg-[#c76a8a] flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> 保存
        </button>
        <button onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
      </div>
    </div>
  );
}
