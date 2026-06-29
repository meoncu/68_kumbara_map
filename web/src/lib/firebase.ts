'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase yapılandırması - bu değerleri Firebase Console'dan alacaksınız
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abc123'
};

// Firebase'i başlat
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Hizmetleri başlat
export const db = getFirestore(app);
export const auth = getAuth(app);

// Tip tanımlamaları
export interface Firma {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  name: string;
  type?: string | null;
  representative_name?: string | null;
  representative_phone?: string | null;
  alternative_phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city: string;
  district: string;
  neighborhood: string;
  street?: string | null;
  building_no?: string | null;
  apartment_no?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: any | null;
  description?: string | null;
  status: string; // 'active' | 'inactive'
  tags?: string[] | null;
  notes?: string | null;
  custom_fields?: any | null;
  
  // Türkçe alias'lar (geriye dönük uyumluluk için)
  ad?: string;
  tur?: string;
  yetkiliAd?: string;
  yetkiliTelefon?: string;
  alternatifTelefon?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  sokak?: string;
  kapiNo?: string;
  daireNo?: string;
  aciklama?: string;
  durum?: string;
}

export interface Kumbara {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  number: string;
  qr_code?: string | null;
  barcode?: string | null;
  type?: string | null;
  placement_date: Date;
  last_replacement_date?: Date | null;
  next_replacement_date: Date;
  period_days: number;
  status: string; // 'new' | 'this_month' | 'this_week' | 'overdue' | 'collected' | 'problematic' | 'inactive'
  total_collections: number;
  total_donation: number;
  last_donation?: number | null;
  notes?: string | null;
  custom_fields?: any | null;
  firm_id?: string | null;
  assignment_date?: Date | null;
  archived?: boolean | null;
  
  // Türkçe alias'lar (geriye dönük uyumluluk için)
  kumbaraNo?: string;
  kumbaraTipi?: string;
  firmaId?: string | null;
  yerlestirmeTarihi?: string;
  sonDegisimTarihi?: string | null;
  sonrakiDegisimTarihi?: string;
  periyotGun?: number;
  toplamaPeriyodu?: number;
  toplamToplamSayisi?: number;
  toplamBagis?: number;
  sonBagisMiktari?: number | null;
  sonBagisTarihi?: string | null;
  durum?: string;
  notlar?: string | null;
  atanan_ekip_id?: string | null;
  atananEkipId?: string | null;
  atanmaTarihi?: Date | null;
  arsivlendiMi?: boolean | null;
}

export interface EkipUyesi {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  google_id?: string | null;
}

export interface Ekip {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  ad: string;
  uye_idleri: string[];
}

export interface IslemGecmisi {
  id: string;
  kumbara_id: string;
  kumbara_no: string;
  ekip_id: string;
  ekip_ad: string;
  firma_id: string;
  firma_ad: string;
  tarih: Date;
  created_at: Date;
}

export interface GunlukKumbaraKontrol {
  id: string;
  kumbara_id: string;
  kumbara_no: string;
  ekip_id: string;
  ekip_ad: string;
  firma_id: string;
  firma_ad: string;
  kontrol_tarihi: Date;
  durum: 'degistirildi' | 'gerek_yok' | 'ugranmadi';
  not?: string | null;
  arsivlendi?: boolean; // whether it's part of a finalized archive
  arsiv_id?: string; // id of the archive it's part of
  created_at: Date;
  updated_at: Date;
}

export interface GunlukArsiv {
  id: string;
  ekip_id: string;
  ekip_ad: string;
  arsiv_tarihi: Date;
  gunluk_kontroller: string[]; // array of gunlukKontrol ids
  eksik_kumbara_sayisi: number;
  created_at: Date;
}
