'use client';

import { 
  Map, 
  Building, 
  PiggyBank, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings,
  TrendingUp
} from 'lucide-react';

const menuItems = [
  { icon: Map, label: 'Harita', active: true },
  { icon: Building, label: 'Firmalar' },
  { icon: PiggyBank, label: 'Kumbaralar' },
  { icon: Users, label: 'Ekip Yönetimi' },
  { icon: Calendar, label: 'Görev Planlama' },
  { icon: TrendingUp, label: 'Rotalar' },
  { icon: BarChart3, label: 'Raporlar' },
  { icon: Settings, label: 'Ayarlar' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              item.active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <h4 className="font-semibold mb-1">Günlük Özet</h4>
          <p className="text-blue-100 text-sm mb-3">
            Bugün 12 firma ziyareti planlandı
          </p>
          <button className="w-full bg-white text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-50">
            Detayları Gör
          </button>
        </div>
      </div>
    </aside>
  );
}
