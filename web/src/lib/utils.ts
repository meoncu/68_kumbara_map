// Kumbara durum renkleri - PROJE_DOKUMANI.md'ye göre
export const KUMBARA_STATUS_COLORS = {
  'Yeni': '#3B82F6',      // Mavi
  'Sarı': '#F59E0B',     // Sarı
  'Turuncu': '#F97316',  // Turuncu
  'Kırmızı': '#EF4444',  // Kırmızı
  'Yeşil': '#10B981',    // Yeşil
  'Mor': '#8B5CF6',      // Mor
  'Gri': '#6B7280',      // Gri
} as const;

export type KumbaraStatus = keyof typeof KUMBARA_STATUS_COLORS;

// Epoch zamanı (ms) normal tarihe çeviren yardımcı fonksiyon
export function epochToDate(epochMs: number | null | undefined): string {
  if (!epochMs) return '-';
  return new Date(epochMs).toLocaleDateString('tr-TR');
}

// Kumbara durumunu hesaplayan fonksiyon
export function calculateKumbaraStatus(sonrakiDegisimTarihi: number | string | null | undefined): KumbaraStatus {
  if (!sonrakiDegisimTarihi) return 'Yeni';
  
  const tarih = typeof sonrakiDegisimTarihi === 'string' ? Date.parse(sonrakiDegisimTarihi) : sonrakiDegisimTarihi;
  const now = Date.now();
  const diffMs = tarih - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Kırmızı';
  if (diffDays <= 7) return 'Turuncu';
  if (diffDays <= 30) return 'Sarı';
  return 'Yeni';
}
