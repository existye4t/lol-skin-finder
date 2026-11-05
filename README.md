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

## 🧩 Veri Kaynağı ve Koleksiyonlar (16.22+)

Skin verileri ve `.fantome` paket bağlantıları iki ana kaynaktan senkronize edilir:

1. **Riot Games Data Dragon & CommunityDragon** — Canlı sunucu ve PBE skin/chroma meta verileri, Türkçe ve İngilizce yerelleştirmeler.
2. **[Yimikami/LeagueSkins-Experimental](https://github.com/Yimikami/LeagueSkins-Experimental)** — `.fantome` paketlerinin tamamı doğrudan bu kaynak repodan indirilir (bu repoya yeni `.fantome` ikili dosyaları kopyalanmaz).

### Koleksiyonlar
* **Skinler (`skins/` + `PBE/`)** — Canlı sunucudaki tüm şampiyon skinleri, chromalar, form/varyant paketleri ve `PBE` etiketli önizleme skinleri aynı sekmede listelenir. Bir PBE skini canlı sunucuya çıktığında `PBE` rozeti otomatik olarak kalkar.
* **Rainbow (`rainbow/`)** — Oyun içinde `Ctrl + 5` kısayoluyla chroma değiştirmeyi sağlayan Rainbow paketleri (yalnızca Rainbow sekmesinde aranır; ayrıca desteklenen skinlerin detay penceresinde `Rainbow sürümü →` bağlantısıyla erişilir).
* **Classic (`classic/`)** — League Classic modu için hazırlanmış özel şampiyon skin ve chroma paketleri (yalnızca Classic sekmesinde aranır).

> **Önemli Uyarılar:**
> * Kaynak repodaki paketler otomatik olarak üretilmektedir ve tek tek test edilmemiştir; bazı skinlerde veya formlarda oyun içi görsel/ses sorunları yaşanabilir.
> * **PBE** etiketli içerikler önizleme sürümüdür; canlı sunucuya çıkmadan önce değişebilir veya kararsız çalışabilir.
> * Kaynak paket altyapısı ve araçları için [Yimikami/LeagueSkins-Experimental](https://github.com/Yimikami/LeagueSkins-Experimental), [bettie9/Sunshine](https://github.com/bettie9/Sunshine) ve [CommunityDragon](https://www.communitydragon.org/) projelerine teşekkürler.

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

## 🔄 Veri Güncelleme ve Manifest Sistemi

Yeni `.fantome` dosyaları repoya kopyalanmaz. Bunun yerine `scripts/prepare-fantome.mjs` GitHub Git Trees API üzerinden kaynak repoyu klonlamadan tarayarak `public/data/fantome-manifest.json` dosyasını üretir. Eski yerel `public/fantome/*.fantome` dosyaları silinmez (ENABLE_LEGACY_FANTOME bayrağı yalnızca manifest üretiminde kaynakta olmayan sahipsiz girdileri kontrol eder).

Tüm veri ve manifest dosyalarını tek adımda senkronize etmek ve doğrulamak için:

```bash
npm run sync-data
```

Komutları ayrı ayrı çalıştırmak için:

```bash
# 1. Kaynak repodan Git Trees API + indekslerle fantome-manifest.json üret
npm run prepare-fantome

# 2. Data Dragon + CommunityDragon + manifest ile skins.json, rainbow.json, classic.json üret
npm run update-data

# 3. Şema, Trees API varlık kontrolü, URL encode ve örneklem HEAD doğrulaması
npm run check-links
```

> **GitHub Actions Ayarı Gereksinimi:** `.github/workflows/sync-skins.yml` iş akışının büyük değişikliklerde veya yama geçişlerinde otomatik Pull Request açabilmesi için depo ayarlarında **Settings → Actions → General → Workflow permissions** altında **"Allow GitHub Actions to create and approve pull requests"** seçeneği işaretlenmelidir. `workflow_dispatch` üzerinden `dry_run: true` seçildiğinde ise repo üzerinde hiçbir commit/PR oluşturulmaz, yalnızca özet loglanır.

---

## 🛑 Geri Alma (Rollback) Prosedürü

Herhangi bir beklenmeyen durumda sistemi hızla önceki kararlı duruma döndürmek için:

1. **Merge'i Geri Alma (Gerçek Rollback):**
   Frontend ve manifest sistemini tek adımda eski yerel `public/fantome/*.fantome` yapısına döndürmenin kesin ve doğrudan yolu merge commit'ini geri almaktır (yerel fantome arşivi depoda eksiksiz korunmaktadır):
   ```bash
   git revert -m 1 <merge-commit-hash>
   git push origin main
   ```

2. **Otomatik Senkronizasyonu Durdurma:**
   GitHub arayüzünden **Actions → Kaynak Repodan Skin Senkronizasyonu → ... → Disable workflow** seçeneğine tıklayarak zamanlanmış otomatik senkronizasyonu durdurabilirsiniz.

3. **Manifest Üretimi Legacy Bayrağı:**
   `scripts/config.mjs` içerisindeki `ENABLE_LEGACY_FANTOME` bayrağı yalnızca manifest üretim scriptini (`prepare-fantome.mjs`) etkiler; kaynak repoda karşılığı bulunmayan eski yerel dosya girdilerinin manifest'te `enabled` işaretlenmesini belirler. Frontend çalışma zamanında eski yerel servise anında dönüş sağlamaz.

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
