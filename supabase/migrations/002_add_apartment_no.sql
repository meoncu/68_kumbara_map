-- Migration: firms tablosuna apartment_no (daire no) kolonu ekle
-- Tarih: 2026-06-25

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS apartment_no TEXT;

-- Kolon açıklaması
COMMENT ON COLUMN public.firms.apartment_no IS 'Daire numarası (opsiyonel)';

-- updated_at trigger'ı zaten var, bu kolonu da kapsayacak
