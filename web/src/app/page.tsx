'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useData } from '@/hooks/useData';
import { KUMBARA_STATUS_COLORS, epochToDate } from '@/lib/utils';
import type { Firma, Kumbara } from '@/lib/supabase';

// Basit bir header bileşeni
const Header = ({ loading, useMock, refresh }: { loading: boolean; useMock: boolean; refresh: () => void }) => (
  <div className="bg-blue-600 text-white p-4 shadow-md flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
        <span className="text-blue-600 font-bold text-xl">K</span>
      </div>
      <div>
        <h1 className="text-xl font-bold">Kumbara Takip Sistemi</h1>
        <div className="flex items-center gap-2 text-sm text-blue-100">
          {loading ? (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              Veriler yükleniyor...
            </span>
          ) : useMock ? (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              Demo Verileri Kullanılıyor
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Veritabanı Bağlantısı Aktif
            </span>
          )}
        </div>
      </div>
    </div>
    <button 
      onClick={refresh} 
      className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm transition"
    >
      🔄 Yenile
    </button>
  </div>
);

// Basit, hızlı bir harita stili (OpenStreetMap)
const SIMPLE_STYLE = {
  version: 8 as const,
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { firmalar, kumbaralar, loading, useMock, refresh, getFirmayaAitKumbaralar } = useData();
  const [seciliFirma, setSeciliFirma] = useState<Firma | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [aramaSorgusu, setAramaSorgusu] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState<Firma[]>([]);
  const [haritaYuklendi, setHaritaYuklendi] = useState(false);
  const [gorusModu, setGorusModu] = useState<'harita' | 'liste'>('harita');
  const [firmaEkleModalAcik, setFirmaEkleModalAcik] = useState(false);
  const [yeniFirmaKonum, setYeniFirmaKonum] = useState<[number, number] | null>(null);
  const onizlemeMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Modal kapandığında önizleme marker'ını kaldır
  useEffect(() => {
    if (firmaEkleModalAcik && yeniFirmaKonum && haritaYuklendi && map.current) {
      // Modal açıldığında ve harita yüklüyse önizleme marker'ını göster
      const el = document.createElement('div');
      el.className = 'onizleme-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#10B981';
      el.style.border = '4px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.innerHTML = '<span style="color:white;font-size:20px;display:flex;align-items:center;justify-content:center;height:100%;">📍</span>';
      
      if (onizlemeMarkerRef.current) {
        onizlemeMarkerRef.current.remove();
      }
      
      onizlemeMarkerRef.current = new maplibregl.Marker(el)
        .setLngLat(yeniFirmaKonum)
        .addTo(map.current);
    } else if (!firmaEkleModalAcik && onizlemeMarkerRef.current) {
      // Modal kapandığında marker'ı kaldır
      onizlemeMarkerRef.current.remove();
      onizlemeMarkerRef.current = null;
    }
  }, [firmaEkleModalAcik, yeniFirmaKonum, haritaYuklendi]);

  // Arama fonksiyonu
  const handleArama = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sorgu = e.target.value.toLowerCase();
    setAramaSorgusu(sorgu);
    
    if (sorgu.length < 2) {
      setAramaSonuclari([]);
      return;
    }

    const sonuclar = firmalar.filter(firma => 
      firma.ad.toLowerCase().includes(sorgu) ||
      firma.ilce.toLowerCase().includes(sorgu) ||
      firma.mahalle.toLowerCase().includes(sorgu) ||
      firma.yetkiliAd.toLowerCase().includes(sorgu)
    );
    
    setAramaSonuclari(sonuclar.slice(0, 10));
  };

  // Sonuca tıklandığında haritada o konuma git
  const firmayiSec = (firma: Firma) => {
    if (map.current && firma.latitude && firma.longitude && gorusModu === 'harita') {
      map.current.flyTo({
        center: [firma.longitude, firma.latitude],
        zoom: 15,
        essential: true
      });
    }
    setSeciliFirma(firma);
    setAramaSorgusu('');
    setAramaSonuclari([]);
  };

  useEffect(() => {
    if (!mapContainer.current || !isClient || gorusModu !== 'harita') return;

    try {
      // Çok basit, hafif harita
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: SIMPLE_STYLE,
        center: [32.8597, 39.9334], // Ankara merkezi
        zoom: 11,
        maxZoom: 18,
        minZoom: 7,
        pitchWithRotate: false,
        dragRotate: false,
      });

      // Sadece temel kontroller
      map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      // Harita yüklendiğinde
      map.current.on('load', () => {
        setHaritaYuklendi(true);
      });

      // Haritaya tıklandığında konumu güncelle (modal açıksa)
      map.current.on('click', (e) => {
        // Eğer bir feature (marker) tıklandıysa işlem yapma
        const features = map.current?.queryRenderedFeatures(e.point);
        const isMarkerClicked = features?.some(f => f.layer?.id?.includes('marker'));
        
        if (!isMarkerClicked) {
          const konum: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          
          if (firmaEkleModalAcik) {
            // Modal açıksa sadece konumu güncelle ve marker'ı göster
            setYeniFirmaKonum(konum);
            updateOnizlemeMarker(konum);
          } else {
            // Modal kapalıysa modalı aç
            setYeniFirmaKonum(konum);
            updateOnizlemeMarker(konum);
            setFirmaEkleModalAcik(true);
          }
        }
      });
      
      // Önizleme marker'ını güncelleyen yardımcı fonksiyon
      const updateOnizlemeMarker = (konum: [number, number]) => {
        if (onizlemeMarkerRef.current) {
          onizlemeMarkerRef.current.remove();
        }
        
        const el = document.createElement('div');
        el.className = 'onizleme-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#10B981';
        el.style.border = '4px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.innerHTML = '<span style="color:white;font-size:20px;display:flex;align-items:center;justify-content:center;height:100%;">📍</span>';
        
        onizlemeMarkerRef.current = new maplibregl.Marker(el)
          .setLngLat(konum)
          .addTo(map.current!);
      };
      
      // Modal kapandığında önizleme marker'ını kaldır
      return () => {
        if (onizlemeMarkerRef.current) {
          onizlemeMarkerRef.current.remove();
        }
      };

    } catch (error) {
      console.error('Harita hatası:', error);
      setGorusModu('liste');
    }

    return () => {
      map.current?.remove();
    };
  }, [isClient, gorusModu]);

  // Markerları haritaya ekle
  const markerlariEkle = () => {
    if (!map.current || !firmalar.length) return;

    // Eski markerları temizle
    const markers = document.querySelectorAll('.marker');
    markers.forEach(m => m.remove());

    // Sadece konumu olan firmaları göster
    const gecerliFirmalar = firmalar.filter(firma => firma.latitude && firma.longitude);

    gecerliFirmalar.forEach((firma) => {
      const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
      
      // Duruma göre renk belirle - en kötü durumu göster
      let durumRengi: string = KUMBARA_STATUS_COLORS['Yeni'];
      const durumlar = firmayaAitKumbaralar.map(k => k.durum);
      
      if (durumlar.includes('Kırmızı')) durumRengi = KUMBARA_STATUS_COLORS['Kırmızı'];
      else if (durumlar.includes('Turuncu')) durumRengi = KUMBARA_STATUS_COLORS['Turuncu'];
      else if (durumlar.includes('Sarı')) durumRengi = KUMBARA_STATUS_COLORS['Sarı'];

      // Marker elementi oluştur
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = durumRengi;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '13px';
      el.textContent = firmayaAitKumbaralar.length.toString();

      // Marker'ı ekle
      const marker = new maplibregl.Marker(el)
        .setLngLat([firma.longitude!, firma.latitude!])
        .addTo(map.current!);

      // Tıklama olayı
      marker.getElement().addEventListener('click', () => {
        firmayiSec(firma);
      });
    });
  };

  // Markerları haritaya ekle - veriler veya harita değiştiğinde
  useEffect(() => {
    if (haritaYuklendi && gorusModu === 'harita') {
      markerlariEkle();
    }
  }, [haritaYuklendi, gorusModu, firmalar, kumbaralar]);

  if (!isClient) {
    return (
      <div className="flex flex-col h-screen">
        <Header loading={true} useMock={false} refresh={() => {}} />
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">Uygulama başlatılıyor...</p>
        </div>
      </div>
    );
  }

  const seciliFirmaninKumbaralari = seciliFirma ? getFirmayaAitKumbaralar(seciliFirma.id) : [];

  return (
    <div className="flex flex-col h-screen" suppressHydrationWarning>
      <Header loading={loading} useMock={useMock} refresh={refresh} />
      
      {/* Üst kontroller */}
      <div className="p-3 bg-gray-50 border-b flex gap-2 items-center">
        <button
          onClick={() => setGorusModu('harita')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            gorusModu === 'harita' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🗺️ Harita
        </button>
        <button
          onClick={() => setGorusModu('liste')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            gorusModu === 'liste' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📋 Firma Listesi
        </button>
        {gorusModu === 'harita' && (
          <button
            onClick={() => {
              // Ankara merkezinden başla ama konumu haritadan seçmeye izin ver
              setYeniFirmaKonum([32.8597, 39.9334]);
              setFirmaEkleModalAcik(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            ➕ Yeni Firma Ekle
          </button>
        )}
        
        {/* Arama kutusu */}
        <div className="flex-1 max-w-md ml-4 relative">
          <input
            type="text"
            placeholder="Firma, ilçe, mahalle, yetkili ara..."
            value={aramaSorgusu}
            onChange={handleArama}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Arama sonuçları */}
          {aramaSonuclari.length > 0 && (
            <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border z-50 max-h-60 overflow-y-auto">
              {aramaSonuclari.map(firma => (
                <div 
                  key={firma.id} 
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => firmayiSec(firma)}
                >
                  <div className="font-semibold text-sm">{firma.ad}</div>
                  <div className="text-xs text-gray-500">{firma.mahalle}, {firma.ilce} - {firma.tur}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Harita görünümü */}
        {gorusModu === 'harita' && (
          <div ref={mapContainer} className="w-full h-full bg-gray-200" />
        )}

        {/* Liste görünümü */}
        {gorusModu === 'liste' && (
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-lg font-bold mb-4">Tüm Firmalar ({firmalar.length})</h2>
            <div className="grid gap-3">
              {firmalar.map(firma => {
                const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
                // En kritik durumu bul
                let enKritikDurum = 'Yeni';
                const durumlar = firmayaAitKumbaralar.map(k => k.durum);
                if (durumlar.includes('Kırmızı')) enKritikDurum = 'Kırmızı';
                else if (durumlar.includes('Turuncu')) enKritikDurum = 'Turuncu';
                else if (durumlar.includes('Sarı')) enKritikDurum = 'Sarı';
                
                return (
                  <div
                    key={firma.id}
                    onClick={() => firmayiSec(firma)}
                    className="p-4 bg-white rounded-lg border hover:shadow-md cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{firma.ad}</h3>
                        <p className="text-sm text-gray-500">{firma.mahalle}, {firma.ilce} • {firma.tur}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {firmayaAitKumbaralar.length} Kumbara
                        </span>
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: KUMBARA_STATUS_COLORS[enKritikDurum as keyof typeof KUMBARA_STATUS_COLORS] }}
                        ></span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-600">
                      <span>👤 {firma.yetkiliAd}</span>
                      <span>📞 {firma.yetkiliTelefon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Seçili firma paneli */}
        {seciliFirma && (
          <div className="absolute bottom-0 left-0 right-0 md:top-4 md:right-4 md:left-auto md:w-96 bg-white rounded-t-lg md:rounded-lg shadow-xl p-4 z-10 md:h-auto md:bottom-auto max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{seciliFirma.ad}</h2>
              <button 
                onClick={() => setSeciliFirma(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Tür:</span>
                  <p className="font-medium">{seciliFirma.tur}</p>
                </div>
                <div>
                  <span className="text-gray-500">Durum:</span>
                  <p className="font-medium">{seciliFirma.durum}</p>
                </div>
              </div>

              <div>
                <span className="text-gray-500">Yetkili:</span>
                <p className="font-medium">{seciliFirma.yetkiliAd}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Telefon:</span>
                  <p className="font-medium">{seciliFirma.yetkiliTelefon}</p>
                </div>
                {seciliFirma.alternatifTelefon && (
                  <div>
                    <span className="text-gray-500">Alternatif:</span>
                    <p className="font-medium">{seciliFirma.alternatifTelefon}</p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-gray-500">Adres:</span>
                <p className="font-medium">{seciliFirma.mahalle} Mah. {seciliFirma.sokak} No: {seciliFirma.kapiNo}, {seciliFirma.ilce}, {seciliFirma.il}</p>
              </div>

              {seciliFirma.aciklama && (
                <div>
                  <span className="text-gray-500">Açıklama:</span>
                  <p className="font-medium">{seciliFirma.aciklama}</p>
                </div>
              )}

              <hr className="my-2" />

              <div>
                <h3 className="font-bold mb-2">Kumbaralar ({seciliFirmaninKumbaralari.length})</h3>
                <div className="space-y-2">
                  {seciliFirmaninKumbaralari.map((kumbara) => (
                    <div 
                      key={kumbara.kumbaraNo} 
                      className="p-3 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">{kumbara.kumbaraNo}</span>
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: KUMBARA_STATUS_COLORS[kumbara.durum as keyof typeof KUMBARA_STATUS_COLORS] }}
                        >
                          {kumbara.durum}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Tip: {kumbara.kumbaraTipi}</p>
                        <p>Sonraki değişim: {epochToDate(kumbara.sonrakiDegisimTarihi)}</p>
                        <p>Toplam bağış: {kumbara.toplamBagis?.toLocaleString('tr-TR') || 0} ₺</p>
                        {kumbara.notlar && <p className="text-orange-600">⚠️ {kumbara.notlar}</p>}
                      </div>
                    </div>
                  ))}
                  {seciliFirmaninKumbaralari.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Bu firmaya henüz kumbara eklenmemiş.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sol bilgi paneli (sadece harita görünümünde) */}
        {gorusModu === 'harita' && haritaYuklendi && !loading && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 z-10 w-60">
            <h3 className="font-bold mb-3 text-sm">İstatistikler</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Firma:</span>
                <span className="font-semibold">{firmalar.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Kumbara:</span>
                <span className="font-semibold">{kumbaralar.length}</span>
              </div>
              <hr className="my-2" />
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: KUMBARA_STATUS_COLORS['Yeni'] }}></div>
                  <span>Yeni</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: KUMBARA_STATUS_COLORS['Sarı'] }}></div>
                  <span>Bu ay değişecek</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: KUMBARA_STATUS_COLORS['Turuncu'] }}></div>
                  <span>Bu hafta değişecek</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: KUMBARA_STATUS_COLORS['Kırmızı'] }}></div>
                  <span>Gecikmiş</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Firma Ekleme Modal */}
        {firmaEkleModalAcik && yeniFirmaKonum && (
          <FirmaEkleModal
            konum={yeniFirmaKonum}
            kapali={() => setFirmaEkleModalAcik(false)}
            kaydedildi={() => {
              setFirmaEkleModalAcik(false);
              refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Firma Ekleme Modal Bileşeni
function FirmaEkleModal({ 
  konum, 
  kapali, 
  kaydedildi 
}: { 
  konum: [number, number], 
  kapali: () => void, 
  kaydedildi: () => void 
}) {
  const [form, setForm] = useState({
    ad: '',
    tur: 'Market',
    yetkiliAd: '',
    yetkiliTelefon: '',
    alternatifTelefon: '',
    il: 'Ankara',
    ilce: '',
    mahalle: '',
    sokak: '',
    kapiNo: '',
    aciklama: '',
    durum: 'Aktif'
  });

  const turler = ['Market', 'Kafe', 'Restoran', 'Otel', 'Okul', 'Hastane', 'Avukat', 'Diş Hekimi', 'Giyim', 'Elektronik', 'Diğer'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Şimdilik alert gösterelim, gerçek uygulamada Supabase'e kaydedilecek
    alert(`Firma kaydedildi!\nAd: ${form.ad}\nKonum: ${konum[1].toFixed(4)}, ${konum[0].toFixed(4)}`);
    kaydedildi();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Yeni Firma Ekle</h2>
          <button 
            onClick={kapali}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı *</label>
            <input
              required
              type="text"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Firma adını girin"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tür *</label>
              <select
                value={form.tur}
                onChange={(e) => setForm({ ...form, tur: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {turler.map(tur => <option key={tur} value={tur}>{tur}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={form.durum}
                onChange={(e) => setForm({ ...form, durum: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yetkili Kişi *</label>
            <input
              required
              type="text"
              value={form.yetkiliAd}
              onChange={(e) => setForm({ ...form, yetkiliAd: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Yetkili kişinin adı"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
              <input
                required
                type="tel"
                value={form.yetkiliTelefon}
                onChange={(e) => setForm({ ...form, yetkiliTelefon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="05xx xxx xx xx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternatif Telefon</label>
              <input
                type="tel"
                value={form.alternatifTelefon}
                onChange={(e) => setForm({ ...form, alternatifTelefon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="05xx xxx xx xx"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800 font-medium mb-1">📍 Haritada Tıklayarak Konum Seçin</div>
              <div className="text-xs text-blue-600 mb-2">Modal açıkken haritada istediğiniz yere tıklayın!</div>
              <div className="px-3 py-2 bg-white rounded border text-sm text-gray-600">
                Enlem: {konum[1].toFixed(6)}, Boylam: {konum[0].toFixed(6)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
              <input
                type="text"
                value={form.il}
                onChange={(e) => setForm({ ...form, il: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
              <input
                type="text"
                value={form.ilce}
                onChange={(e) => setForm({ ...form, ilce: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Çankaya"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mahalle</label>
              <input
                type="text"
                value={form.mahalle}
                onChange={(e) => setForm({ ...form, mahalle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sokak</label>
              <input
                type="text"
                value={form.sokak}
                onChange={(e) => setForm({ ...form, sokak: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kapı No</label>
            <input
              type="text"
              value={form.kapiNo}
              onChange={(e) => setForm({ ...form, kapiNo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Ekstra notlar..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={kapali}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              💾 Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
