# LoL Skin Bulucu

League of Legends skinlerini isim, şampiyon veya Riot skin ID'si ile aratan modern web uygulaması.

## Veri yaklaşımı

Uygulama skin listesini Riot Games'in resmi **Data Dragon** yayınından üretir. `npm run update-data` komutu güncel sürümü tespit eder, her şampiyonun skin bilgisini indirir ve tarayıcının hızlı araması için `public/data/skins.json` dosyasını oluşturur.

Riot skin ID'si, şampiyon anahtarı ve üç haneli skin numarasının birleşimidir. Örneğin Twitch anahtarı `29`, Omega Squad skin numarası `4` olduğundan sonuç `29004` olur.

## Çalıştırma

Node.js 18+ yüklüyken:

```powershell
npm run update-data
npm run prepare-fantome
npm run dev
```

Tarayıcıda terminalin gösterdiği yerel adresi açın. Veri dosyasını daha sonra güncellemek için yalnızca `npm run update-data` çalıştırmanız yeterlidir.

`npm run prepare-fantome`, `C:\Users\Exist\Documents\LOL Skins` içindeki `.fantome` dosyalarını uygulamaya bağlar. Kart detayındaki indirme düğmesi yalnızca ilgili ID'nin dosyası bulunduğunda aktif olur.

## Notlar

- Arama Türkçe karakter ve aksan farklarını yok sayar.
- Veri kaynağı resmi Riot Data Dragon'dur; içerik Riot Games'e aittir.
- Uygulama herhangi bir kullanıcı verisi toplamaz veya sunucuya göndermez.

## GitHub Pages ile yayınlama

1. GitHub'da yeni bir **public** depo oluşturun ve bu klasördeki dosyaları `main` dalına yükleyin.
2. Depoda **Settings → Pages → Build and deployment → Source** alanından **GitHub Actions** seçin.
3. Gönderilen `.github/workflows/deploy-pages.yml` dosyası her `main` güncellemesinde siteyi derler ve yayınlar.

Site adresi `https://KULLANICI_ADI.github.io/DEPO_ADI/` biçiminde olur. GitHub Pages, yayınlanan site için 1 GB önerilen/üst sınır ve aylık 100 GB yumuşak bant genişliği sınırı belirtir; bu proje ve indirme trafiği büyürse ayrı bir dosya depolama hizmeti gerekebilir.
