import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { type ClientData } from '../lib/clientData';
import { SEASON_ORDER, TWELVE_SEASON_PRESETS, getColorName } from '../lib/colorPresets';

const ALL_MATERIALS = ['亞麻','柔軟棉布','絲質','麂皮','天鵝絨','燈芯絨','粗紡羊毛','皮革','法蘭絨','針織','牛仔','防水尼龍','光澤感面料','精紡羊毛'];
const ALL_METALS = ['古銅金','玫瑰金','做舊金','香檳金','黃金','白金','銀色','啞光銀','亮面金屬'];

interface ColorEditorProps {
  client: ClientData;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ColorEditor({ client, onSave, onCancel }: ColorEditorProps) {
  const [seasonalType, setSeasonalType] = useState(client.seasonal_type || '');
  const preset = seasonalType ? TWELVE_SEASON_PRESETS[seasonalType] : undefined;

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
    if (!preset) return;
    setStrategy(preset.strategy);
    setSuitableColors(preset.suitable);
    setAvoidColors(preset.avoid);
    setMaterials(preset.materials);
    setMetals(preset.metals);
    setGlasses(preset.glasses);
    setWatchStr(preset.watch);
    setNeutralColors(preset.neutrals);
    setNotes(preset.notes);
  }, [seasonalType]);

  const toggleArrayValue = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const handleSave = () => {
    const paletteNames = preset?.palette.map((hex, index) => `${getColorName(hex, index)} ${hex}`) || [];
    const dimensionText = preset ? `色調：${preset.tone}｜明度：${preset.value}｜彩度：${preset.chroma}` : '';

    onSave({
      seasonal_type: seasonalType,
      color_strategy: strategy,
      suitable_colors: suitableColors.length ? suitableColors : paletteNames,
      avoid_colors: avoidColors,
      materials,
      metals,
      glasses,
      watch: watchStr,
      neutral_colors: neutralColors,
      color_notes: [dimensionText, notes].filter(Boolean).join('\n'),
    });
  };

  return (
    <div className="space-y-4 mt-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">季節類型</label>
        <select
          value={seasonalType}
          onChange={e => setSeasonalType(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="">-- 選擇 12 季色彩類型 --</option>
          {SEASON_ORDER.map(key => {
            const season = TWELVE_SEASON_PRESETS[key];
            return <option key={key} value={key}>{season.zh} / {season.en}</option>;
          })}
        </select>
      </div>

      {preset && (
        <div className="rounded-xl border border-a2o-warm bg-a2o-beige p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-semibold text-a2o-black">{preset.zh}</div>
              <div className="text-xs text-a2o-black/50">{preset.en}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="px-2 py-1 rounded-full bg-white text-a2o-black/60">色調：{preset.tone}</span>
              <span className="px-2 py-1 rounded-full bg-white text-a2o-black/60">明度：{preset.value}</span>
              <span className="px-2 py-1 rounded-full bg-white text-a2o-black/60">彩度：{preset.chroma}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-a2o-black/50 mb-1">跟實體色版整理的適用色盤</div>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
              {preset.palette.map((hex, index) => (
                <div
                  key={`${hex}-${index}`}
                  title={`${getColorName(hex, index)} ${hex}`}
                  className="aspect-square rounded-md border border-white shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {preset.keywords.map(keyword => (
              <span key={keyword} className="text-xs px-2 py-1 rounded-full bg-white text-a2o-black/60">{keyword}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-600 mb-1">核心策略</label>
        <textarea value={strategy} onChange={e => setStrategy(e.target.value)} rows={3} className="w-full p-2 border rounded text-sm" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">適合顏色 / 色彩方向</label>
        <div className="flex flex-wrap gap-2">
          {suitableColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => toggleArrayValue(color, setSuitableColors)}
              className="px-3 py-1.5 rounded-full text-sm border bg-[#D4849A] text-white border-[#D4849A]"
            >
              {color}
            </button>
          ))}
        </div>
        <input
          className="w-full p-2 border rounded text-sm mt-2"
          placeholder="手動加入適合顏色，例如：粉藍"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const value = e.currentTarget.value.trim();
              if (value && !suitableColors.includes(value)) setSuitableColors(prev => [...prev, value]);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">需要避免 / 遠離</label>
        <div className="flex flex-wrap gap-2">
          {avoidColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => toggleArrayValue(color, setAvoidColors)}
              className="px-3 py-1.5 rounded-full text-sm border bg-red-50 text-red-600 border-red-200"
            >
              {color}
            </button>
          ))}
        </div>
        <input
          className="w-full p-2 border rounded text-sm mt-2"
          placeholder="手動加入避免顏色，例如：亮橙"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const value = e.currentTarget.value.trim();
              if (value && !avoidColors.includes(value)) setAvoidColors(prev => [...prev, value]);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">最佳中性色</label>
        <div className="flex flex-wrap gap-2">
          {neutralColors.map(n => (
            <button key={n} type="button" onClick={() => toggleArrayValue(n, setNeutralColors)}
              className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-300">
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">推薦材質</label>
        <div className="flex flex-wrap gap-2">
          {ALL_MATERIALS.map((m) => (
            <button key={m} type="button" onClick={() => toggleArrayValue(m, setMaterials)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${materials.includes(m) ? 'bg-[#D4849A] text-white border-[#D4849A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#D4849A]'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">推薦金屬飾品</label>
        <div className="flex flex-wrap gap-2">
          {ALL_METALS.map((m) => (
            <button key={m} type="button" onClick={() => toggleArrayValue(m, setMetals)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${metals.includes(m) ? 'bg-[#D4849A] text-white border-[#D4849A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#D4849A]'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={glasses} onChange={e => setGlasses(e.target.value)} placeholder="眼鏡框建議" className="p-2 border rounded text-sm" />
        <input value={watchStr} onChange={e => setWatchStr(e.target.value)} placeholder="手錶建議" className="p-2 border rounded text-sm" />
      </div>

      <div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="顏色分析備註" rows={3} className="w-full p-2 border rounded text-sm" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="flex-1 bg-[#D4849A] text-white py-2 rounded-lg hover:bg-[#c76a8a] flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> 保存
        </button>
        <button onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
      </div>
    </div>
  );
}
