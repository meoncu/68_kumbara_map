# Kumbara Takip Sistemi - Kurulum Kılavuzu

## 🚀 Hızlı Başlangıç

### Adım 1: Supabase Projesi Oluşturun

1. [Supabase Dashboard](https://supabase.com/dashboard) gidin
2. **New Project** butonuna tıklayın
3. Proje detaylarını girin:
   - **Name**: `Kumbara Takip`
   - **Database Password**: Güçlü bir şifre belirleyin (kaydetmeyi unutmayın!)
   - **Region**: Size en yakın bölge (örn: Frankfurt)
4. **Create new project** tıklayın ve hazır olmasını bekleyin

### Adım 2: Veritabanı Migration'larını Çalıştırın

1. Supabase projenizde **SQL Editor** bölümüne gidin
2. **New query** butonuna tıklayın
3. `supabase/migrations/001_initial_schema.sql` dosyasının tüm içeriğini kopyalayıp yapıştırın
4. **Run** butonuna tıklayın

Bu işlem sonucunda tüm tablolar, indeksler ve kısıtlamalar oluşturulacaktır.

### Adım 3: API Anahtarlarını Alın

1. Supabase projesinde **Project Settings** (dişli çark simgesi) -> **API** bölümüne gidin
2. Buradan şu bilgileri kopyalayın:
   - **Project URL** (örnek: `https://abcdefghijklmnopqrst.supabase.co`)
   - **anon public** key (uzun bir metin)

### Adım 4: .env Dosyasını Yapılandırın

`web/.env.local` dosyasını açın ve aşağıdaki şekilde güncelleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Adım 5: Bağımlılıkları Yükleyin

```bash
cd web
npm install
```

### Adım 6: Uygulamayı Çalıştırın

```bash
npm run dev
```

Uygulama artık [http://localhost:3000](http://localhost:3000) adresinde çalışıyor olacak!

## 📱 Mobil Uygulama (İsteğe Bağlı)

Mobil uygulamayı da çalıştırmak isterseniz:

```bash
cd mobile
npm install
npm start
```

Expo Go uygulamasını telefonunuza indirip QR kodu okutarak uygulamayı görüntüleyebilirsiniz.

## 🗄️ Veritabanı Tabloları

Migration sonrası oluşturulan tablolar:

- `firms` - Firma kayıtları
- `piggy_banks` - Kumbara kayıtları
- `teams` - Ekip bilgileri
- `team_members` - Ekip üyeleri
- `tasks` - Görev planları
- `task_items` - Görev kalemleri
- `custom_field_definitions` - Dinamik alan tanımları
- `audit_logs` - Denetim kayıtları

## 🎯 Test Verisi Eklemek (İsteğe Bağlı)

Uygulamayı test etmek için mock verimiz zaten hazır. Eğer gerçek veritabanına test verisi eklemek isterseniz, Supabase **Table Editor** bölümünden manuel olarak ekleme yapabilirsiniz.

## 🆘 Sorun Giderme

### `npm install` çalışmıyorsa:
- Node.js sürümünüzü kontrol edin (en az 18 olmalı)
- `node --version` ve `npm --version` komutlarıyla sürümleri kontrol edin

### Harita görünmüyorsa:
- İnternet bağlantınızı kontrol edin
- MapLibre ve OpenStreetMap CDN'lerine erişim sağlanabildiğinden emin olun

### Supabase bağlantı hatası:
- `.env.local` dosyasındaki URL ve anahtarların doğru olduğundan emin olun
- Supabase projenizin "Active" durumunda olduğunu kontrol edin

## 📚 Daha Fazla Bilgi

- [Next.js Dokümantasyonu](https://nextjs.org/docs)
- [Supabase Dokümantasyonu](https://supabase.com/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)
- [Expo Dokümantasyonu](https://docs.expo.dev/)
