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
  onSnapshot 
} from 'firebase/firestore';
import { db, type Firma, type Kumbara } from '@/lib/firebase';

// localStorage anahtarları
const STORAGE_KEYS = {
  firmalar: 'kumbara_firmalar',
  kumbaralar: 'kumbara_kumbaralar'
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
    il: data.city,
    ilce: data.district,
    mahalle: data.neighborhood,
    sokak: data.street || '',
    kapiNo: data.building_no || '',
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
    durum: data.status === 'overdue' ? 'Kırmızı' : 
           data.status === 'this_week' ? 'Turuncu' : 
           data.status === 'this_month' ? 'Sarı' : 'Yeni'
  };
};

export function useData() {
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [kumbaralar, setKumbaralar] = useState<Kumbara[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('🔥 Gerçek zamanlı Firebase dinleyicileri başlatılıyor...');
    
    // Önce localStorage'a bak - Firebase bağlanamazsa buradan yükle
    const storedFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
    const storedKumbaralar = loadFromStorage<Kumbara[]>(STORAGE_KEYS.kumbaralar, []);
    
    if (storedFirmalar.length > 0) {
      console.log('📦 localStorage\'dan yüklendi:', storedFirmalar.length, 'firma');
      setFirmalar(storedFirmalar);
      setKumbaralar(storedKumbaralar);
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

    // Temizlik fonksiyonu
    return () => {
      console.log('👋 Dinleyiciler durduruluyor...');
      unsubFirmalar();
      unsubKumbaralar();
    };
  }, []);

  // Yeni firma ekleme fonksiyonu
  const firmaEkle = async (yeniFirma: Partial<Firma>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      setLoading(true);
      const now = new Date();
      const firmaData = {
        ...yeniFirma,
        created_at: Timestamp.fromDate(now),
        updated_at: Timestamp.fromDate(now),
        deleted_at: null,
        status: yeniFirma.status || 'active'
      };

      const docRef = await addDoc(collection(db, 'firms'), firmaData);
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
        il: yeniFirma.city || yeniFirma.il || '',
        ilce: yeniFirma.district || yeniFirma.ilce || '',
        mahalle: yeniFirma.neighborhood || yeniFirma.mahalle || '',
        sokak: yeniFirma.street || yeniFirma.sokak || '',
        kapiNo: yeniFirma.building_no || yeniFirma.kapiNo || '',
        durum: yeniFirma.status === 'active' ? 'Aktif' : 'Pasif'
      } as Firma;
      
      // localStorage'a ekle
      const mevcutFirmalar = loadFromStorage<Firma[]>(STORAGE_KEYS.firmalar, []);
      const updatedFirmalar = [...mevcutFirmalar, localFirma];
      saveToStorage(STORAGE_KEYS.firmalar, updatedFirmalar);
      
      // State'i güncelle
      setFirmalar(prev => [...prev, localFirma]);
      
      console.log('✅ Firma localStorage\'a kaydedildi, ID:', localId);
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
      if (yeniVeriler.il) updateData.city = yeniVeriler.il;
      if (yeniVeriler.ilce) updateData.district = yeniVeriler.ilce;
      if (yeniVeriler.mahalle) updateData.neighborhood = yeniVeriler.mahalle;
      if (yeniVeriler.sokak) updateData.street = yeniVeriler.sokak;
      if (yeniVeriler.kapiNo) updateData.building_no = yeniVeriler.kapiNo;
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
      const now = new Date();
      const kumbaraData = {
        ...kumbaraVerisi,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        deletedAt: null
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
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
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
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Alanları kopyala
      Object.keys(yeniVeriler).forEach(key => {
        if (yeniVeriler[key as keyof Kumbara] !== undefined) {
          // Tarih alanlarını kontrol et
          const val = yeniVeriler[key as keyof Kumbara];
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
          k.id === kumbaraId ? { ...k, ...yeniVeriler, updatedAt: new Date() } : k
        );
        saveToStorage(STORAGE_KEYS.kumbaralar, updatedKumbaralar);

        // State'i güncelle
        setKumbaralar(prev => prev.map(k => 
          k.id === kumbaraId ? { ...k, ...yeniVeriler, updatedAt: new Date() } : k
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

  return {
    firmalar,
    kumbaralar,
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
    kumbaraSil
  };
}
