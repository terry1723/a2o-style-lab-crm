import { Palette, CheckCircle, XCircle } from 'lucide-react';
import { type ClientData } from '../lib/clientData';
import { getSeasonPreset, getColorName } from '../lib/colorPresets';

interface ColorReportProps {
  client: ClientData;
}

export default function ColorReport({ client }: ColorReportProps) {
  const preset = getSeasonPreset(client.seasonal_type);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-start gap-2 mb-2">
        <Palette className="w-4 h-4 text-[#D4849A] mt-0.5" />
        <div>
          <div className="font-medium text-sm">
            {preset ? `${preset.zh} / ${preset.en}` : client.seasonal_type}
          </div>
          {preset && (
            <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-a2o-beige text-a2o-black/60">色調：{preset.tone}</span>
              <span className="px-2 py-0.5 rounded-full bg-a2o-beige text-a2o-black/60">明度：{preset.value}</span>
              <span className="px-2 py-0.5 rounded-full bg-a2o-beige text-a2o-black/60">彩度：{preset.chroma}</span>
            </div>
          )}
        </div>
      </div>

      {preset && (
        <div className="rounded-xl border border-a2o-warm bg-white p-3">
          <div className="text-xs text-gray-500 mb-2">12 季色版參考色盤</div>
          <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
            {preset.palette.map((hex, index) => (
              <div
                key={`${hex}-${index}`}
                title={`${getColorName(hex, index)} ${hex}`}
                className="aspect-square rounded-md border border-gray-100 shadow-sm"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {client.color_strategy && (
        <div className="text-sm bg-a2o-beige rounded-lg p-3">
          <span className="text-gray-500">核心策略：</span>{client.color_strategy}
        </div>
      )}

      {client.suitable_colors && client.suitable_colors.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">適合顏色 / 色彩方向</div>
          <div className="flex flex-wrap gap-2">
            {client.suitable_colors.map(c => (
              <div key={c} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                <span className="text-xs text-green-700">{c}</span>
                <CheckCircle className="w-3 h-3 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {client.avoid_colors && client.avoid_colors.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">需要避免 / 遠離</div>
          <div className="flex flex-wrap gap-2">
            {client.avoid_colors.map(c => (
              <div key={c} className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <span className="text-xs text-red-600">{c}</span>
                <XCircle className="w-3 h-3 text-red-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {client.materials && client.materials.length > 0 && (
        <div className="text-sm"><span className="text-gray-500">推薦材質：</span>{client.materials.join('、')}</div>
      )}
      {client.metals && client.metals.length > 0 && (
        <div className="text-sm"><span className="text-gray-500">推薦金屬：</span>{client.metals.join('、')}</div>
      )}
      {client.neutral_colors && client.neutral_colors.length > 0 && (
        <div className="text-sm"><span className="text-gray-500">最佳中性色：</span>{client.neutral_colors.join('、')}</div>
      )}
      {client.glasses && <div className="text-sm"><span className="text-gray-500">眼鏡框：</span>{client.glasses}</div>}
      {client.watch && <div className="text-sm"><span className="text-gray-500">手錶：</span>{client.watch}</div>}
      {client.color_notes && <div className="text-sm whitespace-pre-line"><span className="text-gray-500">備註：</span>{client.color_notes}</div>}
    </div>
  );
}
