# Kumbara Takip ve Saha Operasyon Yönetim Sistemi

Türkiye'de faaliyet gösteren dernek/vakıflar için geliştirilmiş kapsamlı kumbara takip ve saha operasyon yönetim sistemi.

## Teknoloji Yığını

### Web Uygulaması
- **Next.js 14** - React framework'ü
- **TypeScript** - Tip güvenliği
- **TailwindCSS** - Stiller
- **MapLibre GL JS** - Açık kaynak harita kütüphanesi
- **OpenStreetMap** - Harita verileri
- **Nominatim** - Adres arama/geocoding
- **OSRM** - Rota optimizasyonu

### Mobil Uygulaması
- **React Native** - Cross-platform mobil geliştirme
- **Expo** - Geliştirme platformu
- **TypeScript** - Tip güvenliği

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Veritabanı
- **PostGIS** - Mekansal veritabanı eklentisi
- **Supabase Auth** - Kimlik doğrulama
- **Supabase Storage** - Dosya depolama
- **Row Level Security (RLS)** - Veri güvenliği

## Proje Yapısı

```
.
├── web/                      # Next.js web uygulaması
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # React bileşenleri
│   │   │   ├── layout/     # Düzen bileşenleri
│   │   │   └── map/        # Harita bileşenleri
│   │   ├── hooks/          # Özel hook'lar
│   │   ├── lib/            # Yardımcı fonksiyonlar
│   │   └── types/          # TypeScript tipleri
│   └── package.json
├── mobile/                  # React Native mobil uygulama
│   └── package.json
├── supabase/                # Supabase konfigürasyonu
│   └── migrations/         # Veritabanı migration'ları
└── README.md
```

## Kurulum

### Web Uygulaması

```bash
cd web
npm install
npm run dev
```

### Supabase Kurulumu

1. [Supabase](https://supabase.com) üzerinde yeni bir proje oluşturun
2. `supabase/migrations/001_initial_schema.sql` dosyasını SQL Editor'de çalıştırın
3. `.env.example` dosyasını `.env` olarak kopyalayıp Supabase URL ve anon key'i girin

## Özellikler

### Harita Özellikleri
- ✅ MapLibre GL JS ile OpenStreetMap entegrasyonu
- ✅ Marker kümeleme (clustering)
- ✅ Katman yönetimi (aç/kapa)
- ✅ Isı haritası
- ✅ Kumbara durumuna göre renklendirme
  - Mavi: Yeni yerleştirildi
  - Sarı: Bu ay değişecek
  - Turuncu: Bu hafta değişecek
  - Kırmızı: Gecikmiş
  - Yeşil: Toplandı
  - Mor: Sorunlu
  - Gri: Pasif
- ✅ Firma üzerine gelince detay kartı
- ✅ Firma tıklanınca detay paneli

### Firma Yönetimi
- ✅ Firma kayıtları (adres, iletişim, konum)
- ✅ Türkiye adres desteği (il, ilçe, mahalle, sokak, kapı no)
- ✅ Dinamik alanlar (custom fields)
- ✅ Soft delete desteği

### Kumbara Yönetimi
- ✅ Kumbara takibi (numara, QR, barkod)
- ✅ Periyodik değiştirme takibi
- ✅ Bağış toplama istatistikleri
- ✅ Durum yönetimi

### Ekip ve Görev Yönetimi
- ✅ Ekip oluşturma
- ✅ Ekip üyeleri yönetimi
- ✅ Günlük görev planlama
- ✅ Rota optimizasyonu (OSRM)

### Mobil Uygulama
- ✅ Görev listesi görüntüleme
- ✅ Firma detayları
- ✅ Harita entegrasyonu
- ✅ Kumbara değiştirme işlemi
- ✅ Fotoğraf yükleme
- ✅ İmza alma
- ✅ Offline çalışma desteği

### Raporlama
- ✅ Genel istatistikler
- ✅ İl/ilçe bazlı dağılım
- ✅ Ekip performansı
- ✅ Bağış grafikleri

## Veritabanı Şeması

### Tablolar

1. **firms** - Firma kayıtları
2. **piggy_banks** - Kumbara kayıtları
3. **teams** - Ekip kayıtları
4. **team_members** - Ekip üyeleri
5. **tasks** - Görev planları
6. **task_items** - Görev kalemleri
7. **custom_field_definitions** - Dinamik alan tanımları
8. **audit_logs** - Denetim kayıtları

### PostGIS Desteği
- Mekansal indeksler
- Coğrafi sorgular
- Konum bazlı filtreleme

## Geliştirme

### Web Uygulamasını Çalıştırma

```bash
cd web
npm run dev
```

### Migration'ları Çalıştırma

Supabase SQL Editor üzerinde migration dosyalarını sırayla çalıştırın.

## Lisans

MIT
