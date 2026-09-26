# LoL Skin Bulucu

League of Legends skinlerini hızlı ve modern bir arayüz üzerinden keşfetmek, aramak ve detaylarını görüntülemek için geliştirilmiş açık kaynaklı web uygulaması.

## 🌐 Demo

**Canlı Site:**
https://existye4t.github.io/lol-skin-finder/

---

## ✨ Özellikler

* **Anlık skin arama** — Skin adı, şampiyon adı veya Riot Skin ID ile hızlı arama
* **Akıllı arama** — Türkçe karakter ve aksan farklılıklarını göz ardı eder
* **Şampiyon filtreleme** — İstediğin şampiyonları seçerek sonuçları daralt
* **Favoriler** — Beğendiğin skinleri tarayıcı üzerinde favorilerine kaydet
* **Chroma desteği** — Skinlerin mevcut chroma seçeneklerini görüntüle
* **Skin detayları** — Skin görselleri, şampiyon bilgisi ve Riot Skin ID bilgilerini görüntüle
* **Fantome desteği** — Mevcut `.fantome` dosyalarını doğrudan indirme
* **Hızlı arama paleti** — `Ctrl + K` / `Cmd + K` ile klavye üzerinden skin ara
* **Türkçe / İngilizce** — Arayüz dili ve skin/şampiyon isimleri arasında geçiş yap
* **Tema seçenekleri** — Siyah-beyaz, Hextech Altın ve Arcane Neon görünümleri
* **Responsive tasarım** — Masaüstü ve farklı ekran boyutlarına uyumlu arayüz
* **Erişilebilirlik desteği** — Klavye kullanımı, ARIA etiketleri ve reduced-motion desteği
* **Önbelleksiz güncel veri yükleme** — Skin verileri uygulama tarafından güncellenebilir

---

## 🧩 Veri Kaynağı

Skin verileri Riot Games'in resmi **Data Dragon** yayınlarından oluşturulur.

`npm run update-data` komutu güncel sürümü tespit eder, şampiyonların skin bilgilerini indirir ve uygulamanın hızlı arama yapabilmesi için `public/data/skins.json` dosyasını oluşturur.

Riot Skin ID sistemi, şampiyon anahtarı ve üç haneli skin numarasının birleştirilmesiyle oluşturulur.

Örneğin:

```text
Twitch = 29
Omega Squad = 004

Riot Skin ID = 29004
```

---

## 🖥️ Teknolojiler

* HTML
* CSS
* JavaScript
* Vite
* Paper Design Shaders
* Playwright

Proje framework ağırlıklı bir yapı yerine vanilla JavaScript/CSS tabanlı hafif bir frontend mimarisi kullanır. Vite geliştirme ve production build sürecini yönetir.

---

## 📦 Proje Yapısı

```text
lol-skin-finder/
├── public/
│   ├── data/
│   ├── fantome/
│   └── images/
├── src/
│   ├── main.js
│   └── style.css
├── scripts/
│   ├── update-skins.mjs
│   └── prepare-fantome.mjs
├── admin/
├── backend/
├── bot/
├── assets/
├── index.html
├── package.json
└── README.md
```

---

## 🔄 Veri Güncelleme

Yeni League of Legends skinleri yayınlandığında veri dosyasını yeniden oluşturmak için:

```bash
npm run update-data
```

komutunu çalıştırman yeterlidir.

Bu işlem Riot Data Dragon üzerinden güncel skin verilerini alarak uygulamanın kullandığı `skins.json` dosyasını yeniler.

---

## 📥 Fantome Dosyaları

Uygulama desteklenen skinler için `.fantome` dosyalarını da gösterebilir.

```bash
npm run prepare-fantome
```

komutu, belirtilen skin arşivindeki Fantome dosyalarını uygulamanın kullandığı yapıya hazırlar.

Bir skin için ilgili Fantome dosyası mevcutsa detay ekranındaki indirme seçeneği aktif hale gelir.

---

## ⌨️ Klavye Kısayolları

| Kısayol    | İşlev                                 |
| ---------- | ------------------------------------- |
| `Ctrl + K` | Hızlı skin aramasını aç               |
| `Cmd + K`  | macOS'ta hızlı aramayı aç             |
| `Esc`      | Açık pencereyi / arama paletini kapat |

Hızlı arama paleti mevcut arama algoritmasını kullanarak sonuçları puanlar ve klavye üzerinden skin seçimine izin verir.

---

## 🎨 Görünüm

Uygulama içerisinde üç farklı görünüm bulunur:

* **Siyah-Beyaz**
* **Hextech Altın**
* **Arcane Neon**

Seçilen görünüm tarayıcıda saklanır ve sonraki ziyaretlerde korunur.

---

## 🌍 Dil Desteği

Arayüz şu anda:

* 🇹🇷 Türkçe
* 🇺🇸 İngilizce

dillerini destekler.

Skin ve şampiyon isimleri de seçilen dile göre yerelleştirilebilir.

---

## 🔒 Gizlilik

Uygulamanın temel skin arama ve görüntüleme işlevleri kullanıcı hesabı gerektirmez.

Projenin mevcut sürümünde Google Analytics etkinleştirildiğinde toplu ziyaret, arama ve indirme istatistikleri ölçülebilir; kişisel kullanıcı hesabı veya isim bilgisi tutulmadığı belirtilmektedir.

---

## ⚖️ Yasal Uyarı

League of Legends ve ilgili tüm oyun, şampiyon, skin ve görsel varlıklar Riot Games, Inc. ve ilgili hak sahiplerinin mülkiyetindedir.

Bu proje Riot Games tarafından geliştirilmemiş veya resmi olarak desteklenmemiş bağımsız bir topluluk projesidir.

---

## 🤝 Katkıda Bulunma

Hata bildirmek, özellik önermek veya projeye katkıda bulunmak için GitHub üzerinden **Issue** veya **Pull Request** açabilirsin.

---

## 💬 Discord

Proje hakkında güncellemeler, hata bildirimleri ve topluluk desteği için Discord sunucusuna katılabilirsin.

**Discord:**
https://discord.com/rvRxbf8B9N

---

## 📄 Lisans

Bu proje açık kaynak olarak geliştirilmektedir.

---

<p align="center">
  <strong>Exist LOL Skin Finder</strong><br>
  League of Legends skinlerini keşfetmenin daha hızlı yolu.
</p>
