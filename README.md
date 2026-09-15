# 🚀 Senytra Updates

Bu depo, **Senytra** uygulamasının otomatik güncelleme sistemi için kullanılmaktadır.

## Basit yayın akışı

1. `v2.3.0` biçiminde bir release yayımlayın ve
   `Senytra-Setup-v2.3.0-x64.exe` dosyasını ekleyin.
2. `update-stable.json` içinde yalnızca `version` ve `changelog` alanlarını
   düzenleyip kaydedin.
3. GitHub Actions indirme adresini ve SHA-256 değerini release üzerinden bulur;
   `payload` ve `signature` alanlarını otomatik yeniler.

`payload`, `signature`, `download` ve `sha256` alanlarını elle değiştirmeyin.
Actions sayfasındaki yayın işi yeşil olduğunda güncelleme uygulamaya ulaşır.

Burada bulunan dosyalar:

- Stable güncelleme bilgileri
- Sürüm notları
- Kurulum dosyaları (GitHub Releases)

---

## 📦 İçerik

- `update-stable.json` → Kararlı (Stable) sürüm bilgileri
- `CHANGELOG.md` → Sürüm değişiklikleri

---

## 🔄 Güncelleme Sistemi

Senytra uygulaması açıldığında otomatik olarak bu depoyu kontrol eder.

Yeni bir sürüm bulunduğunda kullanıcıya bildirilir ve güncelleme doğrudan uygulama içerisinden indirilebilir.

---

## 🌐 Senytra

Spectra, Windows için geliştirilmiş modern bir sistem optimizasyon ve performans yönetim uygulamasıdır.

Öne çıkan özellikler:

- 🚀 RAM Yönetimi
- 🛠️ Servis Yönetimi
- ⚙️ Başlangıç Uygulamaları
- 🔒 Gizlilik Ayarları
- 💻 Donanım Bilgileri
- ❤️ Sistem Sağlık Merkezi
- 💡 Akıllı Öneriler
- 🔄 Otomatik Güncelleme Sistemi

---

© Senytra Labs
![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-blue) ![Version](https://img.shields.io/badge/version-1.0.0-green) ![License](https://img.shields.io/badge/license-Proprietary-red) ![Electron](https://img.shields.io/badge/Electron-Latest-47848F)
