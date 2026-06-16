'use client';

import React from 'react';
import type { Database } from '@/types/database';
import { calculateKumbaraStatus, KUMBARA_STATUS_COLORS } from '@/lib/utils';

type Firm = Database['public']['Tables']['firms']['Row'];
type PiggyBank = Database['public']['Tables']['piggy_banks']['Row'];

interface FirmDetailsPanelProps {
  firm: Firm;
  piggyBanks: PiggyBank[];
  onClose: () => void;
}

export function FirmDetailsPanel({ firm, piggyBanks, onClose }: FirmDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'piggyBanks' | 'history'>('info');

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-20 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold truncate">{firm.name}</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'info' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Genel Bilgiler
        </button>
        <button
          onClick={() => setActiveTab('piggyBanks')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'piggyBanks' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Kumbaralar
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'history' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Geçmiş
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Yetkili</h3>
              <p className="text-sm">{firm.representative_name || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Telefon</h3>
              <p className="text-sm">{firm.representative_phone || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Adres</h3>
              <p className="text-sm">
                {[firm.city, firm.district, firm.neighborhood, firm.street, firm.building_no]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Durum</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                firm.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {firm.status === 'active' ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            {firm.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notlar</h3>
                <p className="text-sm text-gray-700">{firm.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'piggyBanks' && (
          <div className="space-y-3">
            {piggyBanks.map((pb) => {
              const status = calculateKumbaraStatus(pb.next_replacement_date);
              return (
                <div key={pb.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Kumbara #{pb.number}</span>
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: KUMBARA_STATUS_COLORS[status] }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Yerleştirme: {new Date(pb.placement_date).toLocaleDateString('tr-TR')}</p>
                    <p>Sonraki Değişim: {new Date(pb.next_replacement_date).toLocaleDateString('tr-TR')}</p>
                    <p>Toplam Bağış: ₺{pb.total_donation.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center text-gray-500 py-8">
            <p>Henüz işlem geçmişi bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function useState<T>(initial: T): [T, (value: T) => void] {
  const [state, setState] = React.useState(initial);
  return [state, setState];
}
