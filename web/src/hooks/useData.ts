'use client';

import { useState, useEffect } from 'react';
import { supabase, type Firma, type Kumbara, type Ekip, type Gorev, type IslemGecmisi } from '@/lib/supabase';

// Demo verileri - gerçek veritabanı bağlantısı yoksa kullanılacak
const DEMO_FIRMALAR: Firma[] = [
  { id: 1, ad: 'Ankara Kızılay Market', tur: 'Market', yetkiliAd: 'Mehmet Kaya', yetkiliTelefon: '05321112233', alternatifTelefon: null, whatsapp: null, eposta: 'info@kizilaymarket.com', adres: 'Kızılay Mah. Atatürk Bulv. No: 12', il: 'Ankara', ilce: 'Çankaya', mahalle: 'Kızılay', sokak: 'Atatürk Bulvarı', kapiNo: '12', latitude: 39.9334, longitude: 32.8597, aciklama: 'Merkez noktası, yoğun trafik', durum: 'Aktif', etiketler: 'Merkez,YüksekHasılat', ozelAlanlar: null },
  { id: 2, ad: 'Yeni Mahalle Kafe', tur: 'Kafe', yetkiliAd: 'Ayşe Demir', yetkiliTelefon: '05554443322', alternatifTelefon: null, whatsapp: null, eposta: 'kafe@yenimahalle.com', adres: 'Yeni Mahalle 3. Sok. No: 8', il: 'Ankara', ilce: 'Yenimahalle', mahalle: 'Yeni Mahalle', sokak: '3. Sokak', kapiNo: '8', latitude: 39.9456, longitude: 32.7987, aciklama: 'Sessiz bir kafe, iyi bir lokasyon', durum: 'Aktif', etiketler: 'Yerel', ozelAlanlar: null },
  { id: 3, ad: 'Çankaya Eczanesi', tur: 'Eczane', yetkiliAd: 'Dr. Ali Çelik', yetkiliTelefon: '05337778899', alternatifTelefon: '03123334455', whatsapp: null, eposta: 'eczane@cankaya.com', adres: 'Çankaya Mah. 1. Sok. No: 5', il: 'Ankara', ilce: 'Çankaya', mahalle: 'Çankaya', sokak: '1. Sokak', kapiNo: '5', latitude: 39.9283, longitude: 32.8545, aciklama: 'Eczane, 7/24 açık', durum: 'Aktif', etiketler: 'AcilDurum', ozelAlanlar: null },
];

const DEMO_KUMBARALAR: Kumbara[] = [
  { kumbaraNo: 'KMB001', firmaId: 1, qrKod: null, barkod: null, kumbaraTipi: 'Büyük Şeffaf Plastik', yerlestirmeTarihi: Date.now() - (90 * 24 * 60 * 60 * 1000), sonDegisimTarihi: null, sonrakiDegisimTarihi: Date.now() + (7 * 24 * 60 * 60 * 1000), periyotGun: 90, durum: 'Turuncu', toplamToplamSayisi: 3, toplamBagis: 1250.50, sonBagisMiktari: 400.00, sonBagisTarihi: Date.now() - (45 * 24 * 60 * 60 * 1000), notlar: null },
  { kumbaraNo: 'KMB002', firmaId: 1, qrKod: null, barkod: null, kumbaraTipi: 'Küçük Metal', yerlestirmeTarihi: Date.now() - (150 * 24 * 60 * 60 * 1000), sonDegisimTarihi: Date.now() - (90 * 24 * 60 * 60 * 1000), sonrakiDegisimTarihi: Date.now() - (15 * 24 * 60 * 60 * 1000), periyotGun: 90, durum: 'Kırmızı', toplamToplamSayisi: 5, toplamBagis: 2300.75, sonBagisMiktari: 350.00, sonBagisTarihi: Date.now() - (90 * 24 * 60 * 60 * 1000), notlar: 'Kumbara eskimiş, değiştirilmeli' },
  { kumbaraNo: 'KMB003', firmaId: 2, qrKod: null, barkod: null, kumbaraTipi: 'Büyük Şeffaf Plastik', yerlestirmeTarihi: Date.now() - (30 * 24 * 60 * 60 * 1000), sonDegisimTarihi: null, sonrakiDegisimTarihi: Date.now() + (60 * 24 * 60 * 60 * 1000), periyotGun: 90, durum: 'Yeni', toplamToplamSayisi: 0, toplamBagis: 0, sonBagisMiktari: null, sonBagisTarihi: null, notlar: null },
];

export function useData() {
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [kumbaralar, setKumbaralar] = useState<Kumbara[]>([]);
  const [ekipler, setEkipler] = useState<Ekip[]>([]);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [islemGecmisi, setIslemGecmisi] = useState<IslemGecmisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    fetchVeriler();
  }, []);

  const fetchVeriler = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Firmaları çek
      const { data: firmalarData, error: firmalarError } = await supabase
        .from('firmalar')
        .select('*');

      if (firmalarError || !firmalarData || firmalarData.length === 0) {
        console.warn('Supabase bağlantısı yok veya veri yok, demo verileri kullanılıyor:', firmalarError);
        setUseMock(true);
        setFirmalar(DEMO_FIRMALAR);
        setKumbaralar(DEMO_KUMBARALAR);
        setEkipler([]);
        setGorevler([]);
        setIslemGecmisi([]);
        return;
      }

      // Kumbaraları çek
      const { data: kumbaralarData, error: kumbaralarError } = await supabase
        .from('kumbaralar')
        .select('*');

      // Ekipleri çek
      const { data: ekiplerData } = await supabase
        .from('ekipler')
        .select('*');

      // Görevleri çek
      const { data: gorevlerData } = await supabase
        .from('gorevler')
        .select('*');

      // İşlem geçmişini çek
      const { data: islemGecmisiData } = await supabase
        .from('islem_gecmisi')
        .select('*')
        .order('tarih', { ascending: false })
        .limit(100);

      setFirmalar(firmalarData || []);
      setKumbaralar(kumbaralarData || []);
      setEkipler(ekiplerData || []);
      setGorevler(gorevlerData || []);
      setIslemGecmisi(islemGecmisiData || []);
      setUseMock(false);
      
    } catch (err) {
      console.error('Veri çekme hatası:', err);
      setError('Veritabanı bağlantısında sorun oluştu. Demo verileri kullanılıyor.');
      setUseMock(true);
      setFirmalar(DEMO_FIRMALAR);
      setKumbaralar(DEMO_KUMBARALAR);
    } finally {
      setLoading(false);
    }
  };

  // Firma ID'sine göre kumbaraları getir
  const getFirmayaAitKumbaralar = (firmaId: number): Kumbara[] => {
    return kumbaralar.filter(k => k.firmaId === firmaId);
  };

  return {
    firmalar,
    kumbaralar,
    ekipler,
    gorevler,
    islemGecmisi,
    loading,
    error,
    useMock,
    refresh: fetchVeriler,
    getFirmayaAitKumbaralar,
  };
}
