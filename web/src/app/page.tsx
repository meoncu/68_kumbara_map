'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { signOut } from 'firebase/auth';
import { useData } from '@/hooks/useData';
import { useAuthState } from '@/hooks/useAuthState';
import { removeUserRole, upsertUserRole, useUserRole, useUserRolesList } from '@/hooks/useUserRole';
import { KUMBARA_STATUS_COLORS, epochToDate } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import type { Firma, Kumbara } from '@/lib/firebase';

// Change 1: Modern indigo gradient header
const Header = ({ loading, connected, refresh, ayarlarAc, setAyarlarAcik, ekipUyeEkleModalAcik, setEkipUyeEkleModalAcik, ekipEkleModalAcik, setEkipEkleModalAcik, kumbaraAtamaModalAcik, setKumbaraAtamaModalAcik, kumbaralar, gunlukKontrol, setAtamalar, eksikKalanIslerAcik, setEksikKalanIslerAcik, gunlukArsivlerModalAcik, setGunlukArsivlerModalAcik, userEmail, onLogout }: { loading: boolean; connected: boolean; refresh: () => void; ayarlarAc: boolean; setAyarlarAcik: (v: boolean) => void; ekipUyeEkleModalAcik: boolean; setEkipUyeEkleModalAcik: (v: boolean) => void; ekipEkleModalAcik: boolean; setEkipEkleModalAcik: (v: boolean) => void; kumbaraAtamaModalAcik: boolean; setKumbaraAtamaModalAcik: (v: boolean) => void; kumbaralar: any[]; gunlukKontrol: any[]; setAtamalar: (v: any) => void; eksikKalanIslerAcik: boolean; setEksikKalanIslerAcik: (v: boolean) => void; gunlukArsivlerModalAcik: boolean; setGunlukArsivlerModalAcik: (v: boolean) => void; userEmail?: string | null; onLogout?: () => void }) => (
  <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-5 py-3 flex items-center justify-between shadow-lg">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
        <span className="text-white font-bold text-lg">K</span>
      </div>
      <div>
        <h1 className="text-base font-bold tracking-tight">Kumbara Takip</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          {loading ? <span className="flex items-center gap-1 text-xs text-indigo-200"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse inline-block"></span>Yükleniyor...</span>
           : connected ? <span className="flex items-center gap-1 text-xs text-indigo-200"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span>Bağlı</span>
           : <span className="flex items-center gap-1 text-xs text-indigo-200"><span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block"></span>Bağlantı yok</span>}
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={() => setEkipUyeEkleModalAcik(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">👥 Üye Ekle</button>
      <button onClick={() => setEkipEkleModalAcik(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">🏷️ Ekip Oluştur</button>
      <button onClick={() => {
        // Helper to check if a kumbara is archived
        const isKumbaraArchived = (kumbara: any): boolean => {
          return !!gunlukKontrol.find(kontrol => 
            (kontrol.kumbara_id === kumbara.id || kontrol.kumbara_no === (kumbara.kumbaraNo || kumbara.number)) && 
            kontrol.arsivlendi
          );
        };
        // Mevcut atamaları yükle (sadece arşivlenmemiş kumbaralar)
        const mevcutAtamalar: Record<string, string> = {};
        kumbaralar.forEach(kumbara => {
          if ((kumbara.atanan_ekip_id || kumbara.atananEkipId) && !isKumbaraArchived(kumbara)) {
            mevcutAtamalar[kumbara.id] = kumbara.atanan_ekip_id || kumbara.atananEkipId;
          }
        });
        setAtamalar(mevcutAtamalar);
        setKumbaraAtamaModalAcik(true);
      }} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">📋 Kumbara Atama</button>
      <button onClick={() => setGunlukArsivlerModalAcik(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">📚 Günlük Arşivler</button>
      <button onClick={() => setEksikKalanIslerAcik(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">⚠️ Eksik Kalan İşler</button>
      <button onClick={() => setAyarlarAcik(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">⚙️ Ayarlar</button>
      <button onClick={refresh} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">↻ Yenile</button>
      {userEmail && <span className="hidden lg:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-100">{userEmail}</span>}
      {onLogout && (
        <button onClick={onLogout} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
          Çıkış
        </button>
      )}
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

type KumbaraFormState = Partial<Kumbara> & {
  degisimTarihi?: string;
};

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthState();
  const { role, loading: roleLoading } = useUserRole(user?.email);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    router.replace('/login?redirect=/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;
    if (role === 'team') {
      router.replace('/ekip');
    }
  }, [authLoading, roleLoading, user, role, router]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-800">Yükleniyor</h1>
            <p className="mt-2 text-sm text-slate-500">Giriş kontrol ediliyor.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-800">Giriş gerekli</h1>
            <p className="mt-2 text-sm text-slate-500">Yöneticiler ana ekrana giriş yaparak erişebilir.</p>
          </div>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-800">Yetki yok</h1>
            <p className="mt-2 text-sm text-slate-500">Bu hesap yönetici yetkisine sahip değil.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={async () => {
                  await signOut(auth);
                  router.replace('/login');
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HomeContent
      userEmail={user.email || null}
      onLogout={async () => {
        await signOut(auth);
        router.replace('/login');
      }}
    />
  );
}

function HomeContent({ userEmail, onLogout }: { userEmail: string | null; onLogout: () => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { firmalar, kumbaralar, ekipUyeleri, ekipler, islemGecmisi, gunlukKontrol, gunlukArsivler, loading, connected, refresh, getFirmayaAitKumbaralar, firmaEkle, firmaSil, firmaGuncelle, kumbaraEkle, kumbaraGuncelle, kumbaraSil, ekipUyeEkle, ekipUyeGuncelle, ekipUyeSil, ekipEkle, ekipGuncelle, ekipSil, kumbaraAtama, kumbaraDegistirildi, gunlukKontrolKaydet, gunlukIsleriArsivle } = useData();
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
  const [adminGeocodingYukleniyor, setAdminGeocodingYukleniyor] = useState(false);
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const { roles: kullaniciYetkileri, loading: kullaniciYetkileriYukleniyor } = useUserRolesList(ayarlarAcik);
  const [yetkiEmail, setYetkiEmail] = useState('');
  const [yetkiTipi, setYetkiTipi] = useState<'admin' | 'team'>('team');
  const [yetkiEkipId, setYetkiEkipId] = useState<string>('');
  const [yetkiHata, setYetkiHata] = useState<string | null>(null);
  const [yetkiIsleniyor, setYetkiIsleniyor] = useState(false);
  // localStorage'dan toplama periyodunu oku, yoksa varsayılan 90
  const [toplamaPeriyoduGun, setToplamaPeriyoduGun] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('toplamaPeriyoduGun');
      return saved ? parseInt(saved, 10) : 90;
    }
    return 90;
  });

  // toplamaPeriyoduGun değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('toplamaPeriyoduGun', toplamaPeriyoduGun.toString());
  }, [toplamaPeriyoduGun]);
  const [analizTarihi, setAnalizTarihi] = useState<string>(new Date().toISOString().split('T')[0]);
  const [seciliDurumFiltresi, setSeciliDurumFiltresi] = useState<string | null>(null); // null = tümünü göster
  const [kumbaraModalAcik, setKumbaraModalAcik] = useState(false);
  const [duzenlenenKumbara, setDuzenlenenKumbara] = useState<Kumbara | null>(null);
  const [kumbaraFormu, setKumbaraFormu] = useState<KumbaraFormState>({});

  // Yeni eklenen ekip ile ilgili state
  const [ekipUyeEkleModalAcik, setEkipUyeEkleModalAcik] = useState(false);
  const [duzenlenenEkipUye, setDuzenlenenEkipUye] = useState<any>(null);
  const [ekipUyeFormu, setEkipUyeFormu] = useState<any>({});

  const [ekipEkleModalAcik, setEkipEkleModalAcik] = useState(false);
  const [duzenlenenEkip, setDuzenlenenEkip] = useState<any>(null);
  const [ekipFormu, setEkipFormu] = useState<any>({});
  const [mevcutAynisiEkip, setMevcutAynisiEkip] = useState<any>(null);

  const [kumbaraAtamaModalAcik, setKumbaraAtamaModalAcik] = useState(false);
  const [atamalar, setAtamalar] = useState<Record<string, string>>({});
  const [seciliAtamaEkibi, setSeciliAtamaEkibi] = useState<string | null>(null);
  
  const [ekipAtamaListesiAcik, setEkipAtamaListesiAcik] = useState(false);
  const [eksikKalanIslerAcik, setEksikKalanIslerAcik] = useState(false);
  const [eksikKalanIslerEkipFiltresi, setEksikKalanIslerEkipFiltresi] = useState<string | null>(null);
  const [gunlukKontrolNotu, setGunlukKontrolNotu] = useState<Record<string, string>>({});
  const [gunlukKontrolDuzenleniyor, setGunlukKontrolDuzenleniyor] = useState<Record<string, boolean>>({});
  const [gunlukArsivlerModalAcik, setGunlukArsivlerModalAcik] = useState(false);
  // Yönetici panel kumbara işlem state
  const [adminIslemYapiliyor, setAdminIslemYapiliyor] = useState<Record<string, boolean>>({});
  const [adminIslemNotu, setAdminIslemNotu] = useState<Record<string, string>>({});
  const [adminNotGoster, setAdminNotGoster] = useState<Record<string, boolean>>({});
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
        daireNo: seciliFirma.daireNo,
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
    const firmaTuru = (yeniFirmaFormu.tur || 'Market') as keyof typeof FIRMA_TURLERI;
    const turBilgisi = FIRMA_TURLERI[firmaTuru] || FIRMA_TURLERI.Market;
    
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
      (firma.ad || '').toLowerCase().includes(sorgu) ||
      (firma.ilce || '').toLowerCase().includes(sorgu) ||
      (firma.mahalle || '').toLowerCase().includes(sorgu) ||
      (firma.yetkiliAd || '').toLowerCase().includes(sorgu)
    );
    
    setAramaSonuclari(sonuclar.slice(0, 10));
  };

  // Sonuca tıklandığında haritada o konuma git
  const firmayiSec = (firma: Firma) => {
    if (map.current && firma.latitude && firma.longitude && gorusModu === 'harita') {
      const currentZoom = map.current.getZoom();
      map.current.flyTo({
        center: [firma.longitude, firma.latitude],
        zoom: currentZoom < 15 ? 15 : currentZoom,
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

    // Sadece konumu olan firmaları göster, ve filtreyi uygula
    let gecerliFirmalar = firmalar.filter(firma => firma.latitude && firma.longitude);

    // Durum filtresi varsa uygula
    if (seciliDurumFiltresi) {
      const durumOnceligi: Record<string, number> = { gecmis: 5, acil: 4, yakinda: 3, orta: 2, guvende: 1 };
      gecerliFirmalar = gecerliFirmalar.filter(firma => {
        const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
        if (firmayaAitKumbaralar.length === 0) return false;

        // En kötü durumu öncelik sırasıyla bul
        let enKotuDurum = 'guvende';
        firmayaAitKumbaralar.forEach(kumbara => {
          const durum = getKumbaraDurumu(kumbara);
          if ((durumOnceligi[durum.durum] || 0) > (durumOnceligi[enKotuDurum] || 0)) {
            enKotuDurum = durum.durum;
          }
        });

        return enKotuDurum === seciliDurumFiltresi;
      });
    }

    gecerliFirmalar.forEach((firma) => {
      const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
      
      // Firma türüne göre renk ve ikon al
      const firmaTuru = (firma.tur || 'Diğer') as keyof typeof FIRMA_TURLERI;
      const turBilgisi = FIRMA_TURLERI[firmaTuru] || FIRMA_TURLERI['Diğer'];
      
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

  // Markerları haritaya ekle - veriler veya harita veya filtre değiştiğinde
  useEffect(() => {
    if (haritaYuklendi && gorusModu === 'harita') {
      markerlariEkle();
    }
  }, [haritaYuklendi, gorusModu, firmalar, kumbaralar, analizTarihi, toplamaPeriyoduGun, seciliDurumFiltresi]);

  // Change 2: Modern loading screen
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <Header loading={true} connected={false} refresh={() => {}} ayarlarAc={false} setAyarlarAcik={() => {}} ekipUyeEkleModalAcik={false} setEkipUyeEkleModalAcik={() => {}} ekipEkleModalAcik={false} setEkipEkleModalAcik={() => {}} kumbaraAtamaModalAcik={false} setKumbaraAtamaModalAcik={() => {}} kumbaralar={[]} gunlukKontrol={[]} setAtamalar={() => {}} eksikKalanIslerAcik={false} setEksikKalanIslerAcik={() => {}} gunlukArsivlerModalAcik={false} setGunlukArsivlerModalAcik={() => {}} userEmail={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500 text-sm font-medium">Uygulama başlatılıyor...</p>
          </div>
        </div>
      </div>
    );
  }

  const seciliFirmaninKumbaralari = seciliFirma ? getFirmayaAitKumbaralar(seciliFirma.id) : [];
  const seciliFirmaTuru = (seciliFirma?.tur || 'Diğer') as keyof typeof FIRMA_TURLERI;
  const seciliFirmaTurBilgisi = FIRMA_TURLERI[seciliFirmaTuru] || FIRMA_TURLERI['Diğer'];
  const duzenlemeFirmaTuru = (duzenlemeFormu.tur || 'Diğer') as keyof typeof FIRMA_TURLERI;
  const duzenlemeFirmaTurBilgisi = FIRMA_TURLERI[duzenlemeFirmaTuru] || FIRMA_TURLERI['Diğer'];

  return (
    <div className="flex flex-col h-screen" suppressHydrationWarning>
      <Header loading={loading} connected={connected} refresh={refresh} ayarlarAc={ayarlarAcik} setAyarlarAcik={setAyarlarAcik} ekipUyeEkleModalAcik={ekipUyeEkleModalAcik} setEkipUyeEkleModalAcik={setEkipUyeEkleModalAcik} ekipEkleModalAcik={ekipEkleModalAcik} setEkipEkleModalAcik={setEkipEkleModalAcik} kumbaraAtamaModalAcik={kumbaraAtamaModalAcik} setKumbaraAtamaModalAcik={setKumbaraAtamaModalAcik} kumbaralar={kumbaralar} gunlukKontrol={gunlukKontrol} setAtamalar={setAtamalar} eksikKalanIslerAcik={eksikKalanIslerAcik} setEksikKalanIslerAcik={setEksikKalanIslerAcik} gunlukArsivlerModalAcik={gunlukArsivlerModalAcik} setGunlukArsivlerModalAcik={setGunlukArsivlerModalAcik} userEmail={userEmail} onLogout={onLogout} />
      
      {/* Change 3: Clean tab bar with indigo active state and modern search */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex gap-2 items-center shadow-sm">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setGorusModu('harita')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${gorusModu === 'harita' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            🗺 Harita
          </button>
          <button onClick={() => setGorusModu('liste')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${gorusModu === 'liste' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            ☰ Firmalar
          </button>
        </div>
        {gorusModu === 'harita' && (
          <button onClick={() => { setYeniFirmaKonum([32.8597, 39.9334]); setFirmaEkleModalAcik(true); }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
            + Firma Ekle
          </button>
        )}
        <button onClick={() => setEkipAtamaListesiAcik(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
          📋 Ekip Atama Listesi
        </button>
        <div className="flex-1 max-w-sm ml-2 relative">
          <input type="text" placeholder="Firma, ilçe, mahalle ara..." value={aramaSorgusu} onChange={handleArama}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-slate-50" />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {aramaSonuclari.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-60 overflow-y-auto">
              {aramaSonuclari.map(firma => (
                <div key={firma.id} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-b-0" onClick={() => firmayiSec(firma)}>
                  <div className="font-semibold text-xs text-slate-900">{firma.ad}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{firma.mahalle}, {firma.ilce} · {firma.tur}</div>
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
        
        {/* Change 4: Konum seçim modu göstergesi */}
        {konumSecimModu && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
            <span className="animate-pulse">📍</span>
            Haritaya tıklayarak konum seçin
          </div>
        )}

        {/* Change 5: Modern card list with hover effects */}
        {gorusModu === 'liste' && (
          <div className="p-5 overflow-y-auto h-full bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Tüm Firmalar</h2>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{firmalar.length}</span>
            </div>
            <div className="grid gap-2">
              {firmalar.map(firma => {
                const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
                let enKritikDurum = 'Yeni';
                const durumlar = firmayaAitKumbaralar.map(k => {
                  const durum = getKumbaraDurumu(k);
                  if (durum.durum === 'gecmis') return 'Kırmızı';
                  if (durum.durum === 'acil') return 'Turuncu';
                  if (durum.durum === 'yakinda') return 'Sarı';
                  return 'Yeni';
                });
                const firmaTuru = (firma.tur || 'Diğer') as keyof typeof FIRMA_TURLERI;
                if (durumlar.includes('Kırmızı')) enKritikDurum = 'Kırmızı';
                else if (durumlar.includes('Turuncu')) enKritikDurum = 'Turuncu';
                else if (durumlar.includes('Sarı')) enKritikDurum = 'Sarı';
                return (
                  <div key={firma.id} onClick={() => firmayiSec(firma)}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div style={{width:'36px',height:'36px',backgroundColor: FIRMA_TURLERI[firmaTuru]?.renk||'#607D8B',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                          {FIRMA_TURLERI[firmaTuru]?.ikon||'🏪'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">{firma.ad}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{firma.mahalle}, {firma.ilce} · {firma.tur}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{firmayaAitKumbaralar.length} kb</span>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: KUMBARA_STATUS_COLORS[enKritikDurum as keyof typeof KUMBARA_STATUS_COLORS]}}></span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-4 text-xs text-slate-400 pl-12">
                      <span>{firma.yetkiliAd}</span>
                      <span>{firma.yetkiliTelefon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Change 6: Modern right-side panel */}
        {seciliFirma && (
          <div className="absolute bottom-0 left-0 right-0 md:top-0 md:right-0 md:left-auto md:w-[380px] md:h-full bg-white shadow-2xl z-10 flex flex-col border-l border-slate-200 max-h-[75vh] md:max-h-full overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 flex-shrink-0">
              {!duzenlemeModu && (
                <div style={{width:'40px',height:'40px',backgroundColor:seciliFirmaTurBilgisi.renk||FIRMA_TURLERI.Diğer.renk,borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                  {seciliFirmaTurBilgisi.ikon||FIRMA_TURLERI.Diğer.ikon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate">{duzenlemeModu ? 'Firma Düzenleniyor' : seciliFirma.ad}</h2>
                {!duzenlemeModu && <p className="text-xs text-slate-400 mt-0.5">{seciliFirma.tur} · {seciliFirma.durum}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!duzenlemeModu && (
                  <button onClick={() => setDuzenlemeModu(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all" title="Düzenle">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                )}
                <button onClick={() => { setSeciliFirma(null); setDuzenlemeModu(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {duzenlemeModu ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!seciliFirma) return;
                  const sonuc = await firmaGuncelle(seciliFirma.id, duzenlemeFormu);
                  if (sonuc.success) { setDuzenlemeModu(false); } else { alert('Hata: ' + sonuc.error); }
                }} className="p-4 space-y-3">
                  {[
                    {label:'Firma Adı',key:'ad',type:'text',required:true},
                  ].map(({label,key,type,required}) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                      <input required={required} type={type} value={(duzenlemeFormu as any)[key]||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,[key]:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"/>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Firma Türü</label>
                    <div className="flex items-center gap-2">
                      <div style={{width:'32px',height:'32px',backgroundColor:duzenlemeFirmaTurBilgisi.renk||FIRMA_TURLERI.Diğer.renk,borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
                        {duzenlemeFirmaTurBilgisi.ikon||FIRMA_TURLERI.Diğer.ikon}
                      </div>
                      <select value={duzenlemeFormu.tur||'Market'} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,tur:e.target.value})}
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {Object.keys(FIRMA_TURLERI).map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Durum</label>
                    <select value={duzenlemeFormu.durum||'Aktif'} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,durum:e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="Aktif">Aktif</option><option value="Pasif">Pasif</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Yetkili Kişi</label>
                    <input type="text" value={duzenlemeFormu.yetkiliAd||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,yetkiliAd:e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Telefon</label>
                      <input type="tel" value={duzenlemeFormu.yetkiliTelefon||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,yetkiliTelefon:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Alternatif</label>
                      <input type="tel" value={duzenlemeFormu.alternatifTelefon||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,alternatifTelefon:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">İl</label>
                      <input type="text" value={duzenlemeFormu.il||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,il:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">İlçe</label>
                      <input type="text" value={duzenlemeFormu.ilce||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,ilce:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mahalle</label>
                      <input type="text" value={duzenlemeFormu.mahalle||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,mahalle:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cadde</label>
                      <input type="text" value={(duzenlemeFormu as any).cadde||duzenlemeFormu.sokak||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,sokak:e.target.value} as any)}
                        placeholder="Atatürk Caddesi"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adres Alanları</span>
                      {seciliFirma?.latitude && seciliFirma?.longitude && (
                        <button
                          type="button"
                          disabled={adminGeocodingYukleniyor}
                          onClick={async () => {
                            setAdminGeocodingYukleniyor(true);
                            try {
                              const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${seciliFirma.latitude}&lon=${seciliFirma.longitude}&addressdetails=1&accept-language=tr`;
                              const res = await fetch(url);
                              const data = await res.json();
                              if (data.address) {
                                const a = data.address;
                                setDuzenlemeFormu(prev => ({
                                  ...prev,
                                  mahalle: a.neighbourhood || a.suburb || a.quarter || a.residential || prev.mahalle || '',
                                  ilce: a.district || a.county || a.town || a.city_district || prev.ilce || '',
                                  sokak: a.road || a.street || a.footway || a.path || prev.sokak || '',
                                  kapiNo: a.house_number || prev.kapiNo || '',
                                }));
                              }
                            } catch {}
                            setAdminGeocodingYukleniyor(false);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                        >
                          {adminGeocodingYukleniyor
                            ? <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            : '📍'}
                          {adminGeocodingYukleniyor ? 'Aranıyor...' : 'Konumdan Doldur'}
                        </button>
                      )}
                    </div>
                    {adminGeocodingYukleniyor && (
                      <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 mb-2">Harita konumundan adres bilgileri alınıyor...</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bina No</label>
                      <input type="text" value={duzenlemeFormu.kapiNo||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,kapiNo:e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Daire No</label>
                      <input type="text" value={(duzenlemeFormu as any).daireNo||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,daireNo:e.target.value} as any)}
                        placeholder="Opsiyonel"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Açıklama</label>
                    <textarea value={duzenlemeFormu.aciklama||''} onChange={(e)=>setDuzenlemeFormu({...duzenlemeFormu,aciklama:e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2}/>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setDuzenlemeModu(false); if(seciliFirma){setDuzenlemeFormu({ad:seciliFirma.ad,tur:seciliFirma.tur,yetkiliAd:seciliFirma.yetkiliAd,yetkiliTelefon:seciliFirma.yetkiliTelefon,alternatifTelefon:seciliFirma.alternatifTelefon,il:seciliFirma.il,ilce:seciliFirma.ilce,mahalle:seciliFirma.mahalle,sokak:seciliFirma.sokak,kapiNo:seciliFirma.kapiNo,daireNo:seciliFirma.daireNo,aciklama:seciliFirma.aciklama,durum:seciliFirma.durum} as any);} }}
                      className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all">İptal</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">Kaydet</button>
                  </div>
                </form>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Info section */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Yetkili</p>
                        <p className="text-sm font-semibold text-slate-800">{seciliFirma.yetkiliAd}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Durum</p>
                        <p className="text-sm font-semibold text-slate-800">{seciliFirma.durum}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Telefon</p>
                      <p className="text-sm font-semibold text-slate-800">{seciliFirma.yetkiliTelefon}{seciliFirma.alternatifTelefon && <span className="text-slate-400 font-normal"> · {seciliFirma.alternatifTelefon}</span>}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-slate-400">Adres</p>
                        {seciliFirma.latitude && seciliFirma.longitude && (!seciliFirma.sokak && !seciliFirma.mahalle) && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">⚠️ Adres eksik</span>
                        )}
                      </div>
                      {(seciliFirma.mahalle || seciliFirma.sokak || seciliFirma.kapiNo) ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-800">
                            {[seciliFirma.mahalle && `${seciliFirma.mahalle} Mah.`, seciliFirma.sokak, seciliFirma.kapiNo && `No: ${seciliFirma.kapiNo}`, (seciliFirma as any).daireNo && `D: ${(seciliFirma as any).daireNo}`].filter(Boolean).join(' ')}
                          </p>
                          <p className="text-xs text-slate-500">{[seciliFirma.ilce, seciliFirma.il].filter(Boolean).join(' / ')}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-400 italic">
                            {seciliFirma.latitude && seciliFirma.longitude ? 'Koordinat mevcut, adres girilmemiş' : 'Adres bilgisi girilmemiş'}
                          </p>
                          {seciliFirma.latitude && seciliFirma.longitude && (
                            <button
                              type="button"
                              onClick={() => setDuzenlemeModu(true)}
                              className="shrink-0 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-0.5 hover:bg-indigo-100"
                            >
                              Düzenle →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {seciliFirma.aciklama && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-600 font-semibold mb-0.5">Not</p>
                        <p className="text-sm text-amber-800">{seciliFirma.aciklama}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Kumbaralar section */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">Kumbaralar</h3>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{seciliFirmaninKumbaralari.length}</span>
                      </div>
                      {seciliFirmaninKumbaralari.length === 0 && (
                        <button onClick={() => {
                          const bugun = new Date();
                          const sonrakidegisim = new Date(bugun);
                          sonrakidegisim.setDate(bugun.getDate() + toplamaPeriyoduGun);
                          setKumbaraFormu({kumbaraNo:`KB-${Date.now()}`,firmaId:seciliFirma?.id,firm_id:seciliFirma?.id,degisimTarihi:bugun.toISOString().split('T')[0],next_replacement_date:sonrakidegisim,sonrakiDegisimTarihi:sonrakidegisim.toISOString(),status:'new',durum:'Yeni'});
                          setDuzenlenenKumbara(null);
                          setKumbaraModalAcik(true);
                        }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                          + Kumbara Ekle
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {seciliFirmaninKumbaralari.map(kumbara => {
                        const durum = getKumbaraDurumu(kumbara);
                        // Atanan ekibi bul
                        const atananEkip = ekipler.find(e => e.id === (kumbara.atanan_ekip_id || kumbara.atananEkipId));
                        // Bugünkü kontrol kaydını bul
                        const bugun = new Date(); bugun.setHours(0,0,0,0);
                        const bugunKontrol = gunlukKontrol.find(k => {
                          const t = new Date(k.kontrol_tarihi); t.setHours(0,0,0,0);
                          return k.kumbara_id === kumbara.id && t.getTime() === bugun.getTime() && !k.arsivlendi;
                        }) || null;
                        const yapiliyor = adminIslemYapiliyor[kumbara.id];
                        const notAcik = adminNotGoster[kumbara.id];
                        const DURUM_STIL = {
                          degistirildi: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: '✅ Değiştirildi' },
                          gerek_yok:    { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   label: 'ℹ️ Gerek Yok' },
                          ugranmadi:    { bg: 'bg-slate-100 border-slate-200',    text: 'text-slate-600',   label: '⚠️ Uğranmadı' },
                        };
                        const adminKontrolKaydet = async (d: 'degistirildi' | 'gerek_yok' | 'ugranmadi') => {
                          if (!atananEkip) return;
                          setAdminIslemYapiliyor(prev => ({ ...prev, [kumbara.id]: true }));
                          await gunlukKontrolKaydet(kumbara.id, atananEkip.id, d, adminIslemNotu[kumbara.id] || null);
                          setAdminIslemYapiliyor(prev => ({ ...prev, [kumbara.id]: false }));
                          setAdminNotGoster(prev => ({ ...prev, [kumbara.id]: false }));
                          setAdminIslemNotu(prev => ({ ...prev, [kumbara.id]: '' }));
                        };
                        return (
                          <div key={kumbara.id||kumbara.kumbaraNo} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="h-1.5" style={{backgroundColor:durum.renk}}></div>
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">{kumbara.kumbaraNo||kumbara.number}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{backgroundColor:durum.renk}}>{durum.yazi}</span>
                              </div>
                              <div className="flex gap-3 text-xs text-slate-500">
                                <span>Sonraki: {
                                  (kumbara.next_replacement_date instanceof Date)
                                    ? kumbara.next_replacement_date.toLocaleDateString('tr-TR')
                                    : (kumbara.sonrakiDegisimTarihi
                                        ? new Date(kumbara.sonrakiDegisimTarihi).toLocaleDateString('tr-TR')
                                        : 'Belirtilmemiş')
                                }</span>
                                {atananEkip && <span className="text-indigo-500 font-medium">📋 {atananEkip.ad}</span>}
                              </div>
                              {kumbara.notlar && <p className="text-xs text-amber-600 font-medium">⚠ {kumbara.notlar}</p>}

                              {/* Günlük kontrol */}
                              {atananEkip ? (
                                bugunKontrol ? (
                                  <div className={`rounded-lg border px-2 py-1.5 flex items-center justify-between gap-2 ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.bg || 'bg-slate-100 border-slate-200'}`}>
                                    <span className={`text-xs font-semibold ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.text || 'text-slate-600'}`}>
                                      {DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.label || bugunKontrol.durum}
                                    </span>
                                    {bugunKontrol.not && <span className="text-xs text-slate-400 truncate">{bugunKontrol.not}</span>}
                                    <button
                                      onClick={() => {
                                        setGunlukKontrolDuzenleniyor(prev => ({...prev, [kumbara.id]: true}));
                                        setAdminNotGoster(prev => ({...prev, [kumbara.id]: true}));
                                        setAdminIslemNotu(prev => ({...prev, [kumbara.id]: bugunKontrol.not || ''}));
                                      }}
                                      className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 hover:bg-blue-100"
                                    >Düzenle</button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Bugünkü İşlem</div>
                                    <div className="flex gap-1.5">
                                      {(['degistirildi', 'gerek_yok', 'ugranmadi'] as const).map((d) => (
                                        <button
                                          key={d}
                                          disabled={yapiliyor}
                                          onClick={() => adminKontrolKaydet(d)}
                                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                                            d === 'degistirildi' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                            d === 'gerek_yok'    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                                                   'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          {yapiliyor ? '...' : d === 'degistirildi' ? 'Değiştirildi' : d === 'gerek_yok' ? 'Gerek Yok' : 'Uğranmadı'}
                                        </button>
                                      ))}
                                    </div>
                                    {notAcik ? (
                                      <input
                                        type="text"
                                        placeholder="Not ekle (opsiyonel)..."
                                        value={adminIslemNotu[kumbara.id] || ''}
                                        onChange={(e) => setAdminIslemNotu(prev => ({...prev, [kumbara.id]: e.target.value}))}
                                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                      />
                                    ) : (
                                      <button onClick={() => setAdminNotGoster(prev => ({...prev, [kumbara.id]: true}))} className="text-xs text-slate-400 hover:text-slate-600">+ not ekle</button>
                                    )}
                                  </div>
                                )
                              ) : (
                                <p className="text-xs text-slate-400 italic">Ekipe atanmamış — işlem kaydı yapılamaz</p>
                              )}

                              <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                                <button onClick={() => {
                                  setDuzenlenenKumbara(kumbara);
                                  setKumbaraFormu({kumbaraNo:kumbara.kumbaraNo||kumbara.number,firmaId:kumbara.firmaId||kumbara.firm_id,firm_id:kumbara.firmaId||kumbara.firm_id,degisimTarihi:(()=>{const src=kumbara.last_replacement_date||kumbara.placement_date;if(!src)return new Date().toISOString().split('T')[0];return(src instanceof Date?src:new Date(src)).toISOString().split('T')[0];})(),next_replacement_date:kumbara.next_replacement_date,sonrakiDegisimTarihi:new Date(kumbara.next_replacement_date).toISOString(),period_days:kumbara.period_days||kumbara.toplamaPeriyodu||toplamaPeriyoduGun,toplamaPeriyodu:kumbara.period_days||kumbara.toplamaPeriyodu||toplamaPeriyoduGun,status:kumbara.status,durum:kumbara.durum,notes:kumbara.notes,notlar:kumbara.notlar});
                                  setKumbaraModalAcik(true);
                                }} className="flex-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-all">Düzenle</button>
                                <button onClick={async()=>{if(confirm('Bu kumbarayı silmek istediğinizden emin misiniz?')){await kumbaraSil(kumbara.id);}}} className="flex-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-all">Sil</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {seciliFirmaninKumbaralari.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <div className="text-3xl mb-2">🪣</div>
                          <p className="text-xs font-medium">Henüz kumbara eklenmemiş</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete section */}
                  <div className="p-4">
                    <button onClick={()=>setSilmeOnayiAcik(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-all border border-red-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Firmayı Sil
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change 7: Modern kumbara modal */}
        {kumbaraModalAcik && seciliFirma && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">{duzenlenenKumbara ? 'Kumbara Düzenle' : 'Yeni Kumbara Ekle'}</h2>
                <button onClick={()=>setKumbaraModalAcik(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={async(e)=>{
                e.preventDefault();
                if(!seciliFirma)return;
                const kumbaraVerisi: KumbaraFormState={number:kumbaraFormu.kumbaraNo||kumbaraFormu.number,kumbaraNo:kumbaraFormu.kumbaraNo||kumbaraFormu.number,firm_id:seciliFirma.id,firmaId:seciliFirma.id,period_days:toplamaPeriyoduGun,toplamaPeriyodu:toplamaPeriyoduGun,notes:kumbaraFormu.notlar||kumbaraFormu.notes||'',notlar:kumbaraFormu.notlar||kumbaraFormu.notes||''};
                if(kumbaraFormu.degisimTarihi){const degisimDate=new Date(kumbaraFormu.degisimTarihi);kumbaraVerisi.placement_date=degisimDate;kumbaraVerisi.last_replacement_date=degisimDate;const sonraki=new Date(degisimDate);sonraki.setDate(degisimDate.getDate()+Number(kumbaraVerisi.period_days));kumbaraVerisi.next_replacement_date=sonraki;}
                if(duzenlenenKumbara){const sonuc=await kumbaraGuncelle(duzenlenenKumbara.id,kumbaraVerisi);if(sonuc.success){setKumbaraModalAcik(false);}else{alert('Hata: '+sonuc.error);}}
                else{const sonuc=await kumbaraEkle(kumbaraVerisi);if(sonuc.success){setKumbaraModalAcik(false);}else{alert('Hata: '+sonuc.error);}}
              }} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kumbara No</label>
                  <input required type="text" value={kumbaraFormu.kumbaraNo||kumbaraFormu.number||''} onChange={(e)=>setKumbaraFormu({...kumbaraFormu,kumbaraNo:e.target.value,number:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" placeholder="KB-001"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Değişim Tarihi</label>
                  <div className="flex gap-2 mb-2">
                    <input required type="date" value={kumbaraFormu.degisimTarihi||''} onChange={(e)=>{const yeniTarih=e.target.value;const tarih=new Date(yeniTarih);const sonraki=new Date(tarih);sonraki.setDate(tarih.getDate()+toplamaPeriyoduGun);setKumbaraFormu({...kumbaraFormu,degisimTarihi:yeniTarih,next_replacement_date:sonraki,sonrakiDegisimTarihi:sonraki.toISOString()});}}
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const todayStr = today.toISOString().split('T')[0];
                        const sonraki = new Date(today);
                        sonraki.setDate(today.getDate() + toplamaPeriyoduGun);
                        setKumbaraFormu({...kumbaraFormu,degisimTarihi:todayStr,next_replacement_date:sonraki,sonrakiDegisimTarihi:sonraki.toISOString()});
                      }}
                      className="px-3 py-2.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all"
                    >
                      Bugünün Tarihini Kullan
                    </button>
                  </div>
                  {kumbaraFormu.next_replacement_date && (
                    <p className="text-xs text-indigo-600 font-medium">
                      Sonraki değişim: {(kumbaraFormu.next_replacement_date instanceof Date ? kumbaraFormu.next_replacement_date : new Date(kumbaraFormu.sonrakiDegisimTarihi as string)).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notlar</label>
                  <textarea value={kumbaraFormu.notlar||kumbaraFormu.notes||''} onChange={(e)=>setKumbaraFormu({...kumbaraFormu,notlar:e.target.value,notes:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} placeholder="İsteğe bağlı notlar..."/>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={()=>setKumbaraModalAcik(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all">İptal</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all">
                    {duzenlenenKumbara ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change 8: Modern danger modal */}
        {silmeOnayiAcik && seciliFirma && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Firmayı Sil</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Bu işlem geri alınamaz</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6 bg-slate-50 rounded-xl p-3">
                <span className="font-bold text-slate-800">{seciliFirma.ad}</span> adlı firmayı ve tüm kumbaralarını kalıcı olarak silmek istediğinizden emin misiniz?
              </p>
              <div className="flex gap-2">
                <button onClick={()=>setSilmeOnayiAcik(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all">İptal</button>
                <button onClick={async()=>{const sonuc=await firmaSil(seciliFirma.id);if(sonuc.success){setSilmeOnayiAcik(false);setSeciliFirma(null);}else{alert('Hata: '+sonuc.error);}}} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all">Evet, Sil</button>
              </div>
            </div>
          </div>
        )}

        {/* Change 9: Modern stat cards panel */}
        {gorusModu === 'harita' && haritaYuklendi && !loading && (
          <div className="absolute top-4 left-4 bg-white rounded-2xl shadow-xl z-10 w-64 border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">Kumbara Analizi</h3>
            </div>
            {(() => {
              const s = getKumbaraIstatistikleri();
              const items = [
                {label:'Geçmiş (0 gün)',  key:'gecmis',  val:s.gecmis,  color:'#EF4444'},
                {label:'Acil (1-7 gün)',   key:'acil',    val:s.acil,    color:'#F97316'},
                {label:'Yakında (8-30 gün)',key:'yakinda', val:s.yakinda, color:'#F59E0B'},
                {label:'Orta (31-60 gün)', key:'orta',    val:s.orta,    color:'#EAB308'},
                {label:'Güvende (60+ gün)',key:'guvende', val:s.guvende, color:'#22C55E'},
              ];
              return (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-500">Toplam</span>
                    <span className="text-xl font-black text-slate-800">{s.toplam}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div 
                        key={item.key} 
                        onClick={() => {
                          setSeciliDurumFiltresi(seciliDurumFiltresi === item.key ? null : item.key);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          seciliDurumFiltresi === item.key ? 'bg-slate-100 border border-slate-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:item.color}}></div>
                        <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                        <span className="text-xs font-bold" style={{color:item.color}}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                  {seciliDurumFiltresi && (
                    <button 
                      onClick={() => setSeciliDurumFiltresi(null)}
                      className="mt-3 w-full px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                    >
                      Tümünü Göster
                    </button>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Analiz Tarihi</label>
                    <input type="date" value={analizTarihi} onChange={(e)=>setAnalizTarihi(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Change 10: Modern settings modal */}
        {ayarlarAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4">
                <h2 className="text-base font-bold text-white">Ayarlar</h2>
                <p className="text-xs text-indigo-200 mt-0.5">Sistem tercihlerini yapılandırın</p>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Kumbara Toplama Periyodu</label>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setToplamaPeriyoduGun(Math.max(30,toplamaPeriyoduGun-30))} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition-all">−</button>
                    <input type="number" value={toplamaPeriyoduGun} onChange={(e)=>setToplamaPeriyoduGun(Math.max(30,Math.min(365,parseInt(e.target.value)||90)))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" min="30" max="365"/>
                    <button onClick={()=>setToplamaPeriyoduGun(Math.min(365,toplamaPeriyoduGun+30))} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition-all">+</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 text-center">Varsayılan: 90 gün (3 ay)</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Durum Renkleri</h3>
                  <div className="space-y-2">
                    {[{color:'#EF4444',label:'Geçmiş (0 gün)'},{color:'#F97316',label:'Acil (1-7 gün)'},{color:'#F59E0B',label:'Yakında (8-30 gün)'},{color:'#EAB308',label:'Orta (31-60 gün)'},{color:'#22C55E',label:'Güvende (60+ gün)'}].map(item=>(
                      <div key={item.label} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:item.color}}></div>
                        <span className="text-xs text-slate-600">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Yetkilendirme</h3>
                      <p className="mt-1 text-xs text-slate-500">Ana yönetici: meoncu@gmail.com</p>
                    </div>
                    <a href="/ekip" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                      Ekip Sayfası
                    </a>
                  </div>

                  {yetkiHata && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                      {yetkiHata}
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">E-posta</label>
                      <input
                        type="email"
                        value={yetkiEmail}
                        onChange={(e) => setYetkiEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="ornek@mail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Rol</label>
                      <select
                        value={yetkiTipi}
                        onChange={(e) => setYetkiTipi(e.target.value as 'admin' | 'team')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="team">Ekip</option>
                        <option value="admin">Yönetici</option>
                      </select>
                    </div>
                  </div>

                  {yetkiTipi === 'team' && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ekip</label>
                      <select
                        value={yetkiEkipId}
                        onChange={(e) => setYetkiEkipId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Seçiniz</option>
                        {ekipler.map((ekip) => (
                          <option key={ekip.id} value={ekip.id}>
                            {ekip.ad}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        setYetkiHata(null);
                        const email = yetkiEmail.trim().toLowerCase();
                        if (!email) {
                          setYetkiHata('E-posta girin');
                          return;
                        }
                        if (email === 'meoncu@gmail.com') {
                          setYetkiHata('Ana yönetici zaten sistemde otomatik yetkilidir');
                          return;
                        }
                        if (yetkiTipi === 'team' && !yetkiEkipId) {
                          setYetkiHata('Ekip seçin');
                          return;
                        }
                        setYetkiIsleniyor(true);
                        try {
                          await upsertUserRole({ email, role: yetkiTipi, ekip_id: yetkiTipi === 'team' ? yetkiEkipId : null });
                          setYetkiEmail('');
                          setYetkiEkipId('');
                        } catch (e: any) {
                          setYetkiHata(e?.message || 'Kaydedilemedi');
                        } finally {
                          setYetkiIsleniyor(false);
                        }
                      }}
                      disabled={yetkiIsleniyor}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-all"
                    >
                      {yetkiIsleniyor ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      onClick={() => {
                        setYetkiEmail('');
                        setYetkiEkipId('');
                        setYetkiHata(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all"
                    >
                      Temizle
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tanımlı Yetkiler</div>
                      <div className="text-[11px] text-slate-400">{kullaniciYetkileriYukleniyor ? 'Yükleniyor...' : `${kullaniciYetkileri.length} kayıt`}</div>
                    </div>

                    {kullaniciYetkileri.length === 0 && !kullaniciYetkileriYukleniyor ? (
                      <div className="mt-3 text-xs text-slate-500">Henüz yetki kaydı yok.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {kullaniciYetkileri.map((k) => {
                          const ekip = k.ekip_id ? ekipler.find((e) => e.id === k.ekip_id) : null;
                          return (
                            <div key={k.email} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-slate-800">{k.email}</div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {k.role === 'admin' ? 'Yönetici' : ekip ? `Ekip: ${ekip.ad}` : 'Ekip'}
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  setYetkiHata(null);
                                  if (k.email.trim().toLowerCase() === 'meoncu@gmail.com') {
                                    setYetkiHata('Ana yönetici kaydı silinemez');
                                    return;
                                  }
                                  setYetkiIsleniyor(true);
                                  try {
                                    await removeUserRole(k.email);
                                  } catch (e: any) {
                                    setYetkiHata(e?.message || 'Silinemedi');
                                  } finally {
                                    setYetkiIsleniyor(false);
                                  }
                                }}
                                disabled={yetkiIsleniyor}
                                className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                              >
                                Sil
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={()=>setAyarlarAcik(false)} className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all">Tamam</button>
              </div>
            </div>
          </div>
        )}

        {/* Ekip Üyesi Ekleme/Güncelleme Modal */}
        {ekipUyeEkleModalAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-white">{duzenlenenEkipUye ? 'Üye Güncelle' : 'Yeni Üye'}</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">Ekip üyesi bilgilerini girin</p>
                </div>
                <button onClick={()=>{setEkipUyeEkleModalAcik(false); setDuzenlenenEkipUye(null); setEkipUyeFormu({});}} className="text-white/80 hover:text-white">✕</button>
              </div>
              <form className="p-5 space-y-4" onSubmit={async (e)=>{
                e.preventDefault();
                try {
                  if (duzenlenenEkipUye) {
                    await ekipUyeGuncelle(duzenlenenEkipUye.id, ekipUyeFormu);
                  } else {
                    await ekipUyeEkle(ekipUyeFormu);
                  }
                  setEkipUyeEkleModalAcik(false);
                  setDuzenlenenEkipUye(null);
                  setEkipUyeFormu({});
                } catch (err) {
                  alert('Hata: ' + (err as Error).message);
                }
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ad</label>
                    <input type="text" required value={ekipUyeFormu.ad || ''} onChange={(e)=>setEkipUyeFormu({...ekipUyeFormu, ad:e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ad"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Soyad</label>
                    <input type="text" required value={ekipUyeFormu.soyad || ''} onChange={(e)=>setEkipUyeFormu({...ekipUyeFormu, soyad:e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Soyad"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Telefon Numarası</label>
                  <input type="tel" required value={ekipUyeFormu.telefon || ''} onChange={(e)=>setEkipUyeFormu({...ekipUyeFormu, telefon:e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="05xxxxxxxxx"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">E-posta</label>
                  <input type="email" required value={ekipUyeFormu.email || ''} onChange={(e)=>setEkipUyeFormu({...ekipUyeFormu, email:e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ornek@email.com"/>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={()=>{setEkipUyeEkleModalAcik(false); setDuzenlenenEkipUye(null); setEkipUyeFormu({});}} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all">İptal</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all">
                    {duzenlenenEkipUye ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </form>
              {ekipUyeleri.length > 0 && (
                <div className="border-t border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Mevcut Üyeler</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ekipUyeleri.map(uye => (
                      <div key={uye.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-sm font-bold">{uye.ad[0]}{uye.soyad[0]}</div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{uye.ad} {uye.soyad}</p>
                            <p className="text-xs text-slate-500">{uye.email} • {uye.telefon}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={()=>{setDuzenlenenEkipUye(uye); setEkipUyeFormu({...uye});}} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs">✏️</button>
                          <button onClick={async()=>{if(confirm('Üyeyi silmek istediğinize emin misiniz?')){await ekipUyeSil(uye.id);}}} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md text-xs">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ekip Oluşturma/Güncelleme Modal */}
        {ekipEkleModalAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-white">{duzenlenenEkip ? 'Ekip Güncelle' : 'Yeni Ekip'}</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">Ekip bilgilerini girin</p>
                </div>
                <button onClick={()=>{setEkipEkleModalAcik(false); setDuzenlenenEkip(null); setEkipFormu({});}} className="text-white/80 hover:text-white">✕</button>
              </div>
              <form className="p-5 space-y-4" onSubmit={async (e)=>{
                e.preventDefault();
                try {
                  if (duzenlenenEkip) {
                    await ekipGuncelle(duzenlenenEkip.id, ekipFormu);
                    setEkipEkleModalAcik(false);
                    setDuzenlenenEkip(null);
                    setEkipFormu({});
                  } else {
                    const result = await ekipEkle(ekipFormu);
                    if (result.success) {
                      setEkipEkleModalAcik(false);
                      setDuzenlenenEkip(null);
                      setEkipFormu({});
                    } else if (result.existingEkip) {
                      setMevcutAynisiEkip(result.existingEkip);
                    }
                  }
                } catch (err) {
                  alert('Hata: ' + (err as Error).message);
                }
              }}>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ekip Adı</label>
                  <input type="text" required value={ekipFormu.ad || ''} onChange={(e)=>setEkipFormu({...ekipFormu, ad:e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ekip 1"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Üyeler</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {ekipUyeleri.map(uye => (
                      <label key={uye.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={(ekipFormu.uye_idleri || []).includes(uye.id)} onChange={(e)=>{
                          const current = ekipFormu.uye_idleri || [];
                          if (e.target.checked) {
                            setEkipFormu({...ekipFormu, uye_idleri: [...current, uye.id]});
                          } else {
                            setEkipFormu({...ekipFormu, uye_idleri: current.filter((id: string) => id !== uye.id)});
                          }
                        }} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                        <span className="text-sm text-slate-700">{uye.ad} {uye.soyad}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={()=>{setEkipEkleModalAcik(false); setDuzenlenenEkip(null); setEkipFormu({});}} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all">İptal</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all">
                    {duzenlenenEkip ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </form>
              {mevcutAynisiEkip && (
                <div className="border-t border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-amber-500 text-white rounded-full text-xs font-bold">⚠️</div>
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Bu Üyelerle Zaten Bir Ekip Var!</h3>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-semibold text-slate-800">{mevcutAynisiEkip.ad}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {mevcutAynisiEkip.uye_idleri.length} Üye: {mevcutAynisiEkip.uye_idleri.map((id: string) => {
                        const uye = ekipUyeleri.find(u => u.id === id);
                        return uye ? uye.ad + ' ' + uye.soyad : '?';
                      }).join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setMevcutAynisiEkip(null);}} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all">
                      Kapat
                    </button>
                    <button onClick={() => {
                      setDuzenlenenEkip(mevcutAynisiEkip);
                      setEkipFormu({...mevcutAynisiEkip});
                      setMevcutAynisiEkip(null);
                    }} className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-all">
                      Bu Ekibi Düzenle
                    </button>
                  </div>
                </div>
              )}
              {ekipler.length > 0 && (
                <div className="border-t border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Mevcut Ekipler</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ekipler.map(ekip => (
                      <div key={ekip.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{ekip.ad}</p>
                          <p className="text-xs text-slate-500">
                            {ekip.uye_idleri.length} Üye: {ekip.uye_idleri.map((id: string) => {
                              const uye = ekipUyeleri.find(u => u.id === id);
                              return uye ? uye.ad[0]+uye.soyad[0] : '?';
                            }).join(', ')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={()=>{setDuzenlenenEkip(ekip); setEkipFormu({...ekip});}} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs">✏️</button>
                          <button onClick={async()=>{if(confirm('Ekibi silmek istediğinize emin misiniz?')){await ekipSil(ekip.id);}}} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md text-xs">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kumbara Atama Modal */}
        {kumbaraAtamaModalAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-white">Kumbara Atama</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">Mahalle ve caddeye göre gruplandırılmış kumbaraları atayın</p>
                </div>
                <button onClick={()=>{setKumbaraAtamaModalAcik(false); setAtamalar({}); setSeciliAtamaEkibi(null);}} className="text-white/80 hover:text-white">✕</button>
              </div>
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Ekip Seçimi */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Atanacak Ekip</label>
                    <div className="space-y-2">
                    {ekipler.map(ekip => {
                      const suAnkiAtamaSayisi = Object.values(atamalar).filter((id: string) => id === ekip.id).length;
                      const isKumbaraArchived = (kumbara: any): boolean => {
                        return !!gunlukKontrol.find(kontrol => 
                          (kontrol.kumbara_id === kumbara.id || kontrol.kumbara_no === (kumbara.kumbaraNo || kumbara.number)) && 
                          kontrol.arsivlendi
                        );
                      };
                      const mevcutAtamaSayisi = kumbaralar.filter(k => (k.atanan_ekip_id || k.atananEkipId) === ekip.id && !isKumbaraArchived(k)).length;
                      return (
                        <button key={ekip.id} onClick={()=>setSeciliAtamaEkibi(seciliAtamaEkibi === ekip.id ? null : ekip.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${seciliAtamaEkibi === ekip.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800">{ekip.ad}</p>
                            <div className="flex items-center gap-1">
                              {mevcutAtamaSayisi > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">{mevcutAtamaSayisi} Mevcut</span>
                              )}
                              {suAnkiAtamaSayisi > 0 && suAnkiAtamaSayisi !== mevcutAtamaSayisi && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">{suAnkiAtamaSayisi} Seçili</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{ekip.uye_idleri.length} Üye</p>
                        </button>
                      );
                    })}
                  </div>
                  {seciliAtamaEkibi && (
                    <button
                      onClick={() => {
                        const yeniAtamalar = { ...atamalar };
                        Object.keys(yeniAtamalar).forEach(kumbaraId => {
                          if (yeniAtamalar[kumbaraId] === seciliAtamaEkibi) {
                            delete yeniAtamalar[kumbaraId];
                          }
                        });
                        setAtamalar(yeniAtamalar);
                      }}
                      className="mt-3 w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-all"
                    >
                      Seçili Ekibin Atamalarını Temizle
                    </button>
                  )}
                  </div>
                  
                  {/* Kumbaralar */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Atanacak Kumbaralar</label>
                        {!seciliAtamaEkibi && ekipler.length > 0 && (
                          <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Lütfen önce bir Ekip seçin!</p>
                        )}
                      </div>
                      {Object.keys(atamalar).length > 0 && (
                        <button onClick={()=>setAtamalar({})} className="text-xs text-red-500 hover:text-red-700">Tüm Seçimleri Kaldır</button>
                      )}
                    </div>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                      {(() => {
                        // Ankara Ulus Merkezi koordinatları (WGS84)
                        const ulusLat = 39.9334;
                        const ulusLng = 32.8597;
                        
                        // Haversine formülü: İki koordinat arası mesafe (km)
                        const hesaplaMesafe = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
                          const R = 6371; // Dünya yarıçapı (km)
                          const dLat = (lat2 - lat1) * Math.PI / 180;
                          const dLng = (lng2 - lng1) * Math.PI / 180;
                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                    Math.sin(dLng/2) * Math.sin(dLng/2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                          return Math.round(R * c * 10) / 10; // 1 ondalıklı basamağa yuvarla
                        };
                        
                        // Helper to check if a kumbara is archived
                        const isKumbaraArchived = (kumbara: any): boolean => {
                          return !!gunlukKontrol.find(kontrol => 
                            (kontrol.kumbara_id === kumbara.id || kontrol.kumbara_no === (kumbara.kumbaraNo || kumbara.number)) && 
                            kontrol.arsivlendi
                          );
                        };
                        
                        // Firmaları "ilçe/mahalle" ye göre grupla, sadece arşivlenmemiş kumbaraları dahil
                        const gruplanmisFirmalar = firmalar
                          .filter(firma => firma.latitude && firma.longitude)
                          .filter(firma => {
                            // Sadece arşivlenmemiş en az 1 kumbarası olan firmaları dahil et
                            const firmayaAitKumbaralar = getFirmayaAitKumbaralar(firma.id);
                            return firmayaAitKumbaralar.some(kumbara => !isKumbaraArchived(kumbara));
                          })
                          .reduce((acc, firma) => {
                            const ilce = firma.ilce || 'Belirsiz İlçe';
                            const mahalle = firma.mahalle || 'Belirsiz Mahalle';
                            const grupAdi = `${ilce}/${mahalle}`;
                            if (!acc[grupAdi]) acc[grupAdi] = [];
                            acc[grupAdi].push(firma);
                            return acc;
                          }, {} as Record<string, Firma[]>);

                        // Her grup için istatistikler ve aciliyet puanı hesapla
                        const gruplar = Object.entries(gruplanmisFirmalar).map(([grupAdi, gruptakiFirmalar]) => {
                          const grupKumbaralari = gruptakiFirmalar.flatMap(firma => getFirmayaAitKumbaralar(firma.id)).filter(kumbara => !isKumbaraArchived(kumbara));
                          const grupIstatistikleri = grupKumbaralari.reduce((acc, kumbara) => {
                            const durum = getKumbaraDurumu(kumbara);
                            acc[durum.durum] = (acc[durum.durum] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          // Aciliyet puanı: geçmiş 100, acil 10, yakinda 5 puan
                          const aciliyetPuani = 
                            (grupIstatistikleri.gecmis || 0) * 100 +
                            (grupIstatistikleri.acil || 0) * 10 +
                            (grupIstatistikleri.yakinda || 0) * 5;
                          
                          // Gruptaki firmaların ortalama koordinatlarını hesapla
                          let avgLat = 0, avgLng = 0;
                          if (gruptakiFirmalar.length > 0) {
                            avgLat = gruptakiFirmalar.reduce((sum, f) => sum + (f.latitude || 0), 0) / gruptakiFirmalar.length;
                            avgLng = gruptakiFirmalar.reduce((sum, f) => sum + (f.longitude || 0), 0) / gruptakiFirmalar.length;
                          }
                          const ulusaMesafe = hesaplaMesafe(avgLat, avgLng, ulusLat, ulusLng);
                            
                          return { grupAdi, grupKumbaralari, grupIstatistikleri, aciliyetPuani, ulusaMesafe };
                        });
                        
                        // Grupları aciliyet puanına göre yüksekten düşüğe sırala
                        gruplar.sort((a, b) => b.aciliyetPuani - a.aciliyetPuani);
                        
                        // Her grup için render et
                        return gruplar.map(({ grupAdi, grupKumbaralari, grupIstatistikleri, ulusaMesafe }) => {
                          return (
                            <div key={grupAdi} className="border border-slate-200 rounded-xl overflow-hidden">
                              <div className="bg-slate-50 px-4 py-4 flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    {grupAdi}
                                    <span className="text-xs text-slate-500 font-medium">
                                      📍 {ulusaMesafe} km Ulus'a
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                      <span className="text-xs font-semibold text-red-600">{grupIstatistikleri.gecmis || 0}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                      <span className="text-xs font-semibold text-orange-600">{grupIstatistikleri.acil || 0}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                      <span className="text-xs font-semibold text-yellow-600">{grupIstatistikleri.yakinda || 0}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-yellow-300"></span>
                                      <span className="text-xs font-semibold text-yellow-700">{grupIstatistikleri.orta || 0}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                      <span className="text-xs font-semibold text-green-600">{grupIstatistikleri.guvende || 0}</span>
                                    </span>
                                  </div>
                                </div>
                                {/* Grup seviyesi toplu seçim butonları */}
                                <div className="flex gap-2">
                                  {['gecmis', 'acil', 'yakinda', 'orta', 'guvende'].map(durum => {
                                    const durumRenkleri: Record<string, string> = {
                                      gecmis: 'bg-red-500 hover:bg-red-600 text-white',
                                      acil: 'bg-orange-500 hover:bg-orange-600 text-white',
                                      yakinda: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                                      orta: 'bg-yellow-300 hover:bg-yellow-400 text-yellow-900',
                                      guvende: 'bg-green-500 hover:bg-green-600 text-white'
                                    };
                                    const renk = durumRenkleri[durum];
                                    const durumdakiTumKumbaralar = grupKumbaralari.filter(k => getKumbaraDurumu(k).durum === durum).map(k => k.id);
                                    const hepsiSeciliMi = durumdakiTumKumbaralar.length > 0 && durumdakiTumKumbaralar.every((id: string) => !!atamalar[id]);

                                    return (
                                      <button
                                        key={durum}
                                        onClick={() => {
                                          if (!seciliAtamaEkibi) {
                                            alert('Lütfen önce bir Ekip seçin!');
                                            return;
                                          }
                                          const newAtamalar = { ...atamalar };
                                          if (hepsiSeciliMi) {
                                            // Seçimi kaldır
                                            durumdakiTumKumbaralar.forEach(id => delete newAtamalar[id]);
                                          } else {
                                            // Seç
                                            durumdakiTumKumbaralar.forEach(id => {
                                              newAtamalar[id] = seciliAtamaEkibi;
                                            });
                                          }
                                          setAtamalar(newAtamalar);
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold ${renk} transition-all ${hepsiSeciliMi ? 'ring-4 ring-offset-2 ring-slate-400' : ''} ${!seciliAtamaEkibi ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={durumdakiTumKumbaralar.length === 0 || !seciliAtamaEkibi}
                                      >
                                        {grupIstatistikleri[durum] || 0}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {Object.keys(atamalar).length} kumbara seçildi
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setKumbaraAtamaModalAcik(false); setAtamalar({}); setSeciliAtamaEkibi(null);}} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-all">İptal</button>
                  <button onClick={async()=>{
                    const isKumbaraArchived = (kumbara: any): boolean => {
                      return !!gunlukKontrol.find(kontrol =>
                        (kontrol.kumbara_id === kumbara.id || kontrol.kumbara_no === (kumbara.kumbaraNo || kumbara.number)) &&
                        kontrol.arsivlendi
                      );
                    };
                    const mevcutAktifAtamalar = kumbaralar.filter(k =>
                      (k.atanan_ekip_id || k.atananEkipId) && !isKumbaraArchived(k)
                    );
                    const kaldirilanAtamalar = mevcutAktifAtamalar.filter(k => !atamalar[k.id]);
                    const eklenecekVeyaGuncellenecekAtamalar = Object.entries(atamalar);
                    if (mevcutAktifAtamalar.length === 0 && eklenecekVeyaGuncellenecekAtamalar.length === 0) {
                      alert('Lütfen en az bir kumbara seçin');
                      return;
                    }
                    if (!seciliAtamaEkibi && ekipler.length > 0) {
                      // Eğer ekip seçilmemişse ama ekip varsa, ilkini seç
                      setSeciliAtamaEkibi(ekipler[0].id);
                    }
                    for (const kumbara of kaldirilanAtamalar) {
                      await kumbaraAtama(kumbara.id, null);
                    }
                    for (const [kumbaraId, ekipId] of eklenecekVeyaGuncellenecekAtamalar) {
                      await kumbaraAtama(kumbaraId, ekipId);
                    }
                    setKumbaraAtamaModalAcik(false);
                    setAtamalar({});
                    setSeciliAtamaEkibi(null);
                    alert('Atamalar başarıyla güncellendi!');
                  }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all">
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            .print-card {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .print-table {
              font-size: 8pt;
              width: 100%;
              border-collapse: collapse;
            }
            .print-table th, .print-table td {
              padding: 4px 6px;
              border: 1px solid #ddd;
            }
            .print-table th {
              background: #f3f4f6;
            }
            .hidden-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Ekip Atama Listesi Modal - YENİ TASARIM */}
        {ekipAtamaListesiAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Ekip Atama Listesi</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">Ekiplere atanmış kumbaraları görüntüleyin</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                    🖨️ Yazdır
                  </button>
                  <button onClick={() => setEkipAtamaListesiAcik(false)} className="text-white/80 hover:text-white">✕</button>
                </div>
              </div>
              <div id="print-area" className="flex-1 overflow-y-auto p-5">
                <div className="space-y-6">
                  {(() => {
                    const bugun = new Date();
                    bugun.setHours(0, 0, 0, 0);

                    // Bugün kontrol kaydı olan kumbara id'leri (arşivlenmemiş)
                    const bugunKontrolEdilen = new Set(
                      gunlukKontrol
                        .filter(k => {
                          const t = new Date(k.kontrol_tarihi); t.setHours(0,0,0,0);
                          return t.getTime() === bugun.getTime() && !k.arsivlendi;
                        })
                        .map(k => k.kumbara_id)
                    );

                    // Daha önce arşivlenmiş kumbara id'leri
                    const arsivlenmis = new Set(
                      gunlukKontrol.filter(k => k.arsivlendi).map(k => k.kumbara_id)
                    );

                    // Ekipleri filtrele: en az 1 arşivlenmemiş kumbarası olan ekipler
                    const filteredEkipler = ekipler.filter(ekip =>
                      kumbaralar.some(k => {
                        const atanan = k.atanan_ekip_id === ekip.id || k.atananEkipId === ekip.id;
                        return atanan && !arsivlenmis.has(k.id);
                      })
                    );

                    if (filteredEkipler.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400">
                          <div className="text-4xl mb-3">🎉</div>
                          <p className="text-sm font-medium">Tüm ekiplerin kumbaraları arşivlendi!</p>
                        </div>
                      );
                    }

                    return filteredEkipler.map(ekip => {
                      // Bu ekibe atanmış, arşivlenmemiş kumbaralar
                      const tumAtananlar = kumbaralar.filter(k => {
                        const atanan = k.atanan_ekip_id === ekip.id || k.atananEkipId === ekip.id;
                        return atanan && !arsivlenmis.has(k.id);
                      });

                      const bekleyenler  = tumAtananlar.filter(k => !bugunKontrolEdilen.has(k.id));
                      const tamamlananlar = tumAtananlar.filter(k =>  bugunKontrolEdilen.has(k.id));
                      const tumTamamlandi = bekleyenler.length === 0 && tumAtananlar.length > 0;

                      const bugunkuArsiv = gunlukArsivler.find(a => {
                        const t = new Date(a.arsiv_tarihi); t.setHours(0,0,0,0);
                        return a.ekip_id === ekip.id && t.getTime() === bugun.getTime();
                      });

                      return (
                        <div key={ekip.id} className="print-card border border-slate-200 rounded-xl overflow-hidden">
                          {/* Ekip başlığı */}
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <h3 className="text-sm font-bold text-slate-800">{ekip.ad}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {ekip.uye_idleri.map((uid: string) => ekipUyeleri.find(u => u.id === uid)?.ad || '').filter(Boolean).join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{tumAtananlar.length} kumbara</span>
                              {tamamlananlar.length > 0 && (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">✅ {tamamlananlar.length} tamamlandı</span>
                              )}
                              {bekleyenler.length > 0 && (
                                <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">⏳ {bekleyenler.length} bekliyor</span>
                              )}
                              {bugunkuArsiv ? (
                                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">📁 Arşivlendi</span>
                              ) : (
                                <button
                                  disabled={!tumTamamlandi}
                                  onClick={async () => {
                                    const result = await gunlukIsleriArsivle(ekip.id);
                                    if (!result.success) alert(`Arşivleme hatası: ${result.error}`);
                                  }}
                                  title={tumTamamlandi ? 'Arşivle' : `${bekleyenler.length} kumbara henüz işlenmedi`}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all hidden-print ${
                                    tumTamamlandi
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  📁 {tumTamamlandi ? 'Arşivle' : `Arşivle (${bekleyenler.length} bekliyor)`}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Bekleyen kumbaralar tablosu */}
                            {bekleyenler.length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-2">⏳ İşlem Bekleyenler ({bekleyenler.length})</div>
                                <div className="overflow-x-auto">
                                  <table className="print-table w-full text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-center py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">#</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Kumbara No</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Firma</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Telefon</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Mahalle</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Cadde/Sokak</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">No</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase">Durum</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase hidden-print">İşlem</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {bekleyenler.map((kumbara, idx) => {
                                        const firma = firmalar.find(f => f.id === kumbara.firmaId || f.id === kumbara.firm_id);
                                        const durum = getKumbaraDurumu(kumbara);
                                        return (
                                          <tr key={kumbara.id} className="hover:bg-orange-50/40 bg-orange-50/20">
                                            <td className="py-1.5 px-2 text-center font-semibold">{idx + 1}</td>
                                            <td className="py-1.5 px-2 font-semibold whitespace-nowrap">{kumbara.kumbaraNo || kumbara.number}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">{firma?.ad || '-'}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">{firma?.yetkiliTelefon || '-'}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">{firma?.mahalle || '-'}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">{firma?.sokak || '-'}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">{firma?.kapiNo || '-'}</td>
                                            <td className="py-1.5 px-2 whitespace-nowrap">
                                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: durum.renk }}>{durum.yazi}</span>
                                            </td>
                                            <td className="py-1.5 px-2 hidden-print">
                                              <div className="flex flex-col gap-1">
                                                <div className="flex gap-1">
                                                  {(['degistirildi', 'gerek_yok', 'ugranmadi'] as const).map(d => (
                                                    <button
                                                      key={d}
                                                      onClick={async () => {
                                                        await gunlukKontrolKaydet(kumbara.id, ekip.id, d, gunlukKontrolNotu[kumbara.id] || '');
                                                        setGunlukKontrolNotu(prev => ({ ...prev, [kumbara.id]: '' }));
                                                      }}
                                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                                                        d === 'degistirildi' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                                        d === 'gerek_yok'    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                                                               'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                      }`}
                                                    >
                                                      {d === 'degistirildi' ? '✅ Değiştirildi' : d === 'gerek_yok' ? 'ℹ️ Gerek Yok' : '⚠️ Uğranmadı'}
                                                    </button>
                                                  ))}
                                                </div>
                                                <input
                                                  type="text"
                                                  placeholder="Not (opsiyonel)..."
                                                  value={gunlukKontrolNotu[kumbara.id] || ''}
                                                  onChange={(e) => setGunlukKontrolNotu(prev => ({ ...prev, [kumbara.id]: e.target.value }))}
                                                  className="text-[10px] px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Tamamlanan kumbaralar - kompakt liste */}
                            {tamamlananlar.length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-2">✅ Bugün Tamamlananlar ({tamamlananlar.length})</div>
                                <div className="space-y-1">
                                  {tamamlananlar.map(kumbara => {
                                    const firma = firmalar.find(f => f.id === kumbara.firmaId || f.id === kumbara.firm_id);
                                    const kontrol = gunlukKontrol.find(k => {
                                      const t = new Date(k.kontrol_tarihi); t.setHours(0,0,0,0);
                                      return k.kumbara_id === kumbara.id && t.getTime() === bugun.getTime() && !k.arsivlendi;
                                    });
                                    const STIL: Record<string, string> = {
                                      degistirildi: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                                      gerek_yok:    'bg-amber-50 border-amber-200 text-amber-700',
                                      ugranmadi:    'bg-slate-50 border-slate-200 text-slate-500',
                                    };
                                    const ETIKET: Record<string, string> = {
                                      degistirildi: '✅ Değiştirildi',
                                      gerek_yok:    'ℹ️ Gerek Yok',
                                      ugranmadi:    '⚠️ Uğranmadı',
                                    };
                                    const stil = STIL[kontrol?.durum || ''] || STIL.ugranmadi;
                                    return (
                                      <div key={kumbara.id} className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${stil}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className="text-xs font-bold shrink-0">{kumbara.kumbaraNo || kumbara.number}</span>
                                          <span className="text-xs truncate text-slate-600">{firma?.ad || '-'}</span>
                                          {kontrol?.not && <span className="text-[10px] text-slate-400 truncate">— {kontrol.not}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[10px] font-semibold">{ETIKET[kontrol?.durum || ''] || '-'}</span>
                                          <button
                                            onClick={() => {
                                              setGunlukKontrolDuzenleniyor(prev => ({ ...prev, [kumbara.id]: true }));
                                              setGunlukKontrolNotu(prev => ({ ...prev, [kumbara.id]: kontrol?.not || '' }));
                                            }}
                                            className="text-[10px] text-blue-500 hover:underline hidden-print"
                                          >Düzenle</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="border-t border-slate-200 px-5 py-4 flex gap-2 bg-slate-50">
                <button onClick={() => setEkipAtamaListesiAcik(false)} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-all">Kapat</button>
              </div>
            </div>
          </div>
        )}
        {/* Eksik Kalan İşler Modal */}
        {eksikKalanIslerAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">⚠️ Eksik Kalan İşler</h2>
                  <p className="text-xs text-red-200 mt-0.5">Günlük kontrolü yapılmayan kumbaralar</p>
                </div>
                <button onClick={() => setEksikKalanIslerAcik(false)} className="text-white/80 hover:text-white">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {/* Filtreler */}
                <div className="mb-4 flex gap-2 items-center">
                  <span className="text-sm font-medium text-slate-700">Ekip Filtresi:</span>
                  <select
                    value={eksikKalanIslerEkipFiltresi || ''}
                    onChange={(e) => setEksikKalanIslerEkipFiltresi(e.target.value || null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tüm Ekipler</option>
                    {ekipler.map(ekip => (
                      <option key={ekip.id} value={ekip.id}>{ekip.ad}</option>
                    ))}
                  </select>
                </div>
                {/* Eksik İşler Listesi */}
                {(() => {
                  const bugun = new Date();
                  bugun.setHours(0,0,0,0);
                  
                  // Tüm atanmış kumbaraları al
                  const atanmisKumbaralar = kumbaralar.filter(k => k.atanan_ekip_id || k.atananEkipId);
                  
                  // Bugün kontrolü yapılanları filtrele
                  const kontrolEdilenler = gunlukKontrol.filter(k => {
                    const kontrolTarihi = new Date(k.kontrol_tarihi);
                    kontrolTarihi.setHours(0,0,0,0);
                    return kontrolTarihi.getTime() === bugun.getTime();
                  }).map(k => k.kumbara_id);
                  
                  // Eksik kalanlar: atanmış ama kontrol edilmemiş
                  let eksikler = atanmisKumbaralar.filter(k => !kontrolEdilenler.includes(k.id));
                  
                  // Ekip filtresi
                  if (eksikKalanIslerEkipFiltresi) {
                    eksikler = eksikler.filter(k => (k.atanan_ekip_id || k.atananEkipId) === eksikKalanIslerEkipFiltresi);
                  }
                  
                  if (eksikler.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-sm font-medium">Tüm kumbaraların günlük kontrolü yapıldı!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {ekipler.filter(ekip => eksikler.some(k => (k.atanan_ekip_id || k.atananEkipId) === ekip.id)).map(ekip => {
                        const ekibeAitEksikler = eksikler.filter(k => (k.atanan_ekip_id || k.atananEkipId) === ekip.id);
                        return (
                          <div key={ekip.id} className="border border-red-200 rounded-xl overflow-hidden">
                            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                              <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                                {ekip.ad}
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-200 text-red-700 font-bold">
                                  {ekibeAitEksikler.length} eksik işlem
                                </span>
                              </h3>
                            </div>
                            <div className="p-4 grid gap-2">
                              {ekibeAitEksikler.map(kumbara => {
                                const firma = firmalar.find(f => f.id === kumbara.firm_id || f.id === kumbara.firmaId);
                                const durum = getKumbaraDurumu(kumbara);
                                return (
                                  <div key={kumbara.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800">{kumbara.kumbaraNo || kumbara.number}</span>
                                        <span className="text-xs text-slate-500">{firma?.ad || 'Bilinmeyen Firma'}</span>
                                      </div>
                                    </div>
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                      style={{ backgroundColor: durum.renk, color: '#fff' }}
                                    >
                                      {durum.yazi}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <div className="border-t border-slate-200 px-5 py-4 flex gap-2 bg-slate-50">
                <button onClick={() => setEksikKalanIslerAcik(false)} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-all">Kapat</button>
              </div>
            </div>
          </div>
        )}

        {/* Günlük Arşivler Modal */}
        {gunlukArsivlerModalAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">📚 Günlük Arşivler</h2>
                  <p className="text-xs text-purple-200 mt-0.5">Ekiplerin tamamlanan işlemlerini tarihe göre görün</p>
                </div>
                <button onClick={() => setGunlukArsivlerModalAcik(false)} className="text-white/80 hover:text-white">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {/* Filtreler */}
                <div className="mb-4 flex gap-2 items-center flex-wrap">
                  <span className="text-sm font-medium text-slate-700">Ekip:</span>
                  <select
                    value={eksikKalanIslerEkipFiltresi || ''}
                    onChange={(e) => setEksikKalanIslerEkipFiltresi(e.target.value || null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tüm Ekipler</option>
                    {ekipler.map(ekip => (
                      <option key={ekip.id} value={ekip.id}>{ekip.ad}</option>
                    ))}
                  </select>
                </div>

                {/* Arşiv Listesi */}
                {gunlukArsivler.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">📚</div>
                    <p className="text-sm font-medium">Henüz günlük arşiv yok</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      let filtrelenmis = gunlukArsivler;
                      if (eksikKalanIslerEkipFiltresi) {
                        filtrelenmis = gunlukArsivler.filter(a => a.ekip_id === eksikKalanIslerEkipFiltresi);
                      }
                      return filtrelenmis.map(arsiv => {
                        const arsivdekiKontroller = gunlukKontrol.filter(k => arsiv.gunluk_kontroller.includes(k.id));
                        return (
                          <div key={arsiv.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2-wrap">
                              <div>
                                <h3 className="text-sm font-bold text-slate-800">{arsiv.ekip_ad}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {arsiv.arsiv_tarihi.toLocaleDateString('tr-TR')} - {arsiv.arsiv_tarihi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                  {arsivdekiKontroller.length} işlem
                                </span>
                                {arsiv.eksik_kumbara_sayisi > 0 && (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                    {arsiv.eksik_kumbara_sayisi} eksik
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-4">
                              {arsivdekiKontroller.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Bu arşivde hiç işlem yok</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="print-table w-full text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-center py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sıra No</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Kumbara No</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Firma Adı</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tür</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Telefon</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">İlçe</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mahalle</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cadde/Sokak</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">No</th>
                                        <th className="text-left py-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Durum</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {arsivdekiKontroller.map((kontrol, index) => {
                                        // Find the firma by kumbara_id (or just use the kontrol data)
                                        const relatedKumbara = kumbaralar.find(k => k.id === kontrol.kumbara_id);
                                        const firma = firmalar.find(f => 
                                          (relatedKumbara && (f.id === relatedKumbara.firmaId || f.id === relatedKumbara.firm_id)) || 
                                          f.ad === kontrol.firma_ad
                                        );
                                        
                                        const durumText = {
                                          degistirildi: '✅ Değiştirildi',
                                          gerek_yok: 'ℹ️ Gerek Yok',
                                          ugranmadi: '⚠️ Uğranmadı',
                                          islem_yapilmadi: '⚠️ Uğranmadı' // Handle old status
                                        };
                                        const durumRenkBg = {
                                          degistirildi: 'bg-green-100',
                                          gerek_yok: 'bg-amber-100',
                                          ugranmadi: 'bg-slate-100',
                                          islem_yapilmadi: 'bg-slate-100'
                                        };
                                        const durumRenkText = {
                                          degistirildi: 'text-green-700',
                                          gerek_yok: 'text-amber-700',
                                          ugranmadi: 'text-slate-700',
                                          islem_yapilmadi: 'text-slate-700'
                                        };
                                        
                                        return (
                                          <tr key={kontrol.id} className="hover:bg-slate-50">
                                            <td className="py-1 px-2 text-[11px] text-center font-semibold text-slate-800">{index + 1}</td>
                                            <td className="py-1 px-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{kontrol.kumbara_no}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{kontrol.firma_ad || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.tur || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.yetkiliTelefon || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.ilce || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.mahalle || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.sokak || '-'}</td>
                                            <td className="py-1 px-2 text-[11px] text-slate-700 whitespace-nowrap">{firma?.kapiNo || '-'}</td>
                                            <td className="py-1 px-2 whitespace-nowrap">
                                              <div className="space-y-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${durumRenkBg[kontrol.durum as keyof typeof durumRenkBg]} ${durumRenkText[kontrol.durum as keyof typeof durumRenkText]}`}>
                                                  {durumText[kontrol.durum as keyof typeof durumText]}
                                                </span>
                                                {kontrol.not && (
                                                  <p className="text-[9px] text-slate-500">{kontrol.not}</p>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 px-5 py-4 flex gap-2 bg-slate-50">
                <button onClick={() => setGunlukArsivlerModalAcik(false)} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-all">Kapat</button>
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
            toplamaPeriyoduGun={toplamaPeriyoduGun}
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
  mapRef,
  toplamaPeriyoduGun
}: { 
  konum: [number, number], 
  kapali: () => void, 
  kaydedildi: () => void,
  firmaEkle: (firma: any, toplamaPeriyodu: number) => Promise<{ success: boolean; id?: string; error?: string }>,
  mapRef: React.RefObject<maplibregl.Map>,
  toplamaPeriyoduGun: number
}) {
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [adresYukleniyor, setAdresYukleniyor] = useState(false);
  const [form, setForm] = useState({
    ad: '',
    tur: 'Market',
    yetkiliAd: '',
    yetkiliTelefon: '',
    alternatifTelefon: '',
    whatsapp: '',
    eposta: '',
    il: '',
    ilce: '',
    mahalle: '',
    cadde: '',
    sokak: '',
    kapiNo: '',
    daireNo: '',
    aciklama: '',
    durum: 'Aktif'
  });
  
  // Konumu local state olarak tut, prop değiştiğinde güncelle
  const [currentKonum, setCurrentKonum] = useState(konum);
  
  // Reverse geocoding - Konumdan adres bul
  useEffect(() => {
    const getAdres = async () => {
      setAdresYukleniyor(true);
      try {
        const lat = currentKonum[1];
        const lng = currentKonum[0];
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=tr`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('Nominatim full yanıt:', data);
        if (data.address) {
          console.log('Nominatim adres:', data.address);
          setForm(prevForm => {
            const newForm = { ...prevForm };
            // İl için
            newForm.il = data.address.city || data.address.province || data.address.state || data.address.town || '';
            // İlçe için daha fazla anahtar dene
            newForm.ilce = data.address.county || data.address.district || data.address.borough || data.address.municipality || data.address.town || newForm.il;
            // Mahalle
            newForm.mahalle = data.address.neighbourhood || data.address.suburb || data.address.village || data.address.hamlet || '';
            // Cadde (ana yol / bulvar / cadde)
            newForm.cadde = data.address.road || data.address.street || '';
            // Sokak (yan yol - road'dan farklıysa)
            newForm.sokak = (data.address.footway || data.address.path || data.address.pedestrian || '');
            // Kapı No
            newForm.kapiNo = data.address.house_number || '';
            return newForm;
          });
        }
      } catch (err) {
        console.error('Adres alınamadı:', err);
      } finally {
        setAdresYukleniyor(false);
      }
    };
    getAdres();
  }, [currentKonum]);
  
  useEffect(() => {
    setCurrentKonum(konum);
  }, [konum]);

  const turler = Object.keys(FIRMA_TURLERI);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setKaydediliyor(true);
    
    try {
      // Firmanın tam adresini oluştur
      const adresParcalari = [
        form.mahalle,
        form.cadde,
        form.sokak,
        form.kapiNo ? `No: ${form.kapiNo}` : null,
        form.daireNo ? `D: ${form.daireNo}` : null,
      ].filter(Boolean);
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
        street: [form.cadde, form.sokak].filter(Boolean).join(' / ') || null,
        building_no: form.kapiNo || null,
        apartment_no: form.daireNo || null,
        latitude: currentKonum[1],
        longitude: currentKonum[0],
        description: form.aciklama || null,
        status: form.durum === 'Aktif' ? 'active' : 'inactive'
      };
      
      console.log('Kaydedilecek firma:', yeniFirma);
      
      const sonuc = await firmaEkle(yeniFirma, toplamaPeriyoduGun);
      
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

  // Change 11: Modern FirmaEkleModal return JSX
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Yeni Firma Ekle</h2>
            <p className="text-xs text-slate-400 mt-0.5">Haritadaki işareti sürükleyerek konumu ayarlayın</p>
          </div>
          <button onClick={kapali} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Firma Adı *</label>
            <input required type="text" value={form.ad} onChange={(e)=>setForm({...form,ad:e.target.value})}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" placeholder="Firma adını girin"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tür *</label>
              <select value={form.tur} onChange={(e)=>setForm({...form,tur:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {turler.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Durum</label>
              <select value={form.durum} onChange={(e)=>setForm({...form,durum:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Aktif">Aktif</option><option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Yetkili Kişi *</label>
            <input required type="text" value={form.yetkiliAd} onChange={(e)=>setForm({...form,yetkiliAd:e.target.value})}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ad Soyad"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Telefon *</label>
              <input required type="tel" value={form.yetkiliTelefon} onChange={(e)=>setForm({...form,yetkiliTelefon:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="05xx xxx xx xx"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Alternatif Tel</label>
              <input type="tel" value={form.alternatifTelefon} onChange={(e)=>setForm({...form,alternatifTelefon:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="05xx xxx xx xx"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Konum {adresYukleniyor ? <span className="text-indigo-500 flex items-center gap-1"><span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin inline-block"></span>Adres yükleniyor...</span> : ''}
            </label>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="grid grid-cols-2 gap-3 flex-1 mr-2">
                  <div className="bg-white rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-400 block">Enlem</span>
                    <span className="font-mono font-semibold text-slate-700">{currentKonum[1].toFixed(6)}</span>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-400 block">Boylam</span>
                    <span className="font-mono font-semibold text-slate-700">{currentKonum[0].toFixed(6)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>{const event=new CustomEvent('startLocationSelect');window.dispatchEvent(event);}}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all">
                  📍 Haritada Seç
                </button>
                <button type="button" onClick={()=>{if(mapRef.current){mapRef.current.flyTo({center:[currentKonum[0],currentKonum[1]],zoom:17,essential:true});}}}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition-all" title="Odakla">
                  🔍
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">İl</label>
              <input type="text" value={form.il} onChange={(e)=>setForm({...form,il:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">İlçe</label>
              <input type="text" value={form.ilce} onChange={(e)=>setForm({...form,ilce:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Çankaya"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mahalle</label>
              <input type="text" value={form.mahalle} onChange={(e)=>setForm({...form,mahalle:e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cadde</label>
              <input type="text" value={form.cadde} onChange={(e)=>setForm({...form,cadde:e.target.value})}
                placeholder="Atatürk Caddesi"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sokak</label>
              <input type="text" value={form.sokak} onChange={(e)=>setForm({...form,sokak:e.target.value})}
                placeholder="12. Sokak"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bina No</label>
              <input type="text" value={form.kapiNo} onChange={(e)=>setForm({...form,kapiNo:e.target.value})}
                placeholder="12"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Daire No</label>
              <input type="text" value={form.daireNo} onChange={(e)=>setForm({...form,daireNo:e.target.value})}
                placeholder="3"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Açıklama</label>
            <textarea value={form.aciklama} onChange={(e)=>setForm({...form,aciklama:e.target.value})}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} placeholder="İsteğe bağlı notlar..."/>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={kapali} disabled={kaydediliyor} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">İptal</button>
            <button type="submit" disabled={kaydediliyor} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {kaydediliyor ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Kaydediliyor...</> : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
