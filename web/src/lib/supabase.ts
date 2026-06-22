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

// Veritabanı TypeScript tipleri - migration'daki tablo yapısına göre
export type Database = {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          name: string;
          type: string | null;
          representative_name: string | null;
          representative_phone: string | null;
          alternative_phone: string | null;
          whatsapp: string | null;
          email: string | null;
          address: string | null;
          city: string;
          district: string;
          neighborhood: string;
          street: string | null;
          building_no: string | null;
          latitude: number | null;
          longitude: number | null;
          location: any | null;
          description: string | null;
          status: string;
          tags: string[] | null;
          notes: string | null;
          custom_fields: any | null;
        };
        Insert: any;
        Update: any;
      };
      piggy_banks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          number: string;
          qr_code: string | null;
          barcode: string | null;
          type: string | null;
          placement_date: string;
          last_replacement_date: string | null;
          next_replacement_date: string;
          period_days: number;
          status: string;
          total_collections: number;
          total_donation: number;
          last_donation: number | null;
          notes: string | null;
          custom_fields: any | null;
          firm_id: string | null;
        };
        Insert: any;
        Update: any;
      };
    };
  };
};

// Tip kısaltmaları - migration yapısına uygun
export type Firma = Database['public']['Tables']['firms']['Row'] & {
  // UI'da kullanılan Türkçe alias'lar
  ad?: string;
  tur?: string;
  yetkiliAd?: string;
  yetkiliTelefon?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  sokak?: string;
  kapiNo?: string;
  durum?: string;
};

export type Kumbara = Database['public']['Tables']['piggy_banks']['Row'] & {
  // UI'da kullanılan Türkçe alias'lar
  kumbaraNo?: string;
  kumbaraTipi?: string;
  firmaId?: string | null;
  yerlestirmeTarihi?: string;
  sonDegisimTarihi?: string | null;
  sonrakiDegisimTarihi?: string;
  periyotGun?: number;
  toplamToplamSayisi?: number;
  toplamBagis?: number;
  sonBagisMiktari?: number | null;
  sonBagisTarihi?: string | null;
  durum?: string;
};
