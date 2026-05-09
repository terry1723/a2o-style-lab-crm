import { Palette, CheckCircle, XCircle } from 'lucide-react';
import { type ClientData } from '../lib/clientData';

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

interface ColorReportProps {
  client: ClientData;
}

export default function ColorReport({ client }: ColorReportProps) {
  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-4 h-4 text-[#D4849A]" />
        <span className="font-medium text-sm">{client.seasonal_type}</span>
        {client.color_strategy && <span className="text-xs text-gray-500">- {client.color_strategy}</span>}
      </div>

      {/* Suitable Colors */}
      {client.suitable_colors && client.suitable_colors.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">適合顏色</div>
          <div className="flex flex-wrap gap-2">
            {client.suitable_colors.map(c => {
              const colorData = ALL_COLORS.find(ac => ac.name === c);
              return (
                <div key={c} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                  {colorData && (
                    <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: colorData.hex }} />
                  )}
                  <span className="text-xs text-green-700">{c}</span>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Avoid Colors */}
      {client.avoid_colors && client.avoid_colors.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">必須遠離</div>
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

      {/* Materials & Metals */}
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
    </div>
  );
}
