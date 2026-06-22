'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useData } from '@/hooks/useData';
import { KUMBARA_STATUS_COLORS, epochToDate } from '@/lib/utils';
import type { Firma, Kumbara } from '@/lib/firebase';

// Basit bir header bileşeni
const Header = ({ loading, connected, refresh, ayarlarAc, setAyarlarAc }: { loading: boolean; connected: boolean; refresh: () => void; ayarlarAc: boolean; setAyarlarAc: (v: boolean) => void }) => (
  <div className="bg-blue-600 text-white p-4 shadow-md flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
        <span className="text-blue-600 font-bold text-xl">K</span>
      </div>
      <div>
        <h2 className="text-xl font-bold">Kumbara Takip Sistemi</h2>
        <div className="flex items-center gap-2 text-sm text-blue-100">
          {loading ? (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              Veriler yükleniyor...
            </span>
          ) : connected ? (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Firebase Bağlantısı Aktif
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              Bağlantı Yok
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => setAyarlarAc(true)}
        className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm transition"
      >
        ⚙️ Ayarlar
      </button>
      <button 
        onClick={refresh} 
        className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm transition"
      >
        🔄 Yenile
      </button>
    </div>
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

// Firma Türleri için Renkler ve İkonlar
const FIRMA_TURLERI = {
  'Market': { renk: '#FF5722', ikon: '🛒' },
  'Gıda': { renk: '#FF5722', ikon: '🛒' },
  'Kasap': { renk: '#E91E63', ikon: '🥩' },
  'Manav': { renk: '#4CAF50', ikon: '🥬' },
  'Restoran': { renk: '#FF9800', ikon: '🍴' },
  'Kafe': { renk: '#795548', ikon: '☕' },
  'Pastane': { renk: '#E91E63', ikon: '🍰' },
  'Giyim': { renk: '#9C27B0', ikon: '👕' },
  'Ayakkabı': { renk: '#9C27B0', ikon: '👟' },
  'Terzi': { renk: '#9C27B0', ikon: '🧵' },
  'Kuaför': { renk: '#00BCD4', ikon: '💇' },
  'Eczane': { renk: '#F44336', ikon: '💊' },
  'Diş Hekimi': { renk: '#00BCD4', ikon: '🦷' },
  'Elektronik': { renk: '#3F51B5', ikon: '📱' },
  'Diğer': { renk: '#607D8B', ikon: '🏪' },
};

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { firmalar, kumbaralar, loading, connected, refresh, getFirmayaAitKumbaralar, firmaEkle, firmaSil, firmaGuncelle, kumbaraEkle, kumbaraGuncelle, kumbaraSil } = useData();
  const [seciliFirma, setSeciliFirma] = useState<Firma | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [aramaSorgusu, setAramaSorgusu] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState<Firma[]>([]);
  const [haritaYuklendi, setHaritaYuklendi] = useState(false);
  const [gorusModu, setGorusModu] = useState<'harita' | 'liste'>('harita');
  const [firmaEkleModalAcik, setFirmaEkleModalAcik] = useState(false);
  const [yeniFirmaKonum, setYeniFirmaKonum] = useState<[number, number] | null>(null);
  const [silmeOnayiAcik, setSilmeOnayiAcik] = useState(false);
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [duzenlemeFormu, setDuzenlemeFormu] = useState<Partial<Firma>>({});
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const [toplamaPeriyoduGun, setToplamaPeriyoduGun] = useState(90); // 3 ay
  const [analizTarihi, setAnalizTarihi] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kumbaraModalAcik, setKumbaraModalAcik] = useState(false);
  const [duzenlenenKumbara, setDuzenlenenKumbara] = useState<Kumbara | null>(null);
  const [kumbaraFormu, setKumbaraFormu] = useState<Partial<Kumbara>>({});
  const [yeniFirmaFormu, setYeniFirmaFormu] = useState<Partial<Firma>>({
    tur: 'Market'
  });
  const onizlemeMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Kumbara durumu hesaplama
  const getKumbaraDurumu = (kumbara: Kumbara) => {
    const analizDate = new Date(analizTarihi);
    const sonrakiDate = new Date(kumbara.next_replacement_date);
    const gunFarki = Math.ceil((sonrakiDate.getTime() - analizDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (gunFarki <= 0) {
      return { durum: 'gecmis', renk: '#F44336', gun: Math.abs(gunFarki), yazi: `${Math.abs(gunFarki)} gün geçmiş` };
    } else if (gunFarki <= 7) {
      return { durum: 'acil', renk: '#FF5722', gun: gunFarki, yazi: `${gunFarki} gün kaldı` };
    } else if (gunFarki <= 30) {
      return { durum: 'yakinda', renk: '#FF9800', gun: gunFarki, yazi: `${gunFarki} gün kaldı` };
    } else if (gunFarki <= 60) {
      return { durum: 'orta', renk: '#FFEB3B', gun: gunFarki, yazi: `${gunFarki} gün kaldı` };
    } else {
      return { durum: 'guvende', renk: '#4CAF50', gun: gunFarki, yazi: `${gunFarki} gün kaldı` };
    }
  };

  // İstatistikleri hesapla
  const getKumbaraIstatistikleri = () => {
    const istatistikler = {
      toplam: 0,
      gecmis: 0,
      acil: 0,
      yakinda: 0,
      orta: 0,
      guvende: 0
    };
    
    kumbaralar.forEach(kumbara => {
      istatistikler.toplam++;
      const durum = getKumbaraDurumu(kumbara);
      istatistikler[durum.durum as keyof typeof istatistikler]++;
    });
    
    return istatistikler;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Seçili firma değiştiğinde düzenleme formunu sıfırla
  useEffect(() => {
    if (seciliFirma) {
      setDuzenlemeFormu({
        ad: seciliFirma.ad,
        tur: seciliFirma.tur,
        yetkiliAd: seciliFirma.yetkiliAd,
        yetkiliTelefon: seciliFirma.yetkiliTelefon,
        alternatifTelefon: seciliFirma.alternatifTelefon,
        il: seciliFirma.il,
        ilce: seciliFirma.ilce,
        mahalle: seciliFirma.mahalle,
        sokak: seciliFirma.sokak,
        kapiNo: seciliFirma.kapiNo,
        aciklama: seciliFirma.aciklama,
        durum: seciliFirma.durum
      });
      setDuzenlemeModu(false);
    }
  }, [seciliFirma?.id]);

  // Önizleme marker'ını yönet - SÜRÜKLENEBİLİR - YENİ TASARIM
  useEffect(() => {
    if (!map.current || !firmaEkleModalAcik || !yeniFirmaKonum) {
      // Modal kapalıysa marker'ı kaldır
      if (onizlemeMarkerRef.current) {
        onizlemeMarkerRef.current.remove();
        onizlemeMarkerRef.current = null;
      }
      return;
    }

    // Firma türünü al ve bilgisini hazırla
    const firmaTuru = yeniFirmaForm.tur || 'Market';
    const turBilgisi = FIRMA_TURLERI[firmaTuru] || FIRMA_TURLERI['Market'];
    
    // Marker zaten varsa sadece pozisyonu ve içeriğini güncelle
    if (onizlemeMarkerRef.current) {
      onizlemeMarkerRef.current.setLngLat(yeniFirmaKonum);
      
      // İçeriği güncelle (tür değişmiş olabilir)
      const el = onizlemeMarkerRef.current.getElement();
      el.innerHTML = `
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 44px;
          background-color: white;
          border-radius: 50%;
          border: 3px solid #10B981;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <div style="
            width: 32px;
            height: 32px;
            background-color: ${turBilgisi.renk};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">
            ${turBilgisi.ikon}
          </div>
        </div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 28px;
          background-color: #10B981;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          color: white;
          z-index: 3;
        ">
          0
        </div>
      `;
      
      return;
    }

    // YENİ ÖNİZLEME MARKER'I - TÜM MARKERLARLA AYNI TASARIM
    const el = document.createElement('div');
    el.className = 'onizleme-marker';
    el.style.width = '52px';
    el.style.height = '60px';
    el.style.cursor = 'grab';
    
    el.innerHTML = `
      <div style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 44px;
        height: 44px;
        background-color: white;
        border-radius: 50%;
        border: 3px solid #10B981;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background-color: ${turBilgisi.renk};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        ">
          ${turBilgisi.ikon}
        </div>
      </div>
      <div style="
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 28px;
        height: 28px;
        background-color: #10B981;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        color: white;
        z-index: 3;
      ">
        0
      </div>
    `;
    
    const marker = new maplibregl.Marker({ 
      element: el,
      draggable: true,
      anchor: 'bottom',
      offset: [0, -8]
    })
      .setLngLat(yeniFirmaKonum)
      .addTo(map.current);
    
    // Sürükleme olaylarını dinle
    marker.on('dragstart', () => {
      el.style.cursor = 'grabbing';
    });
    
    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      setYeniFirmaKonum([lngLat.lng, lngLat.lat]);
      // Konum güncellendi eventini gönder
      const event = new CustomEvent('locationSelected', { detail: [lngLat.lng, lngLat.lat] });
      window.dispatchEvent(event);
    });
    
    marker.on('dragend', () => {
      el.style.cursor = 'grab';
    });
    
    onizlemeMarkerRef.current = marker;
  }, [firmaEkleModalAcik, yeniFirmaKonum, haritaYuklendi, yeniFirmaFormu.tur]);

  // Konum seçim modu için event dinleyicisi
  const [konumSecimModu, setKonumSecimModu] = useState(false);

  useEffect(() => {
    const handleStartLocationSelect = () => {
      setKonumSecimModu(true);
      // Haritanın imlecine crosshair ver
      if (map.current) {
        map.current.getCanvas().style.cursor = 'crosshair';
      }
    };

    window.addEventListener('startLocationSelect', handleStartLocationSelect);
    return () => {
      window.removeEventListener('startLocationSelect', handleStartLocationSelect);
    };
  }, []);

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

    } catch (error) {
      console.error('Harita hatası:', error);
      setGorusModu('liste');
    }

    return () => {
      map.current?.remove();
    };
  }, [isClient, gorusModu]);

  // Harita tıklama olaylarını ayrı bir useEffect ile yönet - harita yeniden oluşturulmaz
  useEffect(() => {
    if (!map.current || !haritaYuklendi) return;

    console.log('✅ Harita tıklama dinleyicisi ayarlandı!');

    const handleMapClick = (e: any) => {
      console.log('🖱️ Haritaya tıklandı:', e.lngLat);
      
      // Konum seçim modu aktifse
      if (konumSecimModu) {
        const konum: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setYeniFirmaKonum(konum);
        setKonumSecimModu(false);
        map.current!.getCanvas().style.cursor = '';
        
        // Konum seçildi eventini gönder
        const event = new CustomEvent('locationSelected', { detail: konum });
        window.dispatchEvent(event);
        return;
      }

      // Normal modda: direkt modalı aç
      const konum: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      
      if (firmaEkleModalAcik) {
        // Modal açıksa sadece konumu güncelle
        setYeniFirmaKonum(konum);
      } else {
        // Modal kapalıysa modalı aç
        console.log('📝 Modal açılıyor, konum:', konum);
        setYeniFirmaKonum(konum);
        setFirmaEkleModalAcik(true);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [haritaYuklendi, firmaEkleModalAcik, konumSecimModu]);

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
      
      // Firma türüne göre renk ve ikon al
      const turBilgisi = FIRMA_TURLERI[firma.tur] || FIRMA_TURLERI['Diğer'];
      
      // Kumbara durumuna göre renk belirle - en kötü durumu göster
      let durumRengi: string = '#4CAF50'; // Varsayılan yeşil (güvende)
      
      if (firmayaAitKumbaralar.length > 0) {
        let enKotuGun = Infinity;
        
        firmayaAitKumbaralar.forEach(kumbara => {
          const durum = getKumbaraDurumu(kumbara);
          if (durum.gun < enKotuGun) {
            enKotuGun = durum.gun;
            durumRengi = durum.renk;
          }
        });
      }

      // ÇOK BASİT VE ANLAŞILIR MARKER - İkon beyaz arka planda, badge durum renginde
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '52px';
      el.style.height = '60px';
      el.style.cursor = 'pointer';
      
      // İkon kısmı - Beyaz arka plan, tür ikonu ve tür rengine sahip
      el.innerHTML = `
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 44px;
          background-color: white;
          border-radius: 50%;
          border: 3px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <div style="
            width: 32px;
            height: 32px;
            background-color: ${turBilgisi.renk};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">
            ${turBilgisi.ikon}
          </div>
        </div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 28px;
          background-color: ${durumRengi};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          color: white;
          z-index: 3;
        ">
          ${firmayaAitKumbaralar.length}
        </div>
      `;

      // Marker'ı ekle - ANCHOR: CENTER (tam ortadan!)
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'bottom',
        offset: [0, -8]
      })
        .setLngLat([firma.longitude!, firma.latitude!])
        .addTo(map.current!);

      // Tıklama olayı
      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation(); // Haritaya tıklama olayının gitmesini engelle
        firmayiSec(firma);
      });
    });
  };

  // Markerları haritaya ekle - veriler veya harita değiştiğinde
  useEffect(() => {
    if (haritaYuklendi && gorusModu === 'harita') {
      markerlariEkle();
    }
  }, [haritaYuklendi, gorusModu, firmalar, kumbaralar, analizTarihi, toplamaPeriyoduGun]);

  if (!isClient) {
    return (
      <div className="flex flex-col h-screen">
        <Header loading={true} connected={false} refresh={() => {}} />
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">Uygulama başlatılıyor...</p>
        </div>
      </div>
    );
  }

  const seciliFirmaninKumbaralari = seciliFirma ? getFirmayaAitKumbaralar(seciliFirma.id) : [];

  return (
    <div className="flex flex-col h-screen" suppressHydrationWarning>
      <Header loading={loading} connected={connected} refresh={refresh} ayarlarAc={ayarlarAcik} setAyarlarAc={setAyarlarAcik} />
      
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
        
        {/* Konum seçim modu göstergesi */}
        {konumSecimModu && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <span className="animate-pulse">📍</span>
            <span className="font-medium">Haritaya tıklayarak konum seçin</span>
          </div>
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
              <div className="flex items-center gap-2">
                {!duzenlemeModu && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: FIRMA_TURLERI[seciliFirma.tur]?.renk || FIRMA_TURLERI.Diğer.renk,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    border: '2px solid white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                  }}>{FIRMA_TURLERI[seciliFirma.tur]?.ikon || FIRMA_TURLERI.Diğer.ikon}</div>
                )}
                <h2 className="text-xl font-bold">
                  {duzenlemeModu ? 'Firma Düzenleniyor' : seciliFirma.ad}
                </h2>
              </div>
              <div className="flex gap-2">
                {!duzenlemeModu && (
                  <button
                    onClick={() => setDuzenlemeModu(true)}
                    className="text-gray-500 hover:text-blue-600 text-lg px-2 py-1"
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => {
                    setSeciliFirma(null);
                    setDuzenlemeModu(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {duzenlemeModu ? (
              // Düzenleme Modu
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!seciliFirma) return;
                  
                  const sonuc = await firmaGuncelle(seciliFirma.id, duzenlemeFormu);
                  if (sonuc.success) {
                    setDuzenlemeModu(false);
                  } else {
                    alert('Hata: ' + sonuc.error);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı</label>
                  <input
                    required
                    type="text"
                    value={duzenlemeFormu.ad || ''}
                    onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, ad: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Türü</label>
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: FIRMA_TURLERI[duzenlemeFormu.tur || 'Diğer']?.renk || FIRMA_TURLERI.Diğer.renk,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      border: '2px solid white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                    }}>{FIRMA_TURLERI[duzenlemeFormu.tur || 'Diğer']?.ikon || FIRMA_TURLERI.Diğer.ikon}</div>
                    <select
                      value={duzenlemeFormu.tur || 'Market'}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, tur: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(FIRMA_TURLERI).map((tur) => (
                        <option key={tur} value={tur}>{tur}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                    <select
                      value={duzenlemeFormu.durum || 'Aktif'}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, durum: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={duzenlemeFormu.yetkiliAd || ''}
                    onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, yetkiliAd: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={duzenlemeFormu.yetkiliTelefon || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, yetkiliTelefon: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternatif</label>
                    <input
                      type="tel"
                      value={duzenlemeFormu.alternatifTelefon || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, alternatifTelefon: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                    <input
                      type="text"
                      value={duzenlemeFormu.il || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, il: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                    <input
                      type="text"
                      value={duzenlemeFormu.ilce || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, ilce: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mahalle</label>
                    <input
                      type="text"
                      value={duzenlemeFormu.mahalle || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, mahalle: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sokak</label>
                    <input
                      type="text"
                      value={duzenlemeFormu.sokak || ''}
                      onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, sokak: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapı No</label>
                  <input
                    type="text"
                    value={duzenlemeFormu.kapiNo || ''}
                    onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, kapiNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={duzenlemeFormu.aciklama || ''}
                    onChange={(e) => setDuzenlemeFormu({ ...duzenlemeFormu, aciklama: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDuzenlemeModu(false);
                      // Formu sıfırla
                      if (seciliFirma) {
                        setDuzenlemeFormu({
                          ad: seciliFirma.ad,
                          tur: seciliFirma.tur,
                          yetkiliAd: seciliFirma.yetkiliAd,
                          yetkiliTelefon: seciliFirma.yetkiliTelefon,
                          alternatifTelefon: seciliFirma.alternatifTelefon,
                          il: seciliFirma.il,
                          ilce: seciliFirma.ilce,
                          mahalle: seciliFirma.mahalle,
                          sokak: seciliFirma.sokak,
                          kapiNo: seciliFirma.kapiNo,
                          aciklama: seciliFirma.aciklama,
                          durum: seciliFirma.durum
                        });
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    💾 Kaydet
                  </button>
                </div>
              </form>
            ) : (
              // Normal Görüntüleme Modu
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Tür:</span>
                    <p className="font-medium flex items-center gap-2">
                      {seciliFirma.tur}
                    </p>
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
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Kumbaralar ({seciliFirmaninKumbaralari.length})</h3>
                    <button
                      onClick={() => {
                        // Yeni kumbara için formu hazırla
                        const bugun = new Date();
                        const sonrakidegisim = new Date(bugun);
                        sonrakidegisim.setDate(bugun.getDate() + toplamaPeriyoduGun);

                        setKumbaraFormu({
                          kumbaraNo: `KB-${Date.now()}`,
                          kumbaraTipi: 'Standart',
                          firmaId: seciliFirma?.id,
                          firm_id: seciliFirma?.id,
                          placement_date: bugun,
                          yerlestirmeTarihi: bugun.toISOString().split('T')[0],
                          next_replacement_date: sonrakidegisim,
                          sonrakiDegisimTarihi: sonrakidegisim.getTime(),
                          period_days: toplamaPeriyoduGun,
                          toplamaPeriyodu: toplamaPeriyoduGun,
                          status: 'new',
                          durum: 'Yeni',
                          total_collections: 0,
                          toplamaSayisi: 0,
                          total_donation: 0,
                          toplamBagis: 0
                        });
                        setDuzenlenenKumbara(null);
                        setKumbaraModalAcik(true);
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                    >
                      ➕ Kumbara Ekle
                    </button>
                  </div>

                  <div className="space-y-2">
                    {seciliFirmaninKumbaralari.map((kumbara) => {
                      const durum = getKumbaraDurumu(kumbara);
                      return (
                        <div 
                          key={kumbara.id || kumbara.kumbaraNo} 
                          className="p-3 bg-gray-50 rounded text-sm"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold">{kumbara.kumbaraNo || kumbara.number}</span>
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: durum.renk }}
                            >
                              {durum.yazi}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>Tip: {kumbara.kumbaraTipi || kumbara.type}</p>
                            <p>Sonraki değişim: {
                              (kumbara.next_replacement_date instanceof Date) 
                                ? kumbara.next_replacement_date.toLocaleDateString('tr-TR')
                                : (typeof kumbara.sonrakiDegisimTarihi === 'number' 
                                    ? new Date(kumbara.sonrakiDegisimTarihi).toLocaleDateString('tr-TR')
                                    : 'Belirtilmemiş')
                            }</p>
                            <p>Toplam bağış: {
                              (kumbara.toplamBagis || kumbara.total_donation || 0).toLocaleString('tr-TR')
                            } ₺</p>
                            {kumbara.notlar && <p className="text-orange-600">⚠️ {kumbara.notlar}</p>}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => {
                                // Kumbara düzenle
                                setDuzenlenenKumbara(kumbara);
                                // Formu doldur
                                const formData: Partial<Kumbara> = {
                                  kumbaraNo: kumbara.kumbaraNo || kumbara.number,
                                  kumbaraTipi: kumbara.kumbaraTipi || kumbara.type,
                                  firmaId: kumbara.firmaId || kumbara.firm_id,
                                  firm_id: kumbara.firmaId || kumbara.firm_id,
                                  placement_date: kumbara.placement_date,
                                  yerlestirmeTarihi: (kumbara.placement_date instanceof Date) 
                                    ? kumbara.placement_date.toISOString().split('T')[0]
                                    : (typeof kumbara.yerlestirmeTarihi === 'string' 
                                        ? kumbara.yerlestirmeTarihi
                                        : new Date(kumbara.placement_date).toISOString().split('T')[0]),
                                  last_replacement_date: kumbara.last_replacement_date,
                                  sonDegisimTarihi: kumbara.last_replacement_date 
                                    ? (kumbara.last_replacement_date instanceof Date 
                                        ? kumbara.last_replacement_date.toISOString().split('T')[0]
                                        : new Date(kumbara.last_replacement_date).toISOString().split('T')[0])
                                    : undefined,
                                  next_replacement_date: kumbara.next_replacement_date,
                                  sonrakiDegisimTarihi: (kumbara.next_replacement_date instanceof Date) 
                                    ? kumbara.next_replacement_date.getTime()
                                    : (typeof kumbara.sonrakiDegisimTarihi === 'number' 
                                        ? kumbara.sonrakiDegisimTarihi
                                        : new Date(kumbara.next_replacement_date).getTime()),
                                  period_days: kumbara.period_days || kumbara.toplamaPeriyodu || toplamaPeriyoduGun,
                                  toplamaPeriyodu: kumbara.period_days || kumbara.toplamaPeriyodu || toplamaPeriyoduGun,
                                  status: kumbara.status,
                                  durum: kumbara.durum,
                                  total_collections: kumbara.total_collections || kumbara.toplamaSayisi || 0,
                                  toplamaSayisi: kumbara.total_collections || kumbara.toplamaSayisi || 0,
                                  total_donation: kumbara.total_donation || kumbara.toplamBagis || 0,
                                  toplamBagis: kumbara.total_donation || kumbara.toplamBagis || 0,
                                  notes: kumbara.notes,
                                  notlar: kumbara.notlar
                                };
                                setKumbaraFormu(formData);
                                setKumbaraModalAcik(true);
                              }}
                              className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition"
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Bu kumbarayı silmek istediğinizden emin misiniz?')) {
                                  await kumbaraSil(kumbara.id);
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {seciliFirmaninKumbaralari.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Bu firmaya henüz kumbara eklenmemiş.</p>
                    )}
                  </div>
                </div>

                <hr className="my-2" />
                
                <button
                  onClick={() => setSilmeOnayiAcik(true)}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  🗑️ Firmayı Sil
                </button>
              </div>
            )}
          </div>
        )}

        {/* Kumbara Ekle/Düzenle Modal */}
        {kumbaraModalAcik && seciliFirma && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {duzenlenenKumbara ? '✏️ Kumbara Düzenle' : '➕ Yeni Kumbara Ekle'}
              </h2>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();

                  if (!seciliFirma) return;

                  // Verileri hazırla
                  const kumbaraVerisi: Partial<Kumbara> = {
                    number: kumbaraFormu.kumbaraNo || kumbaraFormu.number,
                    kumbaraNo: kumbaraFormu.kumbaraNo || kumbaraFormu.number,
                    type: kumbaraFormu.kumbaraTipi || kumbaraFormu.type,
                    kumbaraTipi: kumbaraFormu.kumbaraTipi || kumbaraFormu.type,
                    firm_id: seciliFirma.id,
                    firmaId: seciliFirma.id,
                    period_days: Number(kumbaraFormu.toplamaPeriyodu || kumbaraFormu.period_days || toplamaPeriyoduGun),
                    toplamaPeriyodu: Number(kumbaraFormu.toplamaPeriyodu || kumbaraFormu.period_days || toplamaPeriyoduGun),
                    total_collections: Number(kumbaraFormu.toplamaSayisi || kumbaraFormu.total_collections || 0),
                    toplamaSayisi: Number(kumbaraFormu.toplamaSayisi || kumbaraFormu.total_collections || 0),
                    total_donation: Number(kumbaraFormu.toplamBagis || kumbaraFormu.total_donation || 0),
                    toplamBagis: Number(kumbaraFormu.toplamBagis || kumbaraFormu.total_donation || 0),
                    notes: kumbaraFormu.notlar || kumbaraFormu.notes,
                    notlar: kumbaraFormu.notlar || kumbaraFormu.notes
                  };

                  // Tarihleri ayarla
                  if (kumbaraFormu.yerlestirmeTarihi) {
                    kumbaraVerisi.placement_date = new Date(kumbaraFormu.yerlestirmeTarihi);
                  }
                  if (kumbaraFormu.sonDegisimTarihi) {
                    kumbaraVerisi.last_replacement_date = new Date(kumbaraFormu.sonDegisimTarihi);
                  }
                  if (kumbaraFormu.sonrakiDegisimTarihi) {
                    kumbaraVerisi.next_replacement_date = new Date(Number(kumbaraFormu.sonrakiDegisimTarihi));
                  } else if (kumbaraFormu.yerlestirmeTarihi) {
                    // Sonraki değişim tarihini otomatik hesapla
                    const yerlestirme = new Date(kumbaraFormu.yerlestirmeTarihi);
                    const sonraki = new Date(yerlestirme);
                    sonraki.setDate(yerlestirme.getDate() + Number(kumbaraVerisi.period_days));
                    kumbaraVerisi.next_replacement_date = sonraki;
                  }

                  if (duzenlenenKumbara) {
                    // Güncelle
                    const sonuc = await kumbaraGuncelle(duzenlenenKumbara.id, kumbaraVerisi);
                    if (sonuc.success) {
                      setKumbaraModalAcik(false);
                    } else {
                      alert('Hata: ' + sonuc.error);
                    }
                  } else {
                    // Ekle
                    const sonuc = await kumbaraEkle(kumbaraVerisi);
                    if (sonuc.success) {
                      setKumbaraModalAcik(false);
                    } else {
                      alert('Hata: ' + sonuc.error);
                    }
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kumbara No</label>
                  <input
                    required
                    type="text"
                    value={kumbaraFormu.kumbaraNo || kumbaraFormu.number || ''}
                    onChange={(e) => setKumbaraFormu({...kumbaraFormu, kumbaraNo: e.target.value, number: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="KB-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kumbara Tipi</label>
                  <select
                    value={kumbaraFormu.kumbaraTipi || kumbaraFormu.type || 'Standart'}
                    onChange={(e) => setKumbaraFormu({...kumbaraFormu, kumbaraTipi: e.target.value, type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Standart">Standart</option>
                    <option value="Büyük">Büyük</option>
                    <option value="Küçük">Küçük</option>
                    <option value="Dijital">Dijital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yerleştirme Tarihi</label>
                  <input
                    required
                    type="date"
                    value={kumbaraFormu.yerlestirmeTarihi || (kumbaraFormu.placement_date instanceof Date 
                      ? kumbaraFormu.placement_date.toISOString().split('T')[0] 
                      : '')}
                    onChange={(e) => {
                      const yeniTarih = e.target.value;
                      const yeniForm = {...kumbaraFormu, yerlestirmeTarihi: yeniTarih};
                      // Sonraki değişim tarihini otomatik hesapla
                      if (yeniTarih) {
                        const yerlestirme = new Date(yeniTarih);
                        const sonraki = new Date(yerlestirme);
                        sonraki.setDate(yerlestirme.getDate() + Number(yeniForm.toplamaPeriyodu || toplamaPeriyoduGun));
                        yeniForm.sonrakiDegisimTarihi = sonraki.getTime();
                        yeniForm.next_replacement_date = sonraki;
                      }
                      setKumbaraFormu(yeniForm);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Son Değişim Tarihi (varsa)</label>
                  <input
                    type="date"
                    value={kumbaraFormu.sonDegisimTarihi || (kumbaraFormu.last_replacement_date instanceof Date 
                      ? kumbaraFormu.last_replacement_date.toISOString().split('T')[0] 
                      : '')}
                    onChange={(e) => setKumbaraFormu({...kumbaraFormu, sonDegisimTarihi: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sonraki Değişim Tarihi</label>
                  <input
                    type="date"
                    value={
                      (typeof kumbaraFormu.sonrakiDegisimTarihi === 'number') 
                        ? new Date(kumbaraFormu.sonrakiDegisimTarihi).toISOString().split('T')[0]
                        : (kumbaraFormu.next_replacement_date instanceof Date 
                          ? kumbaraFormu.next_replacement_date.toISOString().split('T')[0] 
                          : '')
                    }
                    onChange={(e) => {
                      const tarih = new Date(e.target.value);
                      setKumbaraFormu({
                        ...kumbaraFormu, 
                        sonrakiDegisimTarihi: tarih.getTime(),
                        next_replacement_date: tarih
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Toplama Periyodu (Gün)</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={kumbaraFormu.toplamaPeriyodu || kumbaraFormu.period_days || toplamaPeriyoduGun}
                    onChange={(e) => {
                      const yeniPeriyot = Number(e.target.value);
                      const yeniForm = {...kumbaraFormu, toplamaPeriyodu: yeniPeriyot, period_days: yeniPeriyot};
                      // Eğer yerleştirme tarihi varsa, sonraki değişim tarihini güncelle
                      if (yeniForm.yerlestirmeTarihi) {
                        const yerlestirme = new Date(yeniForm.yerlestirmeTarihi);
                        const sonraki = new Date(yerlestirme);
                        sonraki.setDate(yerlestirme.getDate() + yeniPeriyot);
                        yeniForm.sonrakiDegisimTarihi = sonraki.getTime();
                        yeniForm.next_replacement_date = sonraki;
                      }
                      setKumbaraFormu(yeniForm);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toplama Sayısı</label>
                    <input
                      type="number"
                      min="0"
                      value={kumbaraFormu.toplamaSayisi || kumbaraFormu.total_collections || 0}
                      onChange={(e) => setKumbaraFormu({
                        ...kumbaraFormu, 
                        toplamaSayisi: Number(e.target.value), 
                        total_collections: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Bağış (₺)</label>
                    <input
                      type="number"
                      min="0"
                      value={kumbaraFormu.toplamBagis || kumbaraFormu.total_donation || 0}
                      onChange={(e) => setKumbaraFormu({
                        ...kumbaraFormu, 
                        toplamBagis: Number(e.target.value), 
                        total_donation: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <textarea
                    value={kumbaraFormu.notlar || kumbaraFormu.notes || ''}
                    onChange={(e) => setKumbaraFormu({...kumbaraFormu, notlar: e.target.value, notes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setKumbaraModalAcik(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                  >
                    {duzenlenenKumbara ? '💾 Güncelle' : '➕ Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Silme Onayı Modal */}
        {silmeOnayiAcik && seciliFirma && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Firmayı Sil</h2>
              <p className="text-gray-600 mb-6">
                <strong>{seciliFirma.ad}</strong> adlı firmayı silmek istediğinizden emin misiniz?
                <br />
                Bu işlem geri alınamaz!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSilmeOnayiAcik(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    console.log('🔴 Silme işlemi başlatılıyor, ID:', seciliFirma.id);
                    const sonuc = await firmaSil(seciliFirma.id);
                    if (sonuc.success) {
                      setSilmeOnayiAcik(false);
                      setSeciliFirma(null);
                    } else {
                      alert('Hata: ' + sonuc.error);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sol bilgi paneli (sadece harita görünümünde) */}
        {gorusModu === 'harita' && haritaYuklendi && !loading && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 z-10 w-72">
            <h3 className="font-bold mb-3 text-sm">📊 Kumbara Analizi</h3>
            
            {/* Kumbara istatistikleri */}
            {(() => {
              const istatistikler = getKumbaraIstatistikleri();
              return (
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>Toplam Kumbara:</span>
                    <span className="font-semibold">{istatistikler.toplam}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F44336' }}></div>
                        <span>Geçmiş:</span>
                      </div>
                      <span className="font-semibold text-red-600">{istatistikler.gecmis}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF5722' }}></div>
                        <span>Acil (1 hafta):</span>
                      </div>
                      <span className="font-semibold text-orange-600">{istatistikler.acil}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF9800' }}></div>
                        <span>Yakında (1 ay):</span>
                      </div>
                      <span className="font-semibold text-amber-600">{istatistikler.yakinda}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFEB3B' }}></div>
                        <span>Orta (2 ay):</span>
                      </div>
                      <span className="font-semibold text-yellow-600">{istatistikler.orta}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span>Güvende:</span>
                      </div>
                      <span className="font-semibold text-green-600">{istatistikler.guvende}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <hr className="my-2" />
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="col-span-2">
                <span className="text-gray-500 text-xs">Analiz Tarihi:</span>
                <input
                  type="date"
                  value={analizTarihi}
                  onChange={(e) => setAnalizTarihi(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <hr className="my-2" />
            
            <h3 className="font-bold mb-3 text-sm">🏪 Firma Türleri</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(FIRMA_TURLERI).slice(0, 10).map(([tur, bilgi]) => (
                <div key={tur} className="flex items-center gap-3 p-1">
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    border: '2px solid #e0e0e0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: bilgi.renk,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>{bilgi.ikon}</div>
                  </div>
                  <span className="font-medium">{tur}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ayarlar Modal */}
        {ayarlarAcik && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">⚙️ Ayarlar</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kumbara Toplama Periyodu (Gün)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setToplamaPeriyoduGun(Math.max(30, toplamaPeriyoduGun - 30))}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={toplamaPeriyoduGun}
                      onChange={(e) => setToplamaPeriyoduGun(Math.max(30, Math.min(365, parseInt(e.target.value) || 90)))}
                      className="flex-1 px-3 py-2 border rounded-lg text-center"
                      min="30"
                      max="365"
                    />
                    <button
                      onClick={() => setToplamaPeriyoduGun(Math.min(365, toplamaPeriyoduGun + 30))}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Varsayılan: 90 gün (3 ay)
                  </p>
                </div>

                <hr className="my-2" />
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">📝 Renk Anlamları</h3>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F44336' }}></div>
                      <span>Geçmiş veya acil (0-7 gün)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF5722' }}></div>
                      <span>Çok yakında (7-30 gün)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFEB3B' }}></div>
                      <span>Orta (30-60 gün)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4CAF50' }}></div>
                      <span>Güvende (60+ gün)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setAyarlarAcik(false)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Tamam
                </button>
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
              // Önizleme marker'ını kaldır
              if (onizlemeMarkerRef.current) {
                onizlemeMarkerRef.current.remove();
                onizlemeMarkerRef.current = null;
              }
              // Modalı kapat
              setFirmaEkleModalAcik(false);
              // Markerları yeniden ekle (yeni firma dahil)
              // firmalar state'i değişti, markerlariEkle useEffect'i tetiklenecek
            }}
            firmaEkle={firmaEkle}
            mapRef={map}
          />
        )}
      </div>
    </div>
  );
}

// Firma Ekleme Modal Bileşeni - konum prop'u değiştiğinde otomatik güncellenir
function FirmaEkleModal({ 
  konum, 
  kapali, 
  kaydedildi,
  firmaEkle,
  mapRef
}: { 
  konum: [number, number], 
  kapali: () => void, 
  kaydedildi: () => void,
  firmaEkle: (firma: any) => Promise<{ success: boolean; id?: number; error?: string }>,
  mapRef: React.RefObject<maplibregl.Map>
}) {
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [form, setForm] = useState({
    ad: '',
    tur: 'Market',
    yetkiliAd: '',
    yetkiliTelefon: '',
    alternatifTelefon: '',
    whatsapp: '',
    eposta: '',
    il: 'Ankara',
    ilce: '',
    mahalle: '',
    sokak: '',
    kapiNo: '',
    aciklama: '',
    durum: 'Aktif'
  });
  
  // Konumu local state olarak tut, prop değiştiğinde güncelle
  const [currentKonum, setCurrentKonum] = useState(konum);
  
  useEffect(() => {
    setCurrentKonum(konum);
  }, [konum]);

  const turler = Object.keys(FIRMA_TURLERI);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setKaydediliyor(true);
    
    try {
      // Firmanın tam adresini oluştur
      const adresParcalari = [form.mahalle, form.sokak, form.kapiNo].filter(Boolean);
      const adres = adresParcalari.length > 0 ? adresParcalari.join(' ') + ', ' + form.ilce + ', ' + form.il : '';
      
      // Migration tablosuna uygun format - İngilizce kolon adları
      const yeniFirma = {
        name: form.ad,
        type: form.tur,
        representative_name: form.yetkiliAd,
        representative_phone: form.yetkiliTelefon,
        alternative_phone: form.alternatifTelefon || null,
        whatsapp: form.whatsapp || null,
        email: form.eposta || null,
        address: adres || null,
        city: form.il,
        district: form.ilce,
        neighborhood: form.mahalle,
        street: form.sokak || null,
        building_no: form.kapiNo || null,
        latitude: currentKonum[1], // enlem
        longitude: currentKonum[0], // boylam
        description: form.aciklama || null,
        status: form.durum === 'Aktif' ? 'active' : 'inactive'
      };
      
      console.log('Kaydedilecek firma:', yeniFirma);
      
      const sonuc = await firmaEkle(yeniFirma);
      
      if (sonuc.success) {
        alert(`✅ Firma başarıyla kaydedildi!\n\nFirma: ${form.ad}\nEnlem: ${currentKonum[1].toFixed(6)}\nBoylam: ${currentKonum[0].toFixed(6)}`);
        kaydedildi();
      } else {
        alert(`❌ Hata: ${sonuc.error}`);
      }
    } catch (err) {
      console.error('Kayıt hatası:', err);
      alert('❌ Kayıt sırasında bir hata oluştu!');
    } finally {
      setKaydediliyor(false);
    }
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
              <div className="text-sm text-blue-800 font-medium mb-2">📍 Haritadaki 📌 işaretini sürükleyerek konumu ayarlayın</div>
              <div className="px-3 py-2 bg-white rounded border text-sm text-gray-600 mb-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Enlem:</span> <span className="font-mono">{currentKonum[1].toFixed(6)}</span></div>
                  <div><span className="text-gray-500">Boylam:</span> <span className="font-mono">{currentKonum[0].toFixed(6)}</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Haritadan seçim modunu aktif et
                    const event = new CustomEvent('startLocationSelect');
                    window.dispatchEvent(event);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  🗺️ Haritada Seç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Haritayı marker konumuna ortala
                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [currentKonum[0], currentKonum[1]],
                        zoom: 17,
                        essential: true
                      });
                    }
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  title="Haritayı bu konuma odakla"
                >
                  🔍
                </button>
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
              disabled={kaydediliyor}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {kaydediliyor ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  💾 Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
