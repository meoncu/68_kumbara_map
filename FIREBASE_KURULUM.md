# 🚀 Firebase Kurulum Kılavuzu

Bu belge, uygulamanın Firebase veritabanına nasıl bağlanacağınızı açıklar.

## 📋 Adım Adım Kurulum

### 1. Firebase Projesi Oluşturun
1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. **Add project** veya **Proje ekle** butonuna tıklayın
3. Proje ismini girin (örnek: `KumbaraTakip`)
4. Gerekirse Google Analytics'i etkinleştirin
5. **Create project** ile projeyi oluşturun

### 2. Firestore Database Etkinleştirin
1. Sol menüden **Build > Firestore Database** seçin
2. **Create database** butonuna tıklayın
3. Security Rules adımında:
   - **Start in test mode** seçin (güvenlik için sonra değiştirin)
   - **Next** → **Enable**
4. Veritabanı konumunu seçin (yakınınızı seçin, örn: `europe-west1` - Avrupa Batı)

### 3. Firebase Web Uygulaması Ekleyin
1. Sol üstteki **Project Overview** yanındaki dişli çark → **Project settings**
2. Aşağı doğru inin, **Your apps** bölümünü bulun
3. **</>** işaretine tıklayın (Add app > Web)
4. Uygulama ismini girin (örnek: `KumbaraWeb`)
5. **Register app** butonuna tıklayın
6. **firebaseConfig** kısmını kopyalayın (görüntüdeki gibi):
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### 4. .env.local Dosyasını Düzenleyin
1. `web/.env.local` dosyasını açın
2. Yukarıdaki `firebaseConfig`'den aldığınız değerleri yazın:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

### 5. Güvenlik Kurallarını Ayarlayın
Firestore Database sayfasına gidin, **Rules** sekmesine tıklayın ve şu kuralları yapıştırın:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
⚠️ **Not**: Bu kurallar geliştirme içindir. Üretimde güvenlik kurallarını sıkılaştırın!

### 6. Uygulamayı Başlatın
```bash
cd web
npm run dev
```

## 📊 Veritabanı Koleksiyonları

Uygulama şu koleksiyonları kullanır:
- `firms`: Firmalar
- `piggy_banks`: Kumbaralar

Koleksiyonlar otomatik olarak oluşturulur, el ile oluşturmanıza gerek yoktur.

## 🔄 Veri Yedekleme

Her zaman:
1. Firebase'den veriler çekilir
2. Başarısız olursa localStorage kullanılır
3. localStorage da yoksa demo verileri kullanılır

Bu sayede uygulama asla durmaz!
