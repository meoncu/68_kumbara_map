'use client';

import { createClient } from '@supabase/supabase-js';

// Supabase ortam değişkenleri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';

// Supabase client'ını oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Veritabanı TypeScript tipleri - PROJE_DOKUMANI.md'ye göre
export type Database = {
  public: {
    Tables: {
      firmalar: {
        Row: {
          id: number;
          ad: string;
          tur: string;
          yetkiliAd: string;
          yetkiliTelefon: string;
          alternatifTelefon: string | null;
          whatsapp: string | null;
          eposta: string | null;
          adres: string;
          il: string;
          ilce: string;
          mahalle: string;
          sokak: string;
          kapiNo: string;
          latitude: number | null;
          longitude: number | null;
          aciklama: string | null;
          durum: string;
          etiketler: string | null;
          ozelAlanlar: string | null;
        };
        Insert: any;
        Update: any;
      };
      kumbaralar: {
        Row: {
          kumbaraNo: string;
          firmaId: number | null;
          qrKod: string | null;
          barkod: string | null;
          kumbaraTipi: string;
          yerlestirmeTarihi: number | null;
          sonDegisimTarihi: number | null;
          sonrakiDegisimTarihi: number | null;
          periyotGun: number;
          durum: string;
          toplamToplamSayisi: number | null;
          toplamBagis: number | null;
          sonBagisMiktari: number | null;
          sonBagisTarihi: number | null;
          notlar: string | null;
        };
        Insert: any;
        Update: any;
      };
      ekipler: {
        Row: {
          id: number;
          isim: string;
          renk: string;
          aracBilgisi: string | null;
          durum: string;
          uyeler: string | null;
        };
        Insert: any;
        Update: any;
      };
      gorevler: {
        Row: {
          id: number;
          ekipId: number | null;
          tarih: number | null;
          durum: string;
          rotaIdleri: string | null;
          aciklama: string | null;
        };
        Insert: any;
        Update: any;
      };
      islem_gecmisi: {
        Row: {
          id: number;
          firmaId: number | null;
          firmaAd: string | null;
          kumbaraNo: string | null;
          tarih: number | null;
          ekipIsim: string | null;
          islemTuru: string | null;
          toplananMiktar: number | null;
          eskiKumbaraNo: string | null;
          yeniKumbaraNo: string | null;
          fotoPath: string | null;
          imzaPath: string | null;
          notlar: string | null;
        };
        Insert: any;
        Update: any;
      };
    };
  };
};

// Tip kısaltmaları
export type Firma = Database['public']['Tables']['firmalar']['Row'];
export type Kumbara = Database['public']['Tables']['kumbaralar']['Row'];
export type Ekip = Database['public']['Tables']['ekipler']['Row'];
export type Gorev = Database['public']['Tables']['gorevler']['Row'];
export type IslemGecmisi = Database['public']['Tables']['islem_gecmisi']['Row'];
