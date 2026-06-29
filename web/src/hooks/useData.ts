'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db, type Firma, type Kumbara, type EkipUyesi, type Ekip, type IslemGecmisi, type GunlukKumbaraKontrol, type GunlukArsiv } from '@/lib/firebase';

// localStorage anahtarları
const STORAGE_KEYS = {
  firmalar: 'kumbara_firmalar',
  kumbaralar: 'kumbara_kumbaralar',
  ekipUyeleri: 'kumbara_ekip_uyeleri',
  ekipler: 'kumbara_ekipler'
};

// localStorage'dan veri oku
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('localStorage okuma hatası:', e);
  }
  return fallback;
};

// localStorage'a veri yaz
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('localStorage yazma hatası:', e);
  }
};

// Firestore Timestamp'ı Date'e çevir
const timestampToDate = (ts: any): Date => {
  if (ts instanceof Timestamp) {
    return ts.toDate();
  }
  return new Date(ts);
};

// Firestore belgesini uygulama objesine çevir
const docToFirma = (doc: any): Firma => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
    deleted_at: data.deleted_at ? timestampToDate(data.deleted_at) : null,
    ad: data.name,
    tur: data.type || 'Market',
    yetkiliAd: data.representative_name || '',
    yetkiliTelefon: data.representative_phone || '',
    alternatifTelefon: data.alternative_phone || '',
    il: data.city,
    ilce: data.district,
    mahalle: data.neighborhood,
    sokak: data.street || '',
    kapiNo: data.building_no || '',
    daireNo: data.apartment_no || '',
    aciklama: data.description || '',
    durum: data.status === 'active' ? 'Aktif' : 'Pasif'
  };
};

const docToKumbara = (doc: any): Kumbara => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
    deleted_at: data.deleted_at ? timestampToDate(data.deleted_at) : null,
    placement_date: timestampToDate(data.placement_date),
    last_replacement_date: data.last_replacement_date ? timestampToDate(data.last_replacement_date) : null,
    next_replacement_date: timestampToDate(data.next_replacement_date),
    kumbaraNo: data.number,
    kumbaraTipi: data.type || 'Standart',
    firmaId: data.firm_id,
    atananEkipId: data.atanan_ekip_id,
    durum: data.status === 'overdue' ? 'Kırmızı' : 
           data.status === 'this_week' ? 'Turuncu' : 
           data.status === 'this_month' ? 'Sarı' : 'Yeni'
  };
};

const docToEkipUyesi = (doc: any): EkipUyesi => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
    deleted_at: data.deleted_at ? timestampToDate(data.deleted_at) : null
  };
};

const docToEkip = (doc: any): Ekip => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
    deleted_at: data.deleted_at ? timestampToDate(data.deleted_at) : null
  };
};

export function useData() {
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [kumbaralar, setKumbaralar] = useState<Kumbara[]>([]);
  const [ekipUyeleri, setEkipUyeleri] = useState<EkipUyesi[]>([]);
  const [ekipler, setEkipler] = useState<Ekip[]>([]);
  const [islemGecmisi, setIslemGecmisi] = useState<IslemGecmisi[]>([]);
  const [gunlukKontrol, setGunlukKontrol] = useState<GunlukKumbaraKontrol[]>([]);
  const [gunlukArsivler, setGunlukArsivler] = useState<GunlukArsiv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('🔥 Gerçek zamanlı Firebase dinleyicileri başlatılıyor...');
    
    // Önce localStorage'a bak - Firebase bağlanamazsa buradan yükle
    const storedFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
    const storedKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
    const storedEkipUyeleri = loadFromStorage<EkipUyesi[]>(STORAGE_KEYS.ekipUyeleri, []);
    const storedEkipler = loadFromStorage<Ekip[]>(STORAGE_KEYS.ekipler, []);
    
    if (storedFirmalar.length > 0 || storedEkipUyeleri.length > 0 || storedEkipler.length > 0) {
      console.log('📦 localStorage\'dan yüklendi');
      setFirmalar(storedFirmalar);
      setKumbaralar(storedKumbaralar);
      setEkipUyeleri(storedEkipUyeleri);
      setEkipler(storedEkipler);
      setLoading(false);
    }
    
    // Firmaları gerçek zamanlı dinle
    const unsubFirmalar = onSnapshot(collection(db, 'firms'), 
      (snapshot) => {
        const firmsData = snapshot.docs.map(docToFirma);
        setFirmalar(firmsData);
        setConnected(true);
        setLoading(false);
        setError(null);
        
        // Firebase verilerini localStorage'a kaydet (yedekleme)
        if (firmsData.length > 0) {
          saveToStorage(STORAGE_KEYS.firmalar, firmsData);
        }
        
        console.log('✅ Firmalar güncellendi! Toplam:', firmsData.length, 'firma');
      },
      (err) => {
        console.error('❌ Firmalar dinleme hatası:', err);
        // Firebase başarısız - localStorage'dan yükle
        if (storedFirmalar.length > 0) {
          setFirmalar(storedFirmalar);
          setKumbaralar(storedKumbaralar);
          setEkipUyeleri(storedEkipUyeleri);
          setEkipler(storedEkipler);
          setError('Firebase bağlantısı yok, localStorage\'dan yükleniyor...');
        } else {
          setError('Firmalar yüklenirken hata oluştu: ' + err.message);
        }
        setLoading(false);
      }
    );

    // Kumbaraları gerçek zamanlı dinle
    const unsubKumbaralar = onSnapshot(collection(db, 'piggy_banks'),
      (snapshot) => {
        const piggyBanksData = snapshot.docs.map(docToKumbara);
        setKumbaralar(piggyBanksData);
        
        // Kumbaraları localStorage'a kaydet
        if (piggyBanksData.length > 0) {
          saveToStorage(STORAGE_KEYS.kumbaralar, piggyBanksData);
        }
        
        console.log('✅ Kumbaralar güncellendi! Toplam:', piggyBanksData.length, 'kumbara');
      },
      (err) => {
        console.error('❌ Kumbaralar dinleme hatası:', err);
      }
    );

    // Ekip üyelerini gerçek zamanlı dinle
    const unsubEkipUyeleri = onSnapshot(collection(db, 'team_members'),
      (snapshot) => {
        const membersData = snapshot.docs.map(docToEkipUyesi);
        setEkipUyeleri(membersData);
        
        if (membersData.length > 0) {
          saveToStorage(STORAGE_KEYS.ekipUyeleri, membersData);
        }
        
        console.log('✅ Ekip üyeleri güncellendi! Toplam:', membersData.length, 'üye');
      },
      (err) => {
        console.error('❌ Ekip üyeleri dinleme hatası:', err);
      }
    );

    // Ekipleri gerçek zamanlı dinle
    const unsubEkipler = onSnapshot(collection(db, 'teams'),
      (snapshot) => {
        const teamsData = snapshot.docs.map(docToEkip);
        setEkipler(teamsData);
        
        if (teamsData.length > 0) {
          saveToStorage(STORAGE_KEYS.ekipler, teamsData);
        }
        
        console.log('✅ Ekipler güncellendi! Toplam:', teamsData.length, 'ekip');
      },
      (err) => {
        console.error('❌ Ekipler dinleme hatası:', err);
      }
    );

    // İşlem geçmişini gerçek zamanlı dinle
    const unsubIslemGecmisi = onSnapshot(
      query(collection(db, 'islemGecmisi'), orderBy('tarih', 'desc')),
      (snapshot) => {
        const historyData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            kumbara_id: data.kumbara_id,
            kumbara_no: data.kumbara_no,
            ekip_id: data.ekip_id,
            ekip_ad: data.ekip_ad,
            firma_id: data.firma_id,
            firma_ad: data.firma_ad,
            tarih: timestampToDate(data.tarih),
            created_at: timestampToDate(data.created_at)
          } as IslemGecmisi;
        });
        setIslemGecmisi(historyData);
        console.log('✅ İşlem geçmişi güncellendi! Toplam:', historyData.length, 'işlem');
      },
      (err) => {
        console.error('❌ İşlem geçmişi dinleme hatası:', err);
      }
    );

    // Günlük kontrolü gerçek zamanlı dinle
    const unsubGunlukKontrol = onSnapshot(
      query(collection(db, 'gunlukKontrol'), orderBy('kontrol_tarihi', 'desc')),
      (snapshot) => {
        const kontrolData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            kumbara_id: data.kumbara_id,
            kumbara_no: data.kumbara_no,
            ekip_id: data.ekip_id,
            ekip_ad: data.ekip_ad,
            firma_id: data.firma_id,
            firma_ad: data.firma_ad,
            kontrol_tarihi: timestampToDate(data.kontrol_tarihi),
            durum: data.durum,
            not: data.not,
            arsivlendi: data.arsivlendi,
            arsiv_id: data.arsiv_id,
            created_at: timestampToDate(data.created_at),
            updated_at: timestampToDate(data.updated_at)
          } as GunlukKumbaraKontrol;
        });
        setGunlukKontrol(kontrolData);
        console.log('✅ Günlük kontrol güncellendi! Toplam:', kontrolData.length, 'kontrol');
      },
      (err) => {
        console.error('❌ Günlük kontrol dinleme hatası:', err);
      }
    );

    // Günlük arşivleri gerçek zamanlı dinle
    const unsubGunlukArsivler = onSnapshot(
      query(collection(db, 'gunlukArsivler'), orderBy('arsiv_tarihi', 'desc')),
      (snapshot) => {
        const arsivData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ekip_id: data.ekip_id,
            ekip_ad: data.ekip_ad,
            arsiv_tarihi: timestampToDate(data.arsiv_tarihi),
            gunluk_kontroller: data.gunluk_kontroller,
            eksik_kumbara_sayisi: data.eksik_kumbara_sayisi,
            created_at: timestampToDate(data.created_at)
          } as GunlukArsiv;
        });
        setGunlukArsivler(arsivData);
        console.log('✅ Günlük arşivler güncellendi! Toplam:', arsivData.length, 'arşiv');
      },
      (err) => {
        console.error('❌ Günlük arşivler dinleme hatası:', err);
      }
    );

    // Temizlik fonksiyonu
    return () => {
      console.log('👋 Dinleyiciler durduruluyor...');
      unsubFirmalar();
      unsubKumbaralar();
      unsubEkipUyeleri();
      unsubEkipler();
      unsubIslemGecmisi();
      unsubGunlukKontrol();
      unsubGunlukArsivler();
    };
  }, []);

  // Yeni firma ekleme fonksiyonu
  const firmaEkle = async (yeniFirma: Partial<Firma>, toplamaPeriyodu: number = 90): Promise<{ success: boolean; id?: string; error?: string }> => {
    const now = new Date();
    try {
      setLoading(true);
      const firmaData = {
        name: yeniFirma.name || yeniFirma.ad,
        type: yeniFirma.type || yeniFirma.tur,
        representative_name: yeniFirma.representative_name || yeniFirma.yetkiliAd,
        representative_phone: yeniFirma.representative_phone || yeniFirma.yetkiliTelefon,
        alternative_phone: yeniFirma.alternative_phone || yeniFirma.alternatifTelefon || null,
        whatsapp: yeniFirma.whatsapp || null,
        email: yeniFirma.email || null,
        address: yeniFirma.address || null,
        city: yeniFirma.city || yeniFirma.il,
        district: yeniFirma.district || yeniFirma.ilce,
        neighborhood: yeniFirma.neighborhood || yeniFirma.mahalle,
        street: yeniFirma.street || yeniFirma.sokak || null,
        building_no: yeniFirma.building_no || yeniFirma.kapiNo || null,
        apartment_no: yeniFirma.apartment_no || yeniFirma.daireNo || null,
        latitude: yeniFirma.latitude || null,
        longitude: yeniFirma.longitude || null,
        description: yeniFirma.description || yeniFirma.aciklama || null,
        created_at: Timestamp.fromDate(now),
        updated_at: Timestamp.fromDate(now),
        deleted_at: null,
        status: (yeniFirma.status === 'Aktif' || yeniFirma.durum === 'Aktif') ? 'active' : (yeniFirma.status || 'active')
      };

      // Remove undefined values
      const cleanFirmaData = Object.fromEntries(
        Object.entries(firmaData).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'firms'), cleanFirmaData);
      console.log('✅ Firma kaydedildi, ID:', docRef.id);
      
      return { success: true, id: docRef.id };

    } catch (err) {
      console.error('❌ Firma ekleme hatası:', err);
      
      // Firebase başarısız - localStorage'a kaydet
      const localId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const localFirma: Firma = {
        id: localId,
        ...yeniFirma,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        status: yeniFirma.status || 'active',
        ad: yeniFirma.name || yeniFirma.ad || '',
        tur: yeniFirma.type || yeniFirma.tur || 'Diğer',
        yetkiliAd: yeniFirma.representative_name || yeniFirma.yetkiliAd || '',
        yetkiliTelefon: yeniFirma.representative_phone || yeniFirma.yetkiliTelefon || '',
        alternatifTelefon: yeniFirma.alternative_phone || yeniFirma.alternatifTelefon || '',
        il: yeniFirma.city || yeniFirma.il || '',
        ilce: yeniFirma.district || yeniFirma.ilce || '',
        mahalle: yeniFirma.neighborhood || yeniFirma.mahalle || '',
        sokak: yeniFirma.street || yeniFirma.sokak || '',
        kapiNo: yeniFirma.building_no || yeniFirma.kapiNo || '',
        daireNo: yeniFirma.apartment_no || yeniFirma.daireNo || '',
        aciklama: yeniFirma.description || yeniFirma.aciklama || '',
        durum: yeniFirma.status === 'active' ? 'Aktif' : 'Pasif'
      } as Firma;
      
      // localStorage'a ekle
      const mevcutFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
      const updatedFirmalar = [...mevcutFirmalar, localFirma];
      saveToStorage(STORAGE_KEYS.firmalar, updatedFirmalar);
      
      // State'i güncelle
      setFirmalar(prev => [...prev, localFirma]);
      
      console.log('✅ Firma localStorage\'a kaydedildi!');
      return { success: true, id: localId };

    } finally {
      setLoading(false);
    }
  };

  // Firma ID'sine göre kumbaraları getir
  const getFirmayaAitKumbaralar = (firmaId: string): Kumbara[] => {
    return kumbaralar.filter(k => k.firm_id === firmaId || k.firmaId === firmaId);
  };

  // Firma silme fonksiyonu
  const firmaSil = async (firmaId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🗑️ Firma siliniyor, ID:', firmaId);
      
      // Firebase'den sil
      await deleteDoc(doc(db, 'firms', firmaId));
      
      console.log('✅ Firma silindi, ID:', firmaId);
      return { success: true };
      
    } catch (err) {
      console.error('❌ Firma silme hatası:', err);
      
      // Firebase başarısız - localStorage'dan sil
      if (firmaId.startsWith('local_')) {
        const mevcutFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
        const updatedFirmalar = mevcutFirmalar.filter(f => f.id !== firmaId);
        saveToStorage(STORAGE_KEYS.firmalar, updatedFirmalar);
        
        // State'i güncelle
        setFirmalar(prev => prev.filter(f => f.id !== firmaId));
        
        console.log('✅ Firma localStorage\'dan silindi, ID:', firmaId);
        return { success: true };
      }
      
      return { success: false, error: 'Firma silinirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Firma güncelleme fonksiyonu
  const firmaGuncelle = async (firmaId: string, yeniVeriler: Partial<Firma>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('✏️ Firma güncelleniyor, ID:', firmaId);
      
      // Firebase'de güncelle
      const updateData: any = {
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      // Türkçe alanları İngilizceye çevir
      if (yeniVeriler.ad) updateData.name = yeniVeriler.ad;
      if (yeniVeriler.tur) updateData.type = yeniVeriler.tur;
      if (yeniVeriler.yetkiliAd) updateData.representative_name = yeniVeriler.yetkiliAd;
      if (yeniVeriler.yetkiliTelefon) updateData.representative_phone = yeniVeriler.yetkiliTelefon;
      if (yeniVeriler.alternatifTelefon) updateData.alternative_phone = yeniVeriler.alternatifTelefon;
      if (yeniVeriler.il) updateData.city = yeniVeriler.il;
      if (yeniVeriler.ilce) updateData.district = yeniVeriler.ilce;
      if (yeniVeriler.mahalle) updateData.neighborhood = yeniVeriler.mahalle;
      if (yeniVeriler.sokak) updateData.street = yeniVeriler.sokak;
      if (yeniVeriler.kapiNo) updateData.building_no = yeniVeriler.kapiNo;
      if (yeniVeriler.daireNo !== undefined) updateData.apartment_no = yeniVeriler.daireNo;
      if (yeniVeriler.aciklama) updateData.description = yeniVeriler.aciklama;
      if (yeniVeriler.durum) updateData.status = yeniVeriler.durum === 'Aktif' ? 'active' : 'inactive';
      if (yeniVeriler.latitude) updateData.latitude = yeniVeriler.latitude;
      if (yeniVeriler.longitude) updateData.longitude = yeniVeriler.longitude;
      await updateDoc(doc(db, 'firms', firmaId), updateData);
      
      console.log('✅ Firma güncellendi, ID:', firmaId);
      return { success: true };
      
    } catch (err) {
      console.error('❌ Firma güncelleme hatası:', err);
      
      // Firebase başarısız - localStorage'da güncelle
      if (firmaId.startsWith('local_')) {
        const mevcutFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
        const updatedFirmalar = mevcutFirmalar.map(f => 
          f.id === firmaId ? { ...f, ...yeniVeriler, updatedAt: new Date() } : f
        );
        saveToStorage(STORAGE_KEYS.firmalar, updatedFirmalar);
        
        // State'i güncelle
        setFirmalar(prev => prev.map(f => 
          f.id === firmaId ? { ...f, ...yeniVeriler, updatedAt: new Date() } : f
        ));
        
        console.log('✅ Firma localStorage\'da güncellendi, ID:', firmaId);
        return { success: true };
      }
      
      return { success: false, error: 'Firma güncellenirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Kumbara ekleme fonksiyonu
  const kumbaraEkle = async (kumbaraVerisi: Partial<Kumbara>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      setLoading(true);
      
      // Check if firm already has a kumbara
      const firmId = kumbaraVerisi.firm_id || kumbaraVerisi.firmaId;
      const existingKumbara = kumbaralar.find(k => (k.firm_id || k.firmaId) === firmId);
      if (existingKumbara) {
        return { success: false, error: 'Bu firmaya zaten bir kumbara eklenmiş!' };
      }
      
      const now = new Date();
      
      // Remove undefined fields
      const cleanKumbaraVerisi = Object.fromEntries(
        Object.entries(kumbaraVerisi).filter(([_, v]) => v !== undefined)
      );
      
      const kumbaraData = {
        ...cleanKumbaraVerisi,
        status: 'new',
        created_at: Timestamp.fromDate(now),
        updated_at: Timestamp.fromDate(now),
        deleted_at: null,
        total_collections: 0,
        total_donation: 0
      };

      const docRef = await addDoc(collection(db, 'piggy_banks'), kumbaraData);
      console.log('✅ Kumbara kaydedildi, ID:', docRef.id);
      return { success: true, id: docRef.id };

    } catch (err) {
      console.error('❌ Kumbara ekleme hatası:', err);

      // Firebase başarısız - localStorage'a kaydet
      const localId = `local_kb_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const localKumbara: Kumbara = {
        id: localId,
        ...kumbaraVerisi,
        status: 'new',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        total_collections: 0,
        total_donation: 0
      } as Kumbara;

      const mevcutKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
      const updatedKumbaralar = [...mevcutKumbaralar, localKumbara];
      saveToStorage(STORAGE_KEYS.kumbaralar, updatedKumbaralar);

      // State'i güncelle
      setKumbaralar(prev => [...prev, localKumbara]);

      console.log('✅ Kumbara localStorage\'a kaydedildi, ID:', localId);
      return { success: true, id: localId };

    } finally {
      setLoading(false);
    }
  };

  // Kumbara güncelleme fonksiyonu
  const kumbaraGuncelle = async (kumbaraId: string, yeniVeriler: Partial<Kumbara>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('✏️ Kumbara güncelleniyor, ID:', kumbaraId);

      // Firebase'de güncelle
      const updateData: any = {
        updated_at: Timestamp.fromDate(new Date())
      };

      // Alanları kopyala, skip undefined
      Object.keys(yeniVeriler).forEach(key => {
        const val = yeniVeriler[key as keyof Kumbara];
        if (val !== undefined) {
          // Tarih alanlarını kontrol et
          if (val instanceof Date) {
            updateData[key] = Timestamp.fromDate(val);
          } else {
            updateData[key] = val;
          }
        }
      });

      await updateDoc(doc(db, 'piggy_banks', kumbaraId), updateData);

      console.log('✅ Kumbara güncellendi, ID:', kumbaraId);
      return { success: true };

    } catch (err) {
      console.error('❌ Kumbara güncelleme hatası:', err);

      // Firebase başarısız - localStorage'da güncelle
      if (kumbaraId.startsWith('local_')) {
        const mevcutKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
        const updatedKumbaralar = mevcutKumbaralar.map(k => 
          k.id === kumbaraId ? { ...k, ...yeniVeriler, updated_at: new Date() } : k
        );
        saveToStorage(STORAGE_KEYS.kumbaralar, updatedKumbaralar);

        // State'i güncelle
        setKumbaralar(prev => prev.map(k => 
          k.id === kumbaraId ? { ...k, ...yeniVeriler, updated_at: new Date() } : k
        ));

        console.log('✅ Kumbara localStorage\'da güncellendi, ID:', kumbaraId);
        return { success: true };
      }

      return { success: false, error: 'Kumbara güncellenirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Kumbara silme fonksiyonu
  const kumbaraSil = async (kumbaraId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🗑️ Kumbara siliniyor, ID:', kumbaraId);

      // Firebase'den sil
      await deleteDoc(doc(db, 'piggy_banks', kumbaraId));

      console.log('✅ Kumbara silindi, ID:', kumbaraId);
      return { success: true };

    } catch (err) {
      console.error('❌ Kumbara silme hatası:', err);

      // Firebase başarısız - localStorage'dan sil
      if (kumbaraId.startsWith('local_')) {
        const mevcutKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
        const updatedKumbaralar = mevcutKumbaralar.filter(k => k.id !== kumbaraId);
        saveToStorage(STORAGE_KEYS.kumbaralar, updatedKumbaralar);

        // State'i güncelle
        setKumbaralar(prev => prev.filter(k => k.id !== kumbaraId));

        console.log('✅ Kumbara localStorage\'dan silindi, ID:', kumbaraId);
        return { success: true };
      }

      return { success: false, error: 'Kumbara silinirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Ekip üyesi ekleme
  const ekipUyeEkle = async (yeniUye: Partial<EkipUyesi>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      setLoading(true);
      const now = new Date();
      const uyeData = {
        ...yeniUye,
        created_at: Timestamp.fromDate(now),
        updated_at: Timestamp.fromDate(now),
        deleted_at: null
      };
      const docRef = await addDoc(collection(db, 'team_members'), uyeData);
      console.log('✅ Ekip üyesi kaydedildi, ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('❌ Ekip üyesi ekleme hatası:', err);
      const localId = `local_uye_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const localUye: EkipUyesi = { id: localId, ...yeniUye, created_at: new Date(), updated_at: new Date(), deleted_at: null, ad: yeniUye.ad || '', soyad: yeniUye.soyad || '', telefon: yeniUye.telefon || '', email: yeniUye.email || '' };
      const mevcutUyeler = loadFromStorage<EkipUyesi[]>(STORAGE_KEYS.ekipUyeleri, []);
      const updatedUyeler = [...mevcutUyeler, localUye];
      saveToStorage(STORAGE_KEYS.ekipUyeleri, updatedUyeler);
      setEkipUyeleri(prev => [...prev, localUye]);
      return { success: true, id: localId };
    } finally {
      setLoading(false);
    }
  };

  // Ekip üyesi güncelleme
  const ekipUyeGuncelle = async (uyeId: string, yeniVeriler: Partial<EkipUyesi>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const updateData: any = { updated_at: Timestamp.fromDate(new Date()) };
      Object.keys(yeniVeriler).forEach(key => {
        if (yeniVeriler[key as keyof EkipUyesi] !== undefined) updateData[key] = yeniVeriler[key as keyof EkipUyesi];
      });
      await updateDoc(doc(db, 'team_members', uyeId), updateData);
      console.log('✅ Ekip üyesi güncellendi, ID:', uyeId);
      return { success: true };
    } catch (err) {
      console.error('❌ Ekip üyesi güncelleme hatası:', err);
      if (uyeId.startsWith('local_')) {
        const mevcutUyeler = loadFromStorage<EkipUyesi[]>(STORAGE_KEYS.ekipUyeleri, []);
        const updatedUyeler = mevcutUyeler.map(u => u.id === uyeId ? { ...u, ...yeniVeriler, updated_at: new Date() } : u);
        saveToStorage(STORAGE_KEYS.ekipUyeleri, updatedUyeler);
        setEkipUyeleri(prev => prev.map(u => u.id === uyeId ? { ...u, ...yeniVeriler, updated_at: new Date() } : u));
        return { success: true };
      }
      return { success: false, error: 'Ekip üyesi güncellenirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Ekip üyesi silme
  const ekipUyeSil = async (uyeId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'team_members', uyeId));
      console.log('✅ Ekip üyesi silindi, ID:', uyeId);
      return { success: true };
    } catch (err) {
      console.error('❌ Ekip üyesi silme hatası:', err);
      if (uyeId.startsWith('local_')) {
        const mevcutUyeler = loadFromStorage<EkipUyesi[]>(STORAGE_KEYS.ekipUyeleri, []);
        const updatedUyeler = mevcutUyeler.filter(u => u.id !== uyeId);
        saveToStorage(STORAGE_KEYS.ekipUyeleri, updatedUyeler);
        setEkipUyeleri(prev => prev.filter(u => u.id !== uyeId));
        return { success: true };
      }
      return { success: false, error: 'Ekip üyesi silinirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Ekip ekleme
  const ekipEkle = async (yeniEkip: Partial<Ekip>): Promise<{ success: boolean; id?: string; error?: string; existingEkip?: Ekip }> => {
    try {
      setLoading(true);
      const yeniUyeIdleri = yeniEkip.uye_idleri || [];
      
      // Check for existing team with the exact same members
      const mevcutAynisi = ekipler.find(ekip => {
        if (ekip.deleted_at) return false;
        const ekipUyeIdleri = ekip.uye_idleri || [];
        if (ekipUyeIdleri.length !== yeniUyeIdleri.length) return false;
        
        // Check if all new members are in existing team
        return yeniUyeIdleri.every(uyeId => ekipUyeIdleri.includes(uyeId));
      });
      
      if (mevcutAynisi) {
        console.log('⚠️ Aynı üyelerle zaten bir ekip var:', mevcutAynisi);
        return { success: false, existingEkip: mevcutAynisi, error: 'Bu üyelerle zaten bir ekip oluşturulmuş!' };
      }
      
      const now = new Date();
      const ekipData = {
        ...yeniEkip,
        created_at: Timestamp.fromDate(now),
        updated_at: Timestamp.fromDate(now),
        deleted_at: null
      };
      const docRef = await addDoc(collection(db, 'teams'), ekipData);
      console.log('✅ Ekip kaydedildi, ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('❌ Ekip ekleme hatası:', err);
      const localId = `local_ekip_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const localEkip: Ekip = { id: localId, ...yeniEkip, created_at: new Date(), updated_at: new Date(), deleted_at: null, ad: yeniEkip.ad || '', uye_idleri: yeniEkip.uye_idleri || [] };
      const mevcutEkipler = loadFromStorage<Ekip[]>(STORAGE_KEYS.ekipler, []);
      const updatedEkipler = [...mevcutEkipler, localEkip];
      saveToStorage(STORAGE_KEYS.ekipler, updatedEkipler);
      setEkipler(prev => [...prev, localEkip]);
      return { success: true, id: localId };
    } finally {
      setLoading(false);
    }
  };

  // Ekip güncelleme
  const ekipGuncelle = async (ekipId: string, yeniVeriler: Partial<Ekip>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const updateData: any = { updated_at: Timestamp.fromDate(new Date()) };
      Object.keys(yeniVeriler).forEach(key => {
        if (yeniVeriler[key as keyof Ekip] !== undefined) updateData[key] = yeniVeriler[key as keyof Ekip];
      });
      await updateDoc(doc(db, 'teams', ekipId), updateData);
      console.log('✅ Ekip güncellendi, ID:', ekipId);
      return { success: true };
    } catch (err) {
      console.error('❌ Ekip güncelleme hatası:', err);
      if (ekipId.startsWith('local_')) {
        const mevcutEkipler = loadFromStorage<Ekip[]>(STORAGE_KEYS.ekipler, []);
        const updatedEkipler = mevcutEkipler.map(e => e.id === ekipId ? { ...e, ...yeniVeriler, updated_at: new Date() } : e);
        saveToStorage(STORAGE_KEYS.ekipler, updatedEkipler);
        setEkipler(prev => prev.map(e => e.id === ekipId ? { ...e, ...yeniVeriler, updated_at: new Date() } : e));
        return { success: true };
      }
      return { success: false, error: 'Ekip güncellenirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Ekip silme
  const ekipSil = async (ekipId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'teams', ekipId));
      console.log('✅ Ekip silindi, ID:', ekipId);
      return { success: true };
    } catch (err) {
      console.error('❌ Ekip silme hatası:', err);
      if (ekipId.startsWith('local_')) {
        const mevcutEkipler = loadFromStorage<Ekip[]>(STORAGE_KEYS.ekipler, []);
        const updatedEkipler = mevcutEkipler.filter(e => e.id !== ekipId);
        saveToStorage(STORAGE_KEYS.ekipler, updatedEkipler);
        setEkipler(prev => prev.filter(e => e.id !== ekipId));
        return { success: true };
      }
      return { success: false, error: 'Ekip silinirken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Kumbara atama
  const kumbaraAtama = async (kumbaraId: string, ekipId: string | null): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const updateData: any = { updated_at: Timestamp.fromDate(new Date()), atanan_ekip_id: ekipId };
      await updateDoc(doc(db, 'piggy_banks', kumbaraId), updateData);
      console.log(`✅ Kumbara ${ekipId ? ekipId + ' ekibine' : 'bir ekibe değil'} atandı!`);
      return { success: true };
    } catch (err) {
      console.error('❌ Kumbara atama hatası:', err);
      if (kumbaraId.startsWith('local_')) {
        const mevcutKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
        const updatedKumbaralar = mevcutKumbaralar.map(k =>
          k.id === kumbaraId ? { ...k, atanan_ekip_id: ekipId, atananEkipId: ekipId, updated_at: new Date() } : k
        );
        saveToStorage(STORAGE_KEYS.kumbaralar, updatedKumbaralar);
        setKumbaralar(prev => prev.map(k => k.id === kumbaraId ? { ...k, atanan_ekip_id: ekipId, atananEkipId: ekipId, updated_at: new Date() } : k));
        return { success: true };
      }
      return { success: false, error: 'Kumbara atanırken hata oluştu: ' + (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  const gunlukKontrolKaydet = async (
    kumbaraId: string,
    ekipId: string,
    durum: 'degistirildi' | 'gerek_yok' | 'ugranmadi',
    not?: string | null
  ) => {
    try {
      const today = new Date();
      
      // Kumbara bilgisini al
      const kumbara = kumbaralar.find(k => k.id === kumbaraId);
      if (!kumbara) {
        return { success: false, error: 'Kumbara bulunamadı!' };
      }

      // Firma bilgisini al
      const firma = firmalar.find(f => f.id === kumbara.firm_id || f.id === kumbara.firmaId);
      if (!firma) {
        return { success: false, error: 'Firma bulunamadı!' };
      }

      // Ekip bilgisini al
      const ekip = ekipler.find(e => e.id === ekipId);
      if (!ekip) {
        return { success: false, error: 'Ekip bulunamadı!' };
      }

      // Değiştirildi veya Gerek Yok ise kumbara tarihlerini güncelle
      if (durum === 'degistirildi' || durum === 'gerek_yok') {
        const nextReplacementDate = new Date(today);
        nextReplacementDate.setDate(today.getDate() + 90);
        
        const updateData: any = {
          last_replacement_date: Timestamp.fromDate(today),
          next_replacement_date: Timestamp.fromDate(nextReplacementDate),
          updated_at: Timestamp.fromDate(today)
        };
        
        await updateDoc(doc(db, 'piggy_banks', kumbaraId), updateData);

        // İşlem geçmişine de kaydet
        await addDoc(collection(db, 'islemGecmisi'), {
          kumbara_id: kumbaraId,
          kumbara_no: kumbara.kumbaraNo || kumbara.number,
          ekip_id: ekipId,
          ekip_ad: ekip.ad,
          firma_id: kumbara.firm_id || kumbara.firmaId,
          firma_ad: firma.ad || firma.name,
          tarih: Timestamp.fromDate(today),
          created_at: Timestamp.fromDate(today)
        });
      }

      // Günlük kontrol kaydını ekle veya güncelle
      // Önce bugünkü kayıt var mı kontrol et
      const bugun = new Date(today);
      bugun.setHours(0, 0, 0, 0);
      
      // Mevcut günlük kontrolü bul
      const mevcutKontrol = gunlukKontrol.find(k => {
        const kontrolTarihi = new Date(k.kontrol_tarihi);
        kontrolTarihi.setHours(0, 0, 0, 0);
        return k.kumbara_id === kumbaraId && kontrolTarihi.getTime() === bugun.getTime();
      });

      if (mevcutKontrol) {
        // Güncelle — ve hemen arşivle
        await updateDoc(doc(db, 'gunlukKontrol', mevcutKontrol.id), {
          durum,
          not,
          arsivlendi: true,
          updated_at: Timestamp.fromDate(today)
        });
        // Mevcut güncelleme için ayrı arsiv satırı ekle
        await addDoc(collection(db, 'gunlukArsivler'), {
          ekip_id: ekipId,
          ekip_ad: ekip.ad,
          arsiv_tarihi: Timestamp.fromDate(bugun),
          gunluk_kontroller: [mevcutKontrol.id],
          eksik_kumbara_sayisi: 0,
          tek_kayit: true,
          kumbara_no: kumbara.kumbaraNo || kumbara.number,
          firma_ad: firma.ad || firma.name,
          durum,
          created_at: Timestamp.fromDate(today)
        });
        console.log('✅ Günlük kontrol güncellendi ve arşivlendi:', mevcutKontrol.id);
      } else {
        // Yeni kayıt ekle — ve hemen arşivle
        const kontRef = await addDoc(collection(db, 'gunlukKontrol'), {
          kumbara_id: kumbaraId,
          kumbara_no: kumbara.kumbaraNo || kumbara.number,
          ekip_id: ekipId,
          ekip_ad: ekip.ad,
          firma_id: kumbara.firm_id || kumbara.firmaId,
          firma_ad: firma.ad || firma.name,
          kontrol_tarihi: Timestamp.fromDate(bugun),
          durum,
          not,
          arsivlendi: true,
          created_at: Timestamp.fromDate(today),
          updated_at: Timestamp.fromDate(today)
        });
        // Günlük arşiv kaydı
        await addDoc(collection(db, 'gunlukArsivler'), {
          ekip_id: ekipId,
          ekip_ad: ekip.ad,
          arsiv_tarihi: Timestamp.fromDate(bugun),
          gunluk_kontroller: [kontRef.id],
          eksik_kumbara_sayisi: 0,
          tek_kayit: true,
          kumbara_no: kumbara.kumbaraNo || kumbara.number,
          firma_ad: firma.ad || firma.name,
          durum,
          created_at: Timestamp.fromDate(today)
        });
        console.log('✅ Günlük kontrol kaydedildi ve arşivlendi!');
      }
      
      return { success: true };
    } catch (err) {
      console.error('❌ Günlük kontrol kaydedilirken hata:', err);
      return { success: false, error: (err as Error).message };
    }
  };

  const gunlukIsleriArsivle = async (
    ekipId: string
  ): Promise<{ success: boolean; error?: string; eksikKumbaraSayisi?: number }> => {
    try {
      const today = new Date();
      const bugun = new Date(today);
      bugun.setHours(0,0,0,0);

      // Get ekip
      const ekip = ekipler.find(e => e.id === ekipId);
      if (!ekip) {
        return { success: false, error: 'Ekip bulunamadı!' };
      }

      // Get ekibe atanan kumbaralar
      const ekibeAtananKumbaralar = kumbaralar.filter(k => 
        k.atanan_ekip_id === ekipId || k.atananEkipId === ekipId
      );

      // Get bugunku gunluk kontrolleri
      const bugunkuKontroller = gunlukKontrol.filter(k => {
        const kontrolTarihi = new Date(k.kontrol_tarihi);
        kontrolTarihi.setHours(0,0,0,0);
        return k.ekip_id === ekipId && kontrolTarihi.getTime() === bugun.getTime() && !k.arsivlendi;
      });

      // Eksik kalan kumbara sayisi = atanan kumbaralar - kontrol edilen kumbaralar
      const kontrolEdilenKumbaraIdleri = bugunkuKontroller.map(k => k.kumbara_id);
      const eksikKumbaraSayisi = ekibeAtananKumbaralar.filter(k => !kontrolEdilenKumbaraIdleri.includes(k.id)).length;

      // Create gunluk arsiv
      const arsivRef = await addDoc(collection(db, 'gunlukArsivler'), {
        ekip_id: ekipId,
        ekip_ad: ekip.ad,
        arsiv_tarihi: Timestamp.fromDate(today),
        gunluk_kontroller: bugunkuKontroller.map(k => k.id),
        eksik_kumbara_sayisi: eksikKumbaraSayisi,
        created_at: Timestamp.fromDate(today)
      });

      // Update all bugunku kontroller to be arsivlendi = true and arsiv_id = arsivRef.id
      for (const kontrol of bugunkuKontroller) {
        await updateDoc(doc(db, 'gunlukKontrol', kontrol.id), {
          arsivlendi: true,
          arsiv_id: arsivRef.id,
          updated_at: Timestamp.fromDate(today)
        });
      }

      console.log('✅ Günlük işler arşivlendi!');
      return { success: true, eksikKumbaraSayisi };

    } catch (err) {
      console.error('❌ Günlük işler arşivlenirken hata:', err);
      return { success: false, error: (err as Error).message };
    }
  };

  const kumbaraDegistirildi = async (kumbaraId: string, ekipId: string) => {
    try {
      const today = new Date();
      const nextReplacementDate = new Date(today);
      nextReplacementDate.setDate(today.getDate() + 90); // 3 months later
      
      // Kumbara bilgisini al
      const kumbara = kumbaralar.find(k => k.id === kumbaraId);
      if (!kumbara) {
        return { success: false, error: 'Kumbara bulunamadı!' };
      }

      // Firma bilgisini al
      const firma = firmalar.find(f => f.id === kumbara.firm_id || f.id === kumbara.firmaId);
      if (!firma) {
        return { success: false, error: 'Firma bulunamadı!' };
      }

      // Ekip bilgisini al
      const ekip = ekipler.find(e => e.id === ekipId);
      if (!ekip) {
        return { success: false, error: 'Ekip bulunamadı!' };
      }

      // Kumbara güncelle
      const updateData: any = {
        last_replacement_date: Timestamp.fromDate(today),
        next_replacement_date: Timestamp.fromDate(nextReplacementDate),
        updated_at: Timestamp.fromDate(today)
      };
      
      await updateDoc(doc(db, 'piggy_banks', kumbaraId), updateData);

      // İşlem geçmişine kaydet
      await addDoc(collection(db, 'islemGecmisi'), {
        kumbara_id: kumbaraId,
        kumbara_no: kumbara.kumbaraNo || kumbara.number,
        ekip_id: ekipId,
        ekip_ad: ekip.ad,
        firma_id: kumbara.firm_id || kumbara.firmaId,
        firma_ad: firma.ad || firma.name,
        tarih: Timestamp.fromDate(today),
        created_at: Timestamp.fromDate(today)
      });
      
      console.log('✅ Kumbara değiştirildi olarak işaretlendi ve geçmişe kaydedildi:', kumbaraId);
      return { success: true };
    } catch (err) {
      console.error('❌ Kumbara değiştirilirken hata:', err);
      return { success: false, error: (err as Error).message };
    }
  };

  return {
    firmalar,
    kumbaralar,
    ekipUyeleri,
    ekipler,
    islemGecmisi,
    gunlukKontrol,
    gunlukArsivler,
    loading,
    error,
    connected,
    refresh: () => {
      console.log('🔄 Gerçek zamanlı sistem zaten aktif, manuel yenilemeye gerek yok!');
    },
    getFirmayaAitKumbaralar,
    firmaEkle,
    firmaSil,
    firmaGuncelle,
    kumbaraEkle,
    kumbaraGuncelle,
    kumbaraSil,
    ekipUyeEkle,
    ekipUyeGuncelle,
    ekipUyeSil,
    ekipEkle,
    ekipGuncelle,
    ekipSil,
    kumbaraAtama,
    kumbaraDegistirildi,
    gunlukKontrolKaydet,
    gunlukIsleriArsivle
  };
}
