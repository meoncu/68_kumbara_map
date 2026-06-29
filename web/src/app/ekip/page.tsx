'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import { signOut } from 'firebase/auth';
import { useData } from '@/hooks/useData';
import { useAuthState } from '@/hooks/useAuthState';
import { useUserRole } from '@/hooks/useUserRole';
import { auth } from '@/lib/firebase';
import type { Ekip, EkipUyesi, Firma, Kumbara, GunlukKumbaraKontrol } from '@/lib/firebase';

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

const FIRMA_TURLERI = {
  Market: { renk: '#FF5722', ikon: '🛒' },
  Gıda: { renk: '#FF5722', ikon: '🛒' },
  Kasap: { renk: '#E91E63', ikon: '🥩' },
  Manav: { renk: '#4CAF50', ikon: '🥬' },
  Restoran: { renk: '#FF9800', ikon: '🍴' },
  Kafe: { renk: '#795548', ikon: '☕' },
  Pastane: { renk: '#E91E63', ikon: '🍰' },
  Giyim: { renk: '#9C27B0', ikon: '👕' },
  Ayakkabı: { renk: '#9C27B0', ikon: '👟' },
  Terzi: { renk: '#9C27B0', ikon: '🧵' },
  Kuaför: { renk: '#00BCD4', ikon: '💇' },
  Eczane: { renk: '#F44336', ikon: '💊' },
  'Diş Hekimi': { renk: '#00BCD4', ikon: '🦷' },
  Elektronik: { renk: '#3F51B5', ikon: '📱' },
  Diğer: { renk: '#607D8B', ikon: '🏪' },
};

type ViewMode = 'harita' | 'liste' | 'birlikte';

type AddressGroup = {
  firma: Firma;
  kumbaralar: Kumbara[];
  enKotuDurum: ReturnType<typeof getKumbaraDurumu>;
  durumSayilari: Record<string, number>;
};

function formatDate(value?: Date | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('tr-TR');
}

// Türk telefon numarası doğrulama ve formatlama
function telefonDegerlendirYeTR(raw: string | null | undefined): {
  gecerli: boolean;
  tel: string;       // tel: href için temiz numara
  gosterim: string;  // ekranda gösterilecek formatlı hali
  hata: string | null;
} {
  if (!raw || raw.trim() === '' || raw.trim() === '-') {
    return { gecerli: false, tel: '', gosterim: '-', hata: 'Telefon numarası girilmemiş' };
  }
  // Sadece rakamları al
  const sadeceSayi = raw.replace(/\D/g, '');
  // +90 ile başlıyorsa 90 ile başlar
  const normalize = sadeceSayi.startsWith('90') && sadeceSayi.length === 12
    ? sadeceSayi.slice(2)
    : sadeceSayi;

  if (normalize.length < 10) {
    return { gecerli: false, tel: sadeceSayi, gosterim: raw, hata: `Numara çok kısa (${normalize.length} hane)` };
  }
  if (normalize.length > 11) {
    return { gecerli: false, tel: sadeceSayi, gosterim: raw, hata: `Numara çok uzun (${normalize.length} hane)` };
  }
  const onHaneli = normalize.length === 11 && normalize.startsWith('0') ? normalize.slice(1) : normalize;
  if (!onHaneli.startsWith('5')) {
    return { gecerli: false, tel: sadeceSayi, gosterim: raw, hata: 'Geçersiz numara (5 ile başlamalı)' };
  }
  // Formatla: 0532 123 45 67
  const f = `0${onHaneli.slice(0, 3)} ${onHaneli.slice(3, 6)} ${onHaneli.slice(6, 8)} ${onHaneli.slice(8)}`;
  return { gecerli: true, tel: `+90${onHaneli}`, gosterim: f, hata: null };
}

function TelefonButon({ numara, label }: { numara?: string | null; label?: string }) {
  const { gecerli, tel, gosterim, hata } = telefonDegerlendirYeTR(numara);
  if (!numara || numara.trim() === '' || numara.trim() === '-') {
    return <span className="text-slate-400 text-xs italic">—</span>;
  }
  if (!gecerli) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-red-500 line-through">{gosterim}</span>
        <span className="text-[10px] bg-red-100 text-red-600 rounded px-1.5 py-0.5 font-semibold" title={hata || ''}>⚠ Hatalı</span>
      </div>
    );
  }
  return (
    <a
      href={`tel:${tel}`}
      className="flex items-center gap-1.5 group"
      title={label ? `${label} ara` : 'Ara'}
    >
      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">{gosterim}</span>
      <span className="w-5 h-5 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors flex-shrink-0">
        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </span>
    </a>
  );
}

function adresMetniOlustur(firma: Firma): string {
  const parcalar = [
    firma.mahalle || firma.neighborhood,
    firma.sokak || firma.street,
    firma.kapiNo || firma.building_no
      ? `No: ${firma.kapiNo || firma.building_no}${(firma.daireNo || firma.apartment_no) ? ` D: ${firma.daireNo || firma.apartment_no}` : ''}`
      : null,
    firma.ilce || firma.district,
  ].filter(Boolean);

  if (parcalar.length === 0) {
    return (firma.latitude && firma.longitude) ? '⚠️ Adres eksik — Adres Düzenle ile tamamlayın' : '⚠️ Adres bilgisi girilmemiş';
  }
  return parcalar.join(', ');
}

function getKumbaraDurumu(kumbara: Kumbara) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const sonrakiTarih = new Date(kumbara.next_replacement_date);
  sonrakiTarih.setHours(0, 0, 0, 0);
  const gunFarki = Math.ceil((sonrakiTarih.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));

  if (gunFarki <= 0) {
    return { key: 'gecmis', label: `${Math.abs(gunFarki)} gun gecmis`, color: '#EF4444', priority: 5 };
  }
  if (gunFarki <= 7) {
    return { key: 'acil', label: `${gunFarki} gun kaldi`, color: '#F97316', priority: 4 };
  }
  if (gunFarki <= 30) {
    return { key: 'yakinda', label: `${gunFarki} gun kaldi`, color: '#F59E0B', priority: 3 };
  }
  if (gunFarki <= 60) {
    return { key: 'orta', label: `${gunFarki} gun kaldi`, color: '#EAB308', priority: 2 };
  }
  return { key: 'guvende', label: `${gunFarki} gun kaldi`, color: '#22C55E', priority: 1 };
}

function isKumbaraArchived(kumbara: Kumbara, gunlukKontrol: GunlukKumbaraKontrol[]) {
  return gunlukKontrol.some(
    (kontrol) =>
      (kontrol.kumbara_id === kumbara.id || kontrol.kumbara_no === (kumbara.kumbaraNo || kumbara.number)) &&
      kontrol.arsivlendi
  );
}

function getTeamMembers(ekip: Ekip | undefined, ekipUyeleri: EkipUyesi[]) {
  if (!ekip) return [];
  return ekip.uye_idleri
    .map((uyeId) => ekipUyeleri.find((uye) => uye.id === uyeId))
    .filter(Boolean) as EkipUyesi[];
}

function EkipPageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">Ekip sayfasi yukleniyor</h1>
          <p className="mt-2 text-sm text-slate-500">Atanan aktif isler hazirlaniyor.</p>
        </div>
      </div>
    </div>
  );
}

function EkipPageInner({
  allowTeamSwitch,
  lockedEkipId,
  userEmail,
  onLogout,
}: {
  allowTeamSwitch: boolean;
  lockedEkipId: string | null;
  userEmail: string | null;
  onLogout: () => void;
}) {
  const searchParams = useSearchParams();
  const { firmalar, kumbaralar, ekipler, ekipUyeleri, gunlukKontrol, loading, connected, firmaGuncelle, gunlukKontrolKaydet } = useData();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [seciliEkipId, setSeciliEkipId] = useState<string | null>(null);
  const [seciliAdresId, setSeciliAdresId] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<ViewMode>(allowTeamSwitch ? 'birlikte' : 'harita');
  const [detayAcik, setDetayAcik] = useState(true);
  const [detaySekme, setDetaySekme] = useState<'bilgi' | 'kumbaralar'>('bilgi');

  // Günlük kontrol state
  const [islemYapiliyor, setIslemYapiliyor] = useState<Record<string, boolean>>({});
  const [islemNotu, setIslemNotu] = useState<Record<string, string>>({});
  const [notGoster, setNotGoster] = useState<Record<string, boolean>>({});

  // Adres düzenleme modal state
  const [adresDuzenleModal, setAdresDuzenleModal] = useState(false);
  const [duzenlenecekFirma, setDuzenlenecekFirma] = useState<Firma | null>(null);
  const [adresForm, setAdresForm] = useState({ mahalle: '', cadde: '', sokak: '', kapiNo: '', daireNo: '', ilce: '' });
  const [adresKaydediliyor, setAdresKaydediliyor] = useState(false);
  const [adresHata, setAdresHata] = useState<string | null>(null);
  const [geocodingYukleniyor, setGeocodingYukleniyor] = useState(false);

  // Telefon düzenleme modal state
  const [telefonModal, setTelefonModal] = useState(false);
  const [telefonFirma, setTelefonFirma] = useState<Firma | null>(null);
  const [telefonForm, setTelefonForm] = useState('');
  const [telefonKaydediliyor, setTelefonKaydediliyor] = useState(false);
  const [telefonHata, setTelefonHata] = useState<string | null>(null);

  const aktifKumbaralar = useMemo(
    () => kumbaralar.filter((kumbara) => !isKumbaraArchived(kumbara, gunlukKontrol)),
    [kumbaralar, gunlukKontrol]
  );

  const aktifEkipler = useMemo(() => {
    const tumAktif = ekipler.filter((ekip) =>
      aktifKumbaralar.some((kumbara) => (kumbara.atanan_ekip_id || kumbara.atananEkipId) === ekip.id)
    );
    if (!lockedEkipId) return tumAktif;
    return tumAktif.filter((e) => e.id === lockedEkipId);
  }, [ekipler, aktifKumbaralar, lockedEkipId]);

  useEffect(() => {
    if (lockedEkipId && aktifEkipler.some((ekip) => ekip.id === lockedEkipId)) {
      setSeciliEkipId(lockedEkipId);
      return;
    }

    const ekipIdFromUrl = searchParams.get('ekipId');
    if (allowTeamSwitch && ekipIdFromUrl && aktifEkipler.some((ekip) => ekip.id === ekipIdFromUrl)) {
      setSeciliEkipId((onceki) => onceki ?? ekipIdFromUrl);
      return;
    }

    if (!seciliEkipId && aktifEkipler.length > 0) {
      setSeciliEkipId(aktifEkipler[0].id);
      return;
    }

    if (seciliEkipId && !aktifEkipler.some((ekip) => ekip.id === seciliEkipId)) {
      setSeciliEkipId(aktifEkipler[0]?.id || null);
    }
  }, [aktifEkipler, searchParams, seciliEkipId, lockedEkipId, allowTeamSwitch]);

  const seciliEkip = useMemo(
    () => aktifEkipler.find((ekip) => ekip.id === seciliEkipId) || null,
    [aktifEkipler, seciliEkipId]
  );

  const seciliEkibinKumbaralari = useMemo(() => {
    if (!seciliEkip) return [];
    return aktifKumbaralar.filter(
      (kumbara) => (kumbara.atanan_ekip_id || kumbara.atananEkipId) === seciliEkip.id
    );
  }, [aktifKumbaralar, seciliEkip]);

  const adresGruplari = useMemo(() => {
    const grouped: AddressGroup[] = firmalar
      .map((firma) => {
        const firmayaAit = seciliEkibinKumbaralari.filter(
          (kumbara) => (kumbara.firmaId || kumbara.firm_id) === firma.id
        );
        if (firmayaAit.length === 0) return null;

        const durumSayilari = firmayaAit.reduce((acc, kumbara) => {
          const durum = getKumbaraDurumu(kumbara);
          acc[durum.key] = (acc[durum.key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const enKotuDurum = firmayaAit
          .map((kumbara) => getKumbaraDurumu(kumbara))
          .sort((a, b) => b.priority - a.priority)[0];

        return {
          firma,
          kumbaralar: firmayaAit.sort(
            (a, b) => getKumbaraDurumu(b).priority - getKumbaraDurumu(a).priority
          ),
          enKotuDurum,
          durumSayilari,
        };
      })
      .filter(Boolean) as AddressGroup[];

    return grouped.sort((a, b) => {
      if (b.enKotuDurum.priority !== a.enKotuDurum.priority) {
        return b.enKotuDurum.priority - a.enKotuDurum.priority;
      }
      return a.firma.ad!.localeCompare(b.firma.ad || '');
    });
  }, [firmalar, seciliEkibinKumbaralari]);

  useEffect(() => {
    if (!seciliAdresId && adresGruplari.length > 0) {
      setSeciliAdresId(adresGruplari[0].firma.id);
      return;
    }

    if (seciliAdresId && !adresGruplari.some((grup) => grup.firma.id === seciliAdresId)) {
      setSeciliAdresId(adresGruplari[0]?.firma.id || null);
    }
  }, [adresGruplari, seciliAdresId]);

  const seciliAdres = useMemo(
    () => adresGruplari.find((grup) => grup.firma.id === seciliAdresId) || null,
    [adresGruplari, seciliAdresId]
  );

  useEffect(() => {
    if (!seciliAdresId) return;
    setDetayAcik(true);
    setDetaySekme('bilgi');
  }, [seciliAdresId]);

  const konumdanAdresGetir = async (lat: number, lng: number): Promise<Partial<typeof adresForm>> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=tr`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.address) return {};
      const a = data.address;
      return {
        mahalle: a.neighbourhood || a.suburb || a.quarter || a.residential || '',
        cadde: a.road || a.street || '',
        sokak: a.footway || a.path || a.pedestrian || '',
        kapiNo: a.house_number || '',
        ilce: a.district || a.county || a.town || a.city_district || '',
      };
    } catch {
      return {};
    }
  };

  const adresDuzenleAc = async (firma: Firma) => {
    setDuzenlenecekFirma(firma);
    const mevcutForm = {
      mahalle: firma.mahalle || firma.neighborhood || '',
      cadde: (firma as any).cadde || (firma.sokak || firma.street || '').split(' / ')[0] || '',
      sokak: (firma as any).sokak2 || (firma.sokak || firma.street || '').split(' / ')[1] || '',
      kapiNo: firma.kapiNo || firma.building_no || '',
      daireNo: firma.daireNo || firma.apartment_no || '',
      ilce: firma.ilce || firma.district || '',
    };
    setAdresForm(mevcutForm);
    setAdresHata(null);
    setAdresDuzenleModal(true);

    // Koordinat varsa ve adres bilgileri eksikse otomatik doldur
    const lat = firma.latitude;
    const lng = firma.longitude;
    const adresEksik = !mevcutForm.sokak && !mevcutForm.mahalle;
    if (lat && lng && adresEksik) {
      setGeocodingYukleniyor(true);
      const bulunanAdres = await konumdanAdresGetir(lat, lng);
      setAdresForm((prev) => ({
        ...prev,
        mahalle: bulunanAdres.mahalle || prev.mahalle,
        sokak: bulunanAdres.sokak || prev.sokak,
        kapiNo: bulunanAdres.kapiNo || prev.kapiNo,
        ilce: bulunanAdres.ilce || prev.ilce,
      }));
      setGeocodingYukleniyor(false);
    }
  };

  const konumdanYenidenDoldur = async () => {
    if (!duzenlenecekFirma?.latitude || !duzenlenecekFirma?.longitude) {
      setAdresHata('Bu kayıtta koordinat bilgisi yok.');
      return;
    }
    setGeocodingYukleniyor(true);
    setAdresHata(null);
    const bulunanAdres = await konumdanAdresGetir(duzenlenecekFirma.latitude, duzenlenecekFirma.longitude);
    if (Object.keys(bulunanAdres).length === 0) {
      setAdresHata('Konumdan adres bulunamadı.');
    } else {
      setAdresForm((prev) => ({
        ...prev,
        mahalle: bulunanAdres.mahalle || prev.mahalle,
        sokak: bulunanAdres.sokak || prev.sokak,
        kapiNo: bulunanAdres.kapiNo || prev.kapiNo,
        ilce: bulunanAdres.ilce || prev.ilce,
      }));
    }
    setGeocodingYukleniyor(false);
  };

  const adresDuzenleKaydet = async () => {
    if (!duzenlenecekFirma) return;
    setAdresKaydediliyor(true);
    setAdresHata(null);
    const sonuc = await firmaGuncelle(duzenlenecekFirma.id, {
      mahalle: adresForm.mahalle || undefined,
      ilce: adresForm.ilce || undefined,
      sokak: adresForm.sokak || undefined,
      kapiNo: adresForm.kapiNo || undefined,
      daireNo: adresForm.daireNo || undefined,
    });
    setAdresKaydediliyor(false);
    if (sonuc.success) {
      setAdresDuzenleModal(false);
      setDuzenlenecekFirma(null);
    } else {
      setAdresHata(sonuc.error || 'Kayıt sırasında hata oluştu');
    }
  };

  const ekipUyeleriListesi = useMemo(
    () => getTeamMembers(seciliEkip || undefined, ekipUyeleri),
    [seciliEkip, ekipUyeleri]
  );

  const telefonDuzenleAc = (firma: Firma) => {
    setTelefonFirma(firma);
    setTelefonForm(firma.yetkiliTelefon || firma.representative_phone || '');
    setTelefonHata(null);
    setTelefonModal(true);
  };

  const telefonKaydet = async () => {
    if (!telefonFirma) return;
    // Basit validasyon
    const { gecerli, hata } = telefonDegerlendirYeTR(telefonForm);
    if (telefonForm.trim() !== '' && !gecerli) {
      setTelefonHata(hata);
      return;
    }
    setTelefonKaydediliyor(true);
    setTelefonHata(null);
    const sonuc = await firmaGuncelle(telefonFirma.id, {
      yetkiliTelefon: telefonForm.trim() || undefined,
    });
    setTelefonKaydediliyor(false);
    if (sonuc.success) {
      setTelefonModal(false);
      setTelefonFirma(null);
    } else {
      setTelefonHata(sonuc.error || 'Kayıt sırasında hata oluştu');
    }
  };

  // Bugünkü kontrol kaydını bul
  const bugunKontrolBul = (kumbaraId: string) => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return gunlukKontrol.find((k) => {
      const t = new Date(k.kontrol_tarihi);
      t.setHours(0, 0, 0, 0);
      return k.kumbara_id === kumbaraId && t.getTime() === bugun.getTime() && !k.arsivlendi;
    }) || null;
  };

  const kumbaraIslemKaydet = async (
    kumbaraId: string,
    durum: 'degistirildi' | 'gerek_yok' | 'ugranmadi'
  ) => {
    if (!seciliEkip) return;
    setIslemYapiliyor((prev) => ({ ...prev, [kumbaraId]: true }));
    await gunlukKontrolKaydet(kumbaraId, seciliEkip.id, durum, islemNotu[kumbaraId] || null);
    setIslemYapiliyor((prev) => ({ ...prev, [kumbaraId]: false }));
    setNotGoster((prev) => ({ ...prev, [kumbaraId]: false }));
    setIslemNotu((prev) => ({ ...prev, [kumbaraId]: '' }));
  };
  const sonAtamaTarihi = useMemo(() => {
    if (seciliEkibinKumbaralari.length === 0) return null;
    return seciliEkibinKumbaralari
      .map((kumbara) => new Date(kumbara.updated_at))
      .sort((a, b) => b.getTime() - a.getTime())[0];
  }, [seciliEkibinKumbaralari]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: SIMPLE_STYLE,
      center: [32.8597, 39.9334],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasMarker = false;

    adresGruplari.forEach((grup) => {
      if (!grup.firma.latitude || !grup.firma.longitude) return;

      const firmaTuru = ((grup.firma.tur || grup.firma.type || 'Diğer') as keyof typeof FIRMA_TURLERI) || 'Diğer';
      const turBilgisi = FIRMA_TURLERI[firmaTuru] || FIRMA_TURLERI['Diğer'];
      const durumRengi = grup.enKotuDurum.color;
      const seciliMi = grup.firma.id === seciliAdresId;

      const el = document.createElement('div');
      el.style.width = '52px';
      el.style.height = '60px';
      el.style.cursor = 'pointer';

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
          border: 3px solid ${seciliMi ? '#1D4ED8' : '#e0e0e0'};
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
          ${grup.kumbaralar.length}
        </div>
      `;

      el.title = grup.firma.ad || grup.firma.name || '';
      el.onclick = () => setSeciliAdresId(grup.firma.id);

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -8] })
        .setLngLat([grup.firma.longitude, grup.firma.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([grup.firma.longitude, grup.firma.latitude]);
      hasMarker = true;
    });

    if (hasMarker) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    } else {
      map.easeTo({ center: [32.8597, 39.9334], zoom: 11 });
    }
  }, [adresGruplari, seciliAdresId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, [gorunum, allowTeamSwitch]);

  if (!allowTeamSwitch) {
    return (
      <div className="relative h-screen w-full bg-slate-50 text-slate-900">
        <div className="absolute left-0 right-0 top-0 z-30 p-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{seciliEkip?.ad || 'Ekip'}</div>
              <div className="truncate text-xs font-semibold text-slate-400">{userEmail || ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex overflow-hidden rounded-full bg-slate-100 p-1">
                <button
                  onClick={() => setGorunum('harita')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    gorunum === 'harita' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Harita
                </button>
                <button
                  onClick={() => setGorunum('liste')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    gorunum === 'liste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Liste
                </button>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {loading ? 'Yukleniyor' : connected ? 'Bagli' : 'Cevrimdisi'}
              </span>
              <button
                onClick={onLogout}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cikis
              </button>
            </div>
          </div>
        </div>

        <div ref={mapContainerRef} className="h-full w-full" />

        {gorunum === 'liste' && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur">
            <div className="h-full pt-20">
              <div className="mx-auto max-w-6xl px-3 pb-6">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-800">Firma / Adres Listesi</div>
                  <button
                    onClick={() => setGorunum('harita')}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 sm:hidden"
                  >
                    Harita
                  </button>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-[740px] w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-xs font-bold text-slate-500">
                          <th className="px-4 py-3">Firma</th>
                          <th className="px-4 py-3">Adres</th>
                          <th className="px-4 py-3">Kumbara</th>
                          <th className="px-4 py-3">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adresGruplari.map((grup) => {
                          const adresMetni = adresMetniOlustur(grup.firma);
                          const seciliMi = seciliAdresId === grup.firma.id;
                          return (
                            <tr
                              key={grup.firma.id}
                              onClick={() => setSeciliAdresId(grup.firma.id)}
                              className={`cursor-pointer ${seciliMi ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                            >
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-slate-900">{grup.firma.ad || grup.firma.name}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-slate-600">{adresMetni || '-'}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {grup.kumbaralar.length}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                                  style={{ backgroundColor: grup.enKotuDurum.color }}
                                >
                                  {grup.enKotuDurum.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gorunum === 'harita' && seciliAdres && detayAcik && (
          <>
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3 md:hidden">
              <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 backdrop-blur">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{seciliAdres.firma.ad || seciliAdres.firma.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {adresMetniOlustur(seciliAdres.firma)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: seciliAdres.enKotuDurum.color }}
                    >
                      {seciliAdres.enKotuDurum.label}
                    </span>
                    <button
                      onClick={() => setDetayAcik(false)}
                      className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Kapat
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                      <button
                        onClick={() => setDetaySekme('bilgi')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          detaySekme === 'bilgi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Bilgi
                      </button>
                      <button
                        onClick={() => setDetaySekme('kumbaralar')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          detaySekme === 'kumbaralar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Kumbaralar
                      </button>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {seciliAdres.kumbaralar.length} kumbara
                    </span>
                  </div>

                  {detaySekme === 'bilgi' && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tür</div>
                          <div className="mt-0.5 text-xs font-semibold text-slate-700">{seciliAdres.firma.tur || seciliAdres.firma.type || 'Diğer'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Telefon</div>
                          <div className="mt-0.5 flex items-center justify-between gap-1">
                            <TelefonButon numara={seciliAdres.firma.yetkiliTelefon || seciliAdres.firma.representative_phone} />
                            <button
                              onClick={() => telefonDuzenleAc(seciliAdres.firma)}
                              className="shrink-0 text-[10px] font-semibold text-indigo-500 bg-indigo-50 rounded-lg px-1.5 py-0.5 hover:bg-indigo-100"
                              title="Telefonu düzenle"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2">
                        <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wide mb-1">Adres Bilgileri</div>
                        <div className="grid grid-cols-3 gap-1 text-xs">
                          <div>
                            <div className="font-semibold text-slate-400">Bina No</div>
                            <div className="font-bold text-slate-800">{seciliAdres.firma.kapiNo || seciliAdres.firma.building_no || '-'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-400">Daire No</div>
                            <div className="font-bold text-slate-800">{seciliAdres.firma.daireNo || seciliAdres.firma.apartment_no || '-'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-400">Sokak</div>
                            <div className="font-bold text-slate-800 truncate">{seciliAdres.firma.sokak || seciliAdres.firma.street || '-'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!seciliAdres.firma.latitude || !seciliAdres.firma.longitude) return;
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${seciliAdres.firma.latitude},${seciliAdres.firma.longitude}`;
                            window.open(url, '_blank');
                          }}
                          className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Yol Tarifi
                        </button>
                        <button
                          type="button"
                          onClick={() => adresDuzenleAc(seciliAdres.firma)}
                          className="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Adres Düzenle
                        </button>
                      </div>
                    </div>
                  )}

                  {detaySekme === 'kumbaralar' && (
                    <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto">
                      {seciliAdres.kumbaralar.map((kumbara) => {
                        const durum = getKumbaraDurumu(kumbara);
                        const bugunKontrol = bugunKontrolBul(kumbara.id);
                        const yapiliyor = islemYapiliyor[kumbara.id];
                        const notAcik = notGoster[kumbara.id];
                        const DURUM_STIL = {
                          degistirildi: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '✅ Değiştirildi' },
                          gerek_yok:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'ℹ️ Gerek Yok' },
                          ugranmadi:    { bg: 'bg-slate-100',  text: 'text-slate-600',   label: '⚠️ Uğranmadı' },
                        };
                        return (
                          <div key={kumbara.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-slate-800">{kumbara.kumbaraNo || kumbara.number}</div>
                                <div className="text-xs text-slate-400">Son değişim: {formatDate(kumbara.last_replacement_date)}</div>
                              </div>
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: durum.color }}>
                                {durum.label}
                              </span>
                            </div>
                            {bugunKontrol ? (
                              <div className={`rounded-xl px-2 py-1.5 flex items-center justify-between gap-2 ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.bg || 'bg-slate-100'}`}>
                                <span className={`text-xs font-semibold ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.text || 'text-slate-600'}`}>
                                  {DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.label || bugunKontrol.durum}
                                </span>
                                {bugunKontrol.not && <span className="text-xs text-slate-400 truncate">{bugunKontrol.not}</span>}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5">
                                  {(['degistirildi', 'gerek_yok', 'ugranmadi'] as const).map((d) => (
                                    <button
                                      key={d}
                                      disabled={yapiliyor}
                                      onClick={() => kumbaraIslemKaydet(kumbara.id, d)}
                                      className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
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
                                    value={islemNotu[kumbara.id] || ''}
                                    onChange={(e) => setIslemNotu((p) => ({ ...p, [kumbara.id]: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                                  />
                                ) : (
                                  <button onClick={() => setNotGoster((p) => ({ ...p, [kumbara.id]: true }))} className="text-xs text-slate-400 hover:text-slate-600">+ not ekle</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 top-0 z-20 hidden w-[380px] border-l border-slate-200 bg-white/95 backdrop-blur md:flex md:flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{seciliAdres.firma.ad || seciliAdres.firma.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {adresMetniOlustur(seciliAdres.firma)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: seciliAdres.enKotuDurum.color }}>
                    {seciliAdres.enKotuDurum.label}
                  </span>
                  <button onClick={() => setDetayAcik(false)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Kapat
                  </button>
                </div>
              </div>

              <div className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                    <button
                      onClick={() => setDetaySekme('bilgi')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        detaySekme === 'bilgi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Bilgi
                    </button>
                    <button
                      onClick={() => setDetaySekme('kumbaralar')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        detaySekme === 'kumbaralar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Kumbaralar
                    </button>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {seciliAdres.kumbaralar.length} kumbara
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5">
                {detaySekme === 'bilgi' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tür</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-700">{seciliAdres.firma.tur || seciliAdres.firma.type || 'Diğer'}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Telefon</div>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <TelefonButon numara={seciliAdres.firma.yetkiliTelefon || seciliAdres.firma.representative_phone} />
                          <button
                            onClick={() => telefonDuzenleAc(seciliAdres.firma)}
                            className="shrink-0 text-[10px] font-semibold text-indigo-500 bg-indigo-50 rounded-lg px-1.5 py-0.5 hover:bg-indigo-100"
                            title="Telefonu düzenle"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-3">
                      <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wide mb-2">Adres Bilgileri</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-slate-400">Bina No</div>
                          <div className="font-bold text-slate-800">{seciliAdres.firma.kapiNo || seciliAdres.firma.building_no || '-'}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-400">Daire No</div>
                          <div className="font-bold text-slate-800">{seciliAdres.firma.daireNo || seciliAdres.firma.apartment_no || '-'}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-400">Sokak/Cadde</div>
                          <div className="font-bold text-slate-800 truncate">{seciliAdres.firma.sokak || seciliAdres.firma.street || '-'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!seciliAdres.firma.latitude || !seciliAdres.firma.longitude) return;
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${seciliAdres.firma.latitude},${seciliAdres.firma.longitude}`;
                          window.open(url, '_blank');
                        }}
                        className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Yol Tarifi
                      </button>
                      <button
                        type="button"
                        onClick={() => adresDuzenleAc(seciliAdres.firma)}
                        className="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Adres Düzenle
                      </button>
                    </div>
                  </div>
                )}

                {detaySekme === 'kumbaralar' && (
                  <div className="space-y-2">
                    {seciliAdres.kumbaralar.map((kumbara) => {
                      const durum = getKumbaraDurumu(kumbara);
                      const bugunKontrol = bugunKontrolBul(kumbara.id);
                      const yapiliyor = islemYapiliyor[kumbara.id];
                      const notAcik = notGoster[kumbara.id];
                      const DURUM_STIL = {
                        degistirildi: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '✅ Değiştirildi' },
                        gerek_yok:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'ℹ️ Gerek Yok' },
                        ugranmadi:    { bg: 'bg-slate-100',  text: 'text-slate-600',   label: '⚠️ Uğranmadı' },
                      };
                      return (
                        <div key={kumbara.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-800">{kumbara.kumbaraNo || kumbara.number}</div>
                              <div className="text-xs text-slate-400">Son değişim: {formatDate(kumbara.last_replacement_date)}</div>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: durum.color }}>
                              {durum.label}
                            </span>
                          </div>
                          {bugunKontrol ? (
                            <div className={`rounded-xl px-2 py-1.5 flex items-center justify-between gap-2 ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.bg || 'bg-slate-100'}`}>
                              <span className={`text-xs font-semibold ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.text || 'text-slate-600'}`}>
                                {DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.label || bugunKontrol.durum}
                              </span>
                              {bugunKontrol.not && <span className="text-xs text-slate-400 truncate">{bugunKontrol.not}</span>}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex gap-1.5">
                                {(['degistirildi', 'gerek_yok', 'ugranmadi'] as const).map((d) => (
                                  <button
                                    key={d}
                                    disabled={yapiliyor}
                                    onClick={() => kumbaraIslemKaydet(kumbara.id, d)}
                                    className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
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
                                  value={islemNotu[kumbara.id] || ''}
                                  onChange={(e) => setIslemNotu((p) => ({ ...p, [kumbara.id]: e.target.value }))}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                                />
                              ) : (
                                <button onClick={() => setNotGoster((p) => ({ ...p, [kumbara.id]: true }))} className="text-xs text-slate-400 hover:text-slate-600">+ not ekle</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {gorunum === 'harita' && seciliAdres && !detayAcik && (
          <div className="absolute bottom-4 left-4 z-20">
            <button
              onClick={() => setDetayAcik(true)}
              className="rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur"
            >
              Detayi Ac
            </button>
          </div>
        )}

        {/* Telefon Düzenleme Modalı */}
        {telefonModal && telefonFirma && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTelefonModal(false)} />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-base font-bold text-slate-900">Telefon Güncelle</div>
                <div className="mt-0.5 text-sm text-slate-500 truncate">{telefonFirma.ad || telefonFirma.name}</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Yetkili Telefon</label>
                  <input
                    type="tel"
                    value={telefonForm}
                    onChange={(e) => {
                      setTelefonForm(e.target.value);
                      setTelefonHata(null);
                    }}
                    placeholder="05XX XXX XX XX"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {telefonForm.trim() !== '' && (() => {
                    const { gecerli, gosterim, hata } = telefonDegerlendirYeTR(telefonForm);
                    if (!gecerli) return (
                      <p className="mt-1 text-xs text-red-500">⚠ {hata}</p>
                    );
                    return <p className="mt-1 text-xs text-emerald-600">✓ {gosterim}</p>;
                  })()}
                </div>
                {telefonHata && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{telefonHata}</div>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTelefonModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={telefonKaydet}
                  disabled={telefonKaydediliyor}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {telefonKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adres Düzenleme Modalı */}
        {adresDuzenleModal && duzenlenecekFirma && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdresDuzenleModal(false)} />
            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-slate-900">Adres Güncelle</div>
                  <div className="mt-0.5 text-sm text-slate-500 truncate">{duzenlenecekFirma.ad || duzenlenecekFirma.name}</div>
                </div>
                {(duzenlenecekFirma.latitude && duzenlenecekFirma.longitude) && (
                  <button
                    type="button"
                    onClick={konumdanYenidenDoldur}
                    disabled={geocodingYukleniyor}
                    className="shrink-0 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {geocodingYukleniyor ? (
                      <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : '📍'}
                    {geocodingYukleniyor ? 'Aranıyor...' : 'Konumdan Bul'}
                  </button>
                )}
              </div>
              {geocodingYukleniyor && (
                <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-600 font-semibold">
                  Harita konumundan adres bilgileri alınıyor...
                </div>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Mahalle</label>
                    <input
                      type="text"
                      value={adresForm.mahalle}
                      onChange={(e) => setAdresForm((f) => ({ ...f, mahalle: e.target.value }))}
                      placeholder="Kızılay Mah."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">İlçe</label>
                    <input
                      type="text"
                      value={adresForm.ilce}
                      onChange={(e) => setAdresForm((f) => ({ ...f, ilce: e.target.value }))}
                      placeholder="Çankaya"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Sokak / Cadde</label>
                  <input
                    type="text"
                    value={adresForm.sokak}
                    onChange={(e) => setAdresForm((f) => ({ ...f, sokak: e.target.value }))}
                    placeholder="Atatürk Caddesi"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bina No</label>
                    <input
                      type="text"
                      value={adresForm.kapiNo}
                      onChange={(e) => setAdresForm((f) => ({ ...f, kapiNo: e.target.value }))}
                      placeholder="12"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Daire No</label>
                    <input
                      type="text"
                      value={adresForm.daireNo}
                      onChange={(e) => setAdresForm((f) => ({ ...f, daireNo: e.target.value }))}
                      placeholder="3"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                {adresHata && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{adresHata}</div>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdresDuzenleModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={adresDuzenleKaydet}
                  disabled={adresKaydediliyor || geocodingYukleniyor}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {adresKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Ekip Isleri</h1>
              <p className="mt-1 text-sm text-slate-500">
                Ekipler sadece kendilerine ait son aktif is paketini gorur.
              </p>
              {userEmail && <div className="mt-1 text-xs font-semibold text-slate-400">{userEmail}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {loading ? 'Yukleniyor' : connected ? 'Bagli' : 'Cevrimdisi'}
              </span>
              <button
                onClick={onLogout}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cikis
              </button>
            </div>
          </div>

          {allowTeamSwitch && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {aktifEkipler.map((ekip) => {
                const ekipKumbaralari = aktifKumbaralar.filter(
                  (kumbara) => (kumbara.atanan_ekip_id || kumbara.atananEkipId) === ekip.id
                );
                const adresSayisi = new Set(
                  ekipKumbaralari.map((kumbara) => kumbara.firmaId || kumbara.firm_id)
                ).size;

                return (
                  <button
                    key={ekip.id}
                    onClick={() => setSeciliEkipId(ekip.id)}
                    className={`min-w-[150px] rounded-2xl border px-4 py-3 text-left transition-all ${
                      seciliEkipId === ekip.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-base font-bold text-slate-800">{ekip.ad}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {ekip.uye_idleri.length} uye
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        {ekipKumbaralari.length} kumbara
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        {adresSayisi} adres
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4">
        {aktifEkipler.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Aktif is paketi yok</h2>
            <p className="mt-2 text-sm text-slate-500">
              Bu sayfada sadece arshivlenmemis ve halen ekipte bulunan son atamalar gosterilir.
            </p>
          </div>
        ) : seciliEkip ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Secili ekip</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{seciliEkip.ad}</div>
                <div className="mt-2 text-sm text-slate-500">
                  {ekipUyeleriListesi.map((uye) => `${uye.ad} ${uye.soyad}`).join(', ') || 'Uye bilgisi yok'}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Adres sayisi</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{adresGruplari.length}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kumbara sayisi</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{seciliEkibinKumbaralari.length}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Son atama</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{formatDate(sonAtamaTarihi)}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: 'birlikte', label: 'Birlikte' },
                { key: 'harita', label: 'Harita' },
                { key: 'liste', label: 'Liste' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGorunum(tab.key as ViewMode)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    gorunum === tab.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`mt-4 grid gap-4 ${gorunum === 'birlikte' ? 'lg:grid-cols-[1.15fr_0.85fr]' : 'grid-cols-1'}`}>
              {(gorunum === 'harita' || gorunum === 'birlikte') && (
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-800">Harita</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Sadece secili ekibin aktif adresleri gosterilir.
                    </p>
                  </div>
                  <div ref={mapContainerRef} className="h-[340px] w-full md:h-[520px]" />
                  {seciliAdres && (
                    <div className="border-t border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{seciliAdres.firma.ad || seciliAdres.firma.name}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {adresMetniOlustur(seciliAdres.firma)}
                          </div>
                        </div>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold text-white"
                          style={{ backgroundColor: seciliAdres.enKotuDurum.color }}
                        >
                          {seciliAdres.enKotuDurum.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(gorunum === 'liste' || gorunum === 'birlikte') && (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="text-sm font-bold text-slate-800">Firma / Adres Listesi</h2>
                      <p className="mt-1 text-xs text-slate-500">Firma satirina tiklayarak detaya inin.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[740px] w-full text-left">
                        <thead className="bg-slate-50">
                          <tr className="text-xs font-bold text-slate-500">
                            <th className="px-4 py-3">Firma</th>
                            <th className="px-4 py-3">Adres</th>
                            <th className="px-4 py-3">Kumbara</th>
                            <th className="px-4 py-3">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adresGruplari.map((grup) => {
                            const adresMetni = adresMetniOlustur(grup.firma);

                            const seciliMi = seciliAdresId === grup.firma.id;

                            return (
                              <tr
                                key={grup.firma.id}
                                onClick={() => setSeciliAdresId(grup.firma.id)}
                                className={`cursor-pointer ${seciliMi ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                              >
                                <td className="px-4 py-3">
                                  <div className="text-sm font-bold text-slate-900">{grup.firma.ad || grup.firma.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-slate-600">{adresMetni || '-'}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {grup.kumbaralar.length}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                                    style={{ backgroundColor: grup.enKotuDurum.color }}
                                  >
                                    {grup.enKotuDurum.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {seciliAdres && (
                    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{seciliAdres.firma.ad || seciliAdres.firma.name}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {adresMetniOlustur(seciliAdres.firma)}
                            </div>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white"
                            style={{ backgroundColor: seciliAdres.enKotuDurum.color }}
                          >
                            {seciliAdres.kumbaralar.length} kumbara
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(seciliAdres.durumSayilari).map(([durum, sayi]) => (
                              <span key={durum} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {durum}: {sayi}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => adresDuzenleAc(seciliAdres.firma)}
                            className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Adres Düzenle
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs">
                          <div>
                            <div className="font-semibold text-slate-400">Bina No</div>
                            <div className="font-bold text-slate-800">{seciliAdres.firma.kapiNo || seciliAdres.firma.building_no || '-'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-400">Daire No</div>
                            <div className="font-bold text-slate-800">{seciliAdres.firma.daireNo || seciliAdres.firma.apartment_no || '-'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-400">Sokak</div>
                            <div className="font-bold text-slate-800 truncate">{seciliAdres.firma.sokak || seciliAdres.firma.street || '-'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        {seciliAdres.kumbaralar.map((kumbara) => {
                          const durum = getKumbaraDurumu(kumbara);
                          const bugunKontrol = bugunKontrolBul(kumbara.id);
                          const yapiliyor = islemYapiliyor[kumbara.id];
                          const notAcik = notGoster[kumbara.id];
                          const DURUM_STIL = {
                            degistirildi: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '✅ Değiştirildi' },
                            gerek_yok:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'ℹ️ Gerek Yok' },
                            ugranmadi:    { bg: 'bg-slate-100',  text: 'text-slate-600',   label: '⚠️ Uğranmadı' },
                          };
                          return (
                            <div key={kumbara.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-bold text-slate-800">{kumbara.kumbaraNo || kumbara.number}</div>
                                  <div className="text-xs text-slate-400">Son değişim: {formatDate(kumbara.last_replacement_date)}</div>
                                </div>
                                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: durum.color }}>
                                  {durum.label}
                                </span>
                              </div>
                              {bugunKontrol ? (
                                <div className={`rounded-xl px-2 py-1.5 flex items-center justify-between gap-2 ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.bg || 'bg-slate-100'}`}>
                                  <span className={`text-xs font-semibold ${DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.text || 'text-slate-600'}`}>
                                    {DURUM_STIL[bugunKontrol.durum as keyof typeof DURUM_STIL]?.label || bugunKontrol.durum}
                                  </span>
                                  {bugunKontrol.not && <span className="text-xs text-slate-400 truncate">{bugunKontrol.not}</span>}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex gap-1.5">
                                    {(['degistirildi', 'gerek_yok', 'ugranmadi'] as const).map((d) => (
                                      <button
                                        key={d}
                                        disabled={yapiliyor}
                                        onClick={() => kumbaraIslemKaydet(kumbara.id, d)}
                                        className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
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
                                      value={islemNotu[kumbara.id] || ''}
                                      onChange={(e) => setIslemNotu((p) => ({ ...p, [kumbara.id]: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                                    />
                                  ) : (
                                    <button onClick={() => setNotGoster((p) => ({ ...p, [kumbara.id]: true }))} className="text-xs text-slate-400 hover:text-slate-600">+ not ekle</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Telefon Düzenleme Modalı */}
      {telefonModal && telefonFirma && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTelefonModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <div className="text-base font-bold text-slate-900">Telefon Güncelle</div>
              <div className="mt-0.5 text-sm text-slate-500 truncate">{telefonFirma.ad || telefonFirma.name}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Yetkili Telefon</label>
                <input
                  type="tel"
                  value={telefonForm}
                  onChange={(e) => {
                    setTelefonForm(e.target.value);
                    setTelefonHata(null);
                  }}
                  placeholder="05XX XXX XX XX"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {telefonForm.trim() !== '' && (() => {
                  const { gecerli, gosterim, hata } = telefonDegerlendirYeTR(telefonForm);
                  if (!gecerli) return (
                    <p className="mt-1 text-xs text-red-500">⚠ {hata}</p>
                  );
                  return <p className="mt-1 text-xs text-emerald-600">✓ {gosterim}</p>;
                })()}
              </div>
              {telefonHata && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{telefonHata}</div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setTelefonModal(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={telefonKaydet}
                disabled={telefonKaydediliyor}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {telefonKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adres Düzenleme Modalı */}
      {adresDuzenleModal && duzenlenecekFirma && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdresDuzenleModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="text-base font-bold text-slate-900">Adres Güncelle</div>
                <div className="mt-0.5 text-sm text-slate-500 truncate">{duzenlenecekFirma.ad || duzenlenecekFirma.name}</div>
              </div>
              {(duzenlenecekFirma.latitude && duzenlenecekFirma.longitude) && (
                <button
                  type="button"
                  onClick={konumdanYenidenDoldur}
                  disabled={geocodingYukleniyor}
                  className="shrink-0 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {geocodingYukleniyor ? (
                    <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : '📍'}
                  {geocodingYukleniyor ? 'Aranıyor...' : 'Konumdan Bul'}
                </button>
              )}
            </div>
            {geocodingYukleniyor && (
              <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-600 font-semibold">
                Harita konumundan adres bilgileri alınıyor...
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mahalle</label>
                  <input
                    type="text"
                    value={adresForm.mahalle}
                    onChange={(e) => setAdresForm((f) => ({ ...f, mahalle: e.target.value }))}
                    placeholder="Kızılay Mah."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">İlçe</label>
                  <input
                    type="text"
                    value={adresForm.ilce}
                    onChange={(e) => setAdresForm((f) => ({ ...f, ilce: e.target.value }))}
                    placeholder="Çankaya"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sokak / Cadde</label>
                <input
                  type="text"
                  value={adresForm.sokak}
                  onChange={(e) => setAdresForm((f) => ({ ...f, sokak: e.target.value }))}
                  placeholder="Atatürk Caddesi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bina No</label>
                  <input
                    type="text"
                    value={adresForm.kapiNo}
                    onChange={(e) => setAdresForm((f) => ({ ...f, kapiNo: e.target.value }))}
                    placeholder="12"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Daire No</label>
                  <input
                    type="text"
                    value={adresForm.daireNo}
                    onChange={(e) => setAdresForm((f) => ({ ...f, daireNo: e.target.value }))}
                    placeholder="3"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              {adresHata && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{adresHata}</div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setAdresDuzenleModal(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={adresDuzenleKaydet}
                disabled={adresKaydediliyor || geocodingYukleniyor}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {adresKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EkipPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthState();
  const { role, ekipId, loading: roleLoading } = useUserRole(user?.email);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    router.replace('/login?redirect=/ekip');
  }, [authLoading, user, router]);

  if (authLoading || roleLoading) {
    return <EkipPageFallback />;
  }

  if (!user) {
    return <EkipPageFallback />;
  }

  if (role === 'admin') {
    return (
      <Suspense fallback={<EkipPageFallback />}>
        <EkipPageInner
          allowTeamSwitch={true}
          lockedEkipId={null}
          userEmail={user.email || null}
          onLogout={async () => {
            await signOut(auth);
            router.replace('/login');
          }}
        />
      </Suspense>
    );
  }

  if (role === 'team') {
    if (!ekipId) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-lg font-bold text-slate-800">Ekip tanimi eksik</h1>
              <p className="mt-2 text-sm text-slate-500">Bu e-posta adresi bir ekibe baglanmamis.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={async () => {
                    await signOut(auth);
                    router.replace('/login');
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Cikis
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<EkipPageFallback />}>
        <EkipPageInner
          allowTeamSwitch={false}
          lockedEkipId={ekipId}
          userEmail={user.email || null}
          onLogout={async () => {
            await signOut(auth);
            router.replace('/login');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">Yetki yok</h1>
          <p className="mt-2 text-sm text-slate-500">Bu kullaniciya ekip veya yonetici yetkisi tanimlanmamis.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace('/login');
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Cikis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
