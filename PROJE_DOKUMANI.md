# Kumbara Takip ve Saha Yönetimi Sistemi - Proje Dokümantasyonu

Bu doküman, **Kumbara Takip ve Saha Yönetimi Sistemi**'nin mimarisini, veri yapısını (şemasını), mobil ve web bileşenleri arasındaki entegrasyonu ve projenin diğer AI Agent'lara aktarılması için gerekli tüm teknik ve yapısal detayları içermektedir.

---

## 1. Proje Genel Bakışı

Sistem; hayır kurumları, belediyeler veya sivil toplum kuruluşlarının belirli bağış noktalarına yerleştirdiği **kumbaraların (para kutularının)** durumunu takip etmek, konumlarını haritalamak, mobil saha ekiplerine **rotasyonel görevler** atamak ve toplanan paraları anlık olarak raporlamak amacıyla geliştirilmiş hibrit bir platformdur.

Sistem iki temel parçadan oluşmaktadır:
1. **Android Mobil Uygulaması (Jetpack Compose / Room DB / Retrofit):** Saha personelinin internet olmasa dahi veri girmesini sağlayan (offline-first), barkod tarayan, imza/fotoğraf alan ve çevrimiçi olduğunda Supabase veritabanıyla senkronize olan mobil istemcidir.
2. **Web Yönetim Paneli (`web_dashboard.html` / Tailwind CSS / Supabase JS SDK):** Dağıtımı Vercel/GitHub Pages üzerinde yapılan, yöneticilerin noktaları, kumbaraları, ekipleri ve rotaları yönetmesini, detaylı işlem geçmişini denetlemesini ve Excel/CSV üzerinden binlerce veriyi toplu yüklemesini (Bulk Import) sağlayan yönetim merkezidir.

---

## 2. Sistem Mimarisi ve Teknoloji Dağılımı

### A. Web Arayüzü (Admin Dashboard)
- **Dosya Konumu:** `/web_dashboard.html` (Ana yönlendirici: `/index.html`)
- **Tasarım:** Sürdürülebilir UX/UI için **Tailwind CSS**, **FontAwesome** simge kütüphanesi ve **Inter** sans-serif fontu kullanılmıştır.
- **Veritabanı Entegrasyonu:** Supabase JS v2 SDK'sı doğrudan istemci tarafında (`window.supabase`) çalışır. CORS ve karma içerik (Mixed Content) sorunlarını önlemek amacıyla arka plan API bağlantı adresi SSL destekli olarak güncellenmiştir (`https://supabase.ankebut.com.tr`).
- **Öve Çıkan Özellikler:**
  - **Toplu Veri Yükleme (CSV Importer):** Excel'den alınan CSV dosyalarındaki verileri hedef tablolara göre eşleyip Supabase'e tek seferde (bulk insert) yükleme yeteneği.
  - **SQL Kurulma Sihirbazı:** Tablo şemalarını Supabase üzerinde tek tıkla kurmayı sağlayan SQL betiği kopyalayıcı.

### B. Mobil Uygulama (Android Client)
- **Dizin:** `/app`
- **Dil & Altyapı:** Kotlin, Jetpack Compose, Coroutines & Flow.
- **Yerel Veritabanı:** **Room Database** (Hücre bazlı önbellekleme ve offline çalışabilirlik için).
- **Uzaktan Senkronizasyon (Supabase REST API):** HTTP istekleri aracılığıyla doğrudan veritabanı tablolarına POST, GET ve PATCH istekleri atmak üzere Retrofit arayüzü (`SupabaseApi.kt`) ve senkronizasyon yöneticisi (`SupabaseSyncManager.kt`) tanımlıdır.

---

## 3. Veritabanı Şeması ve Tablo Yapıları

Veritabanı, PostgREST ve Room yapılarına tam uyumlu olacak şekilde 5 temel tablodan oluşur. Tablolar arası senkronizasyon için sütun isimleri ve veri türleri Android Room Entity sınıfları (`Entities.kt`) ile Supabase şeması arasında birebir eşleşmektedir.

### A. `firmalar` Tablosu (Saha Bağış Noktaları)
Kumbaraların fiziki olarak dağıtıldığı mağazalar, marketler, ibadethaneler, ofisler vb. noktaları temsil eder.

| Sütun (Column) | Değer Türü (Type) | Açıklama |
| :--- | :--- | :--- |
| `id` | `INTEGER` (PK, Identity) | Benzersiz nokta ID'si |
| `ad` | `TEXT` (NOT NULL) | Mağaza, dernek veya kurum adı |
| `tur` | `TEXT` (NOT NULL) | Sektörel türü (`Market`, `Kafe`, `Eczane`, `Cami`, `Ofis`) |
| `yetkiliAd` | `TEXT` (NOT NULL) | Temas kurulacak yetkili ismi |
| `yetkiliTelefon` | `TEXT` (NOT NULL) | İrtibat numarası |
| `alternatifTelefon` | `TEXT` | İkinci yedek telefon |
| `whatsapp` | `TEXT` | Whatsapp hattı numarası |
| `eposta` | `TEXT` | E-posta adresi |
| `adres` | `TEXT` (NOT NULL) | Detaylı açık adres açıklaması |
| `il` | `TEXT` (Default: 'Türkiye') | İl adı |
| `ilce` | `TEXT` (NOT NULL) | Hizmet bölgesi / İlçe |
| `mahalle` | `TEXT` (NOT NULL) | Mahalle |
| `sokak` | `TEXT` (NOT NULL) | Sokak ve Cadde |
| `kapiNo` | `TEXT` (NOT NULL) | Bina / Kapı numarası |
| `latitude` | `DOUBLE PRECISION` | Harita gösterimi için enlem |
| `longitude` | `DOUBLE PRECISION` | Harita gösterimi için boylam |
| `aciklama` | `TEXT` | Noktaya ait özel notlar |
| `durum` | `TEXT` (Default: 'Aktif') | Noktanın durumu (`Aktif`, `Pasif`) |
| `etiketler` | `TEXT` | Virgüllü etiketler (`Merkez`, `YüksekHasılat` vb.) |
| `ozelAlanlar` | `TEXT` | JSON formatında dinamik ek alanlar |

---

### B. `kumbaralar` Tablosu
Firmalara (noktalara) yerleştirilmiş olan her bir fiziksel bağış kutusunu temsil eder.

| Sütun (Column) | Değer Türü (Type) | Açıklama |
| :--- | :--- | :--- |
| `kumbaraNo` | `TEXT` (PK) | Kumbaranın üzerindeki benzersiz plaka/id (Örn: `KMB104`) |
| `firmaId` | `INTEGER` (FK -> `firmalar.id`) | Yerleştirildiği noktanın ID'si |
| `qrKod` | `TEXT` | Tanımlı karekod metni |
| `barkod` | `TEXT` | Tanımlı barkod numarası |
| `kumbaraTipi` | `TEXT` (NOT NULL) | Kasa tipi (`Büyük Şeffaf Plastik`, `Küçük Metal` vb.) |
| `yerlestirmeTarihi` | `BIGINT` | Yerleştirilme epoch zaman damgası (ms) |
| `sonDegisimTarihi` | `BIGINT` | En son boşaltılma/değişim zamanı |
| `sonrakiDegisimTarihi` | `BIGINT` | Değişimin beklendiği bir sonraki zaman damgası |
| `periyotGun` | `INTEGER` (Default: 90) | Değişim sıklığı döngüsü (gün sayısı) |
| `durum` | `TEXT` (Default: 'Yeni') | Renk kodlu durum (`Yeni`, `Sarı`, `Turuncu`, `Kırmızı`, `Yeşil`, `Mor`, `Gri`) |
| `toplamToplamSayisi` | `INTEGER` | Kumbaranın kaç kez boşaltılıp geri yerleştirildiği |
| `toplamBagis` | `DOUBLE PRECISION` | Biriken ve toplanan toplam bağış miktarı |
| `sonBagisMiktari` | `DOUBLE PRECISION` | Son işlemsel teslimatta çıkan nakit |
| `sonBagisTarihi` | `BIGINT` | Son bağış toplama zaman damgası |
| `notlar` | `TEXT` | İnceleme veya kutuya ait fiziki notlar |

---

### C. `ekipler` Tablosu (Saha Operasyon Ekipleri)
Araçla veya yaya sahada aktif görev alan personelleri gruplar.

| Sütun (Column) | Değer Türü (Type) | Açıklama |
| :--- | :--- | :--- |
| `id` | `INTEGER` (PK, Identity) | Ekip kimlik ID'si |
| `isim` | `TEXT` (NOT NULL) | Ekibin tanımlayıcı adı (Örn: `Çankaya Mobil Ekip 1`) |
| `renk` | `TEXT` (Default: '#3B82F6') | Harita rotalarında ekibi temsil eden Hex renk kodu |
| `aracBilgisi` | `TEXT` | Kullanılan araç marka/model/plakası |
| `durum` | `TEXT` (Default: 'Aktif') | Personelin veya ekibin kullanılabilirlik durumu |
| `uyeler` | `TEXT` | Ekipteki kişilerin isim listesi (Virgülle ayrılmış) |

---

### D. `gorevler` Tablosu (Rota ve Ziyaret Görevleri)
Ekiplerin gün içinde ziyaret edeceği noktaların rota sırasını belirleyen planlardır.

| Sütun (Column) | Değer Türü (Type) | Açıklama |
| :--- | :--- | :--- |
| `id` | `INTEGER` (PK, Identity) | Görev ID |
| `ekipId` | `INTEGER` (FK -> `ekipler.id`) | Atanan sorumlu ekip |
| `tarih` | `BIGINT` | Görevin gerçekleştirileceği günün epoch tarihi |
| `durum` | `TEXT` (Default: 'Bekliyor') | Görev aşaması (`Bekliyor`, `Görevde`, `Tamamlandı`, `İptal`) |
| `rotaIdleri` | `TEXT` | Ziyaret sırasına göre ayrılmış firma ID dizge listesi (Örn: `12,4,45,15`) |
| `aciklama` | `TEXT` | Göreve dair özel sevk talimatı veya not |

---

### E. `islem_gecmisi` Tablosu (Mobil Saha Teslimat ve İşlem Logları)
Ekiplerin sahada gerçekleştirdiği her bir fiziksel işlemin geri bildirim fişidir.

| Sütun (Column) | Değer Türü (Type) | Açıklama |
| :--- | :--- | :--- |
| `id` | `INTEGER` (PK, Identity) | İşlem ID'si |
| `firmaId` | `INTEGER` (FK -> `firmalar.id`) | İşlemin yapıldığı nokta |
| `firmaAd` | `TEXT` | İleriki sorgularda kolaylık için yedeklenen nokta adı |
| `kumbaraNo` | `TEXT` | İşlem gören kumbaranın numarası |
| `tarih` | `BIGINT` | İşlem zamanı zaman damgası |
| `ekipIsim` | `TEXT` | Teslim alan ekip personeli adı |
| `islemTuru` | `TEXT` | Yapılan işlemin niteliği (`Para Toplama`, `Kumbara Değişimi`, `Sorun Bildirimi`) |
| `toplananMiktar` | `DOUBLE PRECISION` | Kumbaradan çıkan ve makbuza işlenen nakit para miktarı |
| `eskiKumbaraNo` | `TEXT` | Değişim yapıldıysa çıkartılan eski kumbaranın plakası |
| `yeniKumbaraNo` | `TEXT` | Değişim yapıldıysa sökülenin yerine takılan yeni kumbara |
| `fotoPath` | `TEXT` | Teslimat belgesi, kumbara durumu veya makbuz fotoğraf yolu |
| `imzaPath` | `TEXT` | Mağaza yetkilisinin dijital teslimat imza görseli yolu |
| `notlar` | `TEXT` | Saha personelinin düştüğü operasyonel detaylar |

---

## 4. Senkronizasyon (Sync) Akış Şeması

Projedeki mobil uygulama ve web arayüzü Supabase üzerinden merkezi olarak konuşur. Mobil istemcideki senkronizasyon yapısının işleyişi şöyledir:

```
[Mobil Saha Çalışanı] (Çevrimdışı / Offline)
        │
        ▼  (Anlık veritabanı okuma/yazma)
 ┌──────────────┐
 │   Room DB    │  ◄── [Mobil Görevleri Tamamlama, İmza Alma, Log Yazma]
 └──────────────┘
        │
        ▼  (İnternet Bağlantısı Yakalandığında)
 ┌────────────────────────┐
 │ SupabaseSyncManager    │ ── (Birikmiş Logları POST ile gönderir)
 └────────────────────────┘
        │
        ├────────────────────────┐
        ▼                        ▼
 ┌──────────────┐         ┌──────────────┐
 │ Supabase DB  │ ◄────── │ Web Admin    │ [Yönetici Yeni Rota Atar,
 │  (Cloud)     │         │ Dashboard    │  Noktaları Günceller]
 └──────────────┘         └──────────────┘
```

---

## 5. Gelecek Geliştiriciler / AI Agent'lar İçin Önemli Notlar

Projeyi devralacak veya üzerinde ek geliştirme yapacak diğer geliştiriciler ve AI Agent'lar için kritik yönergeler şunlardır:

1. **Bağlantı Protokolü Güvenliği:** Web arayüzlerinde tarayıcılar, HTTP üzerindeki istekleri karma içerik engeline (Mixed Content) takmaktadır. Vercel veya GitHub Pages üzerinde çalışan Web arayüzünün api çağrıları yapabilmesi için Supabase URL'inin mutlaka güvenli protokol olan **`https://`** (`https://supabase.ankebut.com.tr`) ile başladığından emin olunmalıdır.
2. **Room Veri Dönüştürücüleri:** SQLite üzerinde SQLite'ın yerel olarak desteklemediği türler (Tarih verileri - `Long`, listeler vb.) Room'daki özel `TypeConverter` sınıfları sayesinde saklanmaktadır. `Entities.kt` dosyasını düzenlerken veri uyuşmazlığı oluşturmamaya dikkat edilmelidir.
3. **Senkronizasyon Sıralaması:** Senkronizasyonda veri bütünlüğünü bozmamak amacıyla önce `firmalar` oluşturulmalı, ardından onlara bağlı `kumbaralar` veya `islem_gecmisi` kayıtları işleme alınmalıdır. Yabancı anahtar (FK) kısıtlamaları aksi takdirde veriyi reddedecektir.
4. **Platform Uyumluluğu:** Android tarafında `.env` / `BuildConfig` sistemi kullanılırken, web tarafında `web_dashboard.html` içerisindeki gizlenebilir kimlik bilgileri kartı (`Supabase Sunucu ve API Anahtarı Ayarları`) kullanılmaktadır.
