import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'test-results', 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function run() {
  console.log('🚀 UI DÜZELTMELERİ DOĞRULAMA VE EKRAN GÖRÜNTÜSÜ ALMA');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text().toLowerCase();
      if (!txt.includes('frame-ancestors')) {
        console.log('  PAGE ERROR:', msg.text());
      }
    }
  });

  await page.goto('http://127.0.0.1:4173');
  // Verilerin yüklenmesini bekle
  await page.waitForFunction(() => document.getElementById('meta')?.textContent?.includes('16.22'));
  console.log('✓ Sayfa ve veriler başarıyla yüklendi.');

  // TEST 1: Arama İzolasyonu (Skins sekmesinde 60001022 veya Cafe Cuties)
  console.log('\n[Test 1] Arama izolasyonu kontrol ediliyor...');
  await page.locator('#search').fill('60001022');
  await page.waitForTimeout(600);
  const countInSkins = await page.locator('#results .skin-card').count();
  console.log(`  Skins sekmesinde Classic ID 60001022 arama sonucu sayısı: ${countInSkins} (Beklenen: 0)`);
  if (countInSkins !== 0) throw new Error('Arama izolasyonu başarısız: Classic ID Skins sekmesinde bulundu!');
  console.log('✓ Skins sekmesinde Classic girdileri asla çıkmıyor.');

  // TEST 2: Örnek Çipler Sekmeye Göre Değişiyor mu?
  console.log('\n[Test 2] Örnek çipler kontrol ediliyor...');
  await page.locator('#search').fill('');
  await page.waitForTimeout(400);
  let exampleChips = await page.locator('#search-examples button').allTextContents();
  console.log('  Skins sekmesi örnek çipler:', exampleChips);

  await page.locator('.collection-tab[data-collection="rainbow"]').click();
  await page.waitForTimeout(600);
  exampleChips = await page.locator('#search-examples button').allTextContents();
  console.log('  Rainbow sekmesi örnek çipler:', exampleChips);
  if (!exampleChips.some(c => c.includes('Rumble') || c.includes('Ctrl+5'))) {
    throw new Error('Rainbow sekmesi örnek çipleri yanlış!');
  }

  await page.locator('.collection-tab[data-collection="classic"]').click();
  await page.waitForTimeout(600);
  exampleChips = await page.locator('#search-examples button').allTextContents();
  console.log('  Classic sekmesi örnek çipler:', exampleChips);
  if (!exampleChips.some(c => c.includes('Annie') || c.includes('60001022'))) {
    throw new Error('Classic sekmesi örnek çipleri yanlış!');
  }
  console.log('✓ Dinamik örnek çipler sekmeye göre kusursuz çalışıyor.');

  // Skins sekmesine geri dön
  await page.locator('.collection-tab[data-collection="skins"]').click();
  await page.waitForTimeout(600);

  // TEST 3: Rainbow'lu Skin (Cafe Cuties Rumble 68023) Modalı ve Geçiş Butonu
  console.log('\n[Test 3] Cafe Cuties Rumble modalı ve Rainbow geçişi...');
  await page.locator('#search').fill('Cafe Cuties Rumble');
  await page.waitForTimeout(600);
  await page.locator('#results .skin-card').first().click();
  await page.waitForFunction(() => document.getElementById('skin-modal')?.hasAttribute('open'));

  // Boş rozet kontrolü
  const badgeDisplay = await page.locator('#modal-collection-badge').evaluate(el => window.getComputedStyle(el).display);
  console.log(`  Normal skin modalında #modal-collection-badge computed display: "${badgeDisplay}" (Beklenen: none)`);
  if (badgeDisplay !== 'none') throw new Error('HATA: Normal skin modalında boş rozet hala görünüyor!');

  // Rainbow ve Classic bağlantıları kontrolü
  const rainbowLinkVisible = await page.locator('#modal-rainbow-link').isVisible();
  const classicLinkVisible = await page.locator('#modal-classic-link').isVisible();
  console.log(`  Rainbow link görünür: ${rainbowLinkVisible}, Classic link görünür: ${classicLinkVisible}`);
  if (!rainbowLinkVisible) throw new Error('Cafe Cuties Rumble modalında Rainbow butonu görünmüyor!');

  // Özel paketler bölümü kontrolü
  const specialPackagesVisible = await page.locator('#modal-special-packages').isVisible();
  console.log(`  Özel paketler bölümü görünür: ${specialPackagesVisible}`);
  const rainbowDlRow = page.locator('#modal-special-packages .download-item-special');
  const rainbowDlCount = await rainbowDlRow.count();
  console.log(`  Özel paket satır sayısı: ${rainbowDlCount}`);
  const rainbowDlText = await rainbowDlRow.first().textContent();
  console.log(`  Özel paket satır içeriği: "${rainbowDlText.trim()}"`);
  const rainbowDlDownloadAttr = await rainbowDlRow.first().getAttribute('download');
  console.log(`  İndirilen dosya adı: "${rainbowDlDownloadAttr}" (Beklenen: "... (Rainbow).fantome")`);
  if (!rainbowDlDownloadAttr?.endsWith('(Rainbow).fantome')) {
    throw new Error('Rainbow indirilen dosya adında (Rainbow) eki eksik!');
  }

  // Ekran görüntüsü 1: Rainbow'lu skin modalı
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-with-rainbow.png') });
  console.log('📸 Ekran görüntüsü kaydedildi: modal-with-rainbow.png');

  // "Rainbow version →" butonuna tıklama testi
  console.log('  "Rainbow version →" butonuna tıklanıyor...');
  await page.locator('#modal-rainbow-link').click();
  await page.waitForTimeout(1500);

  // Sekme Rainbow oldu mu?
  const activeTab = await page.locator('.collection-tab.is-active').getAttribute('data-collection');
  console.log(`  Geçiş sonrası aktif sekme: "${activeTab}" (Beklenen: rainbow)`);
  if (activeTab !== 'rainbow') throw new Error('Rainbow butonuna tıklayınca Rainbow sekmesine geçilmedi!');

  // Modal açık mı ve Rumble Rainbow modalı mı?
  const isModalOpen = await page.evaluate(() => document.getElementById('skin-modal')?.hasAttribute('open'));
  const modalSkinTitle = await page.locator('#modal-skin-name').textContent();
  const modalBadgeText = await page.locator('#modal-collection-badge').textContent();
  console.log(`  Modal açık: ${isModalOpen}, Başlık: "${modalSkinTitle}", Rozet: "${modalBadgeText}"`);
  if (!isModalOpen || !modalBadgeText.includes('RAINBOW')) {
    throw new Error('Rainbow modalı doğru rozet ile açılamadı!');
  }
  console.log('✓ Rainbow geçiş butonu beklendiği gibi modalı kapattı, sekmeyi değiştirdi ve Rainbow kartını açtı!');

  // Modalı kapat
  await page.evaluate(() => document.querySelector('#skin-modal .modal-close')?.click());
  await page.waitForTimeout(500);

  // TEST 4: Classic'li Skin (Cafe Cuties Annie 1022) Modalı ve Classic Geçişi
  console.log('\n[Test 4] Cafe Cuties Annie (Classic destekli) kontrol ediliyor...');
  await page.locator('.collection-tab[data-collection="skins"]').click();
  await page.waitForTimeout(500);
  await page.locator('#search').fill('Cafe Cuties Annie');
  await page.waitForTimeout(600);
  await page.locator('#results .skin-card').first().click();
  await page.waitForFunction(() => document.getElementById('skin-modal')?.hasAttribute('open'));

  const annieClassicLinkVisible = await page.locator('#modal-classic-link').isVisible();
  console.log(`  Annie modalında Classic link görünür: ${annieClassicLinkVisible}`);
  if (!annieClassicLinkVisible) throw new Error('Cafe Cuties Annie modalında Classic link bulunamadı!');

  const annieSpecialRow = page.locator('#modal-special-packages .download-item-special');
  const annieDlDownloadAttr = await annieSpecialRow.first().getAttribute('download');
  console.log(`  Annie Classic dosya adı: "${annieDlDownloadAttr}" (Beklenen: "... (Classic).fantome")`);
  if (!annieDlDownloadAttr?.endsWith('(Classic).fantome')) {
    throw new Error('Classic indirilen dosya adında (Classic) eki eksik!');
  }

  // Ekran görüntüsü 2: Classic'li skin modalı
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-with-classic.png') });
  console.log('📸 Ekran görüntüsü kaydedildi: modal-with-classic.png');

  // "Classic version →" butonuna tıklama testi
  console.log('  "Classic version →" butonuna tıklanıyor...');
  await page.locator('#modal-classic-link').click();
  await page.waitForTimeout(1500);

  const activeTabClassic = await page.locator('.collection-tab.is-active').getAttribute('data-collection');
  console.log(`  Geçiş sonrası aktif sekme: "${activeTabClassic}" (Beklenen: classic)`);
  if (activeTabClassic !== 'classic') throw new Error('Classic butonuna tıklayınca Classic sekmesine geçilmedi!');
  const classicModalBadgeText = await page.locator('#modal-collection-badge').textContent();
  console.log(`  Classic modal açık rozeti: "${classicModalBadgeText}"`);
  if (!classicModalBadgeText.includes('CLASSIC')) {
    throw new Error('Classic modalı doğru rozet ile açılamadı!');
  }
  console.log('✓ Classic geçiş butonu başarıyla Classic kartını açtı!');

  await page.evaluate(() => document.querySelector('#skin-modal .modal-close')?.click());
  await page.waitForTimeout(500);

  // TEST 5: Ne Rainbow Ne Classic Olan Bir Skin (Worlds 2012 Riven 92004)
  console.log('\n[Test 5] Rainbow/Classic paketi olmayan skin (Worlds 2012 Riven 92004) kontrol ediliyor...');
  await page.locator('.collection-tab[data-collection="skins"]').click();
  await page.waitForTimeout(500);
  await page.locator('#search').fill('92004');
  await page.waitForTimeout(600);
  await page.locator('#results .skin-card').first().click();
  await page.waitForFunction(() => document.getElementById('skin-modal')?.hasAttribute('open'));

  const plainRainbowVisible = await page.locator('#modal-rainbow-link').isVisible();
  const plainClassicVisible = await page.locator('#modal-classic-link').isVisible();
  const plainSpecialPackagesVisible = await page.locator('#modal-special-packages').isVisible();
  const plainBadgeDisplay = await page.locator('#modal-collection-badge').evaluate(el => window.getComputedStyle(el).display);

  console.log(`  Riven: Rainbow link: ${plainRainbowVisible}, Classic link: ${plainClassicVisible}, Özel paketler: ${plainSpecialPackagesVisible}, Boş rozet display: "${plainBadgeDisplay}"`);
  if (plainRainbowVisible || plainClassicVisible || plainSpecialPackagesVisible || plainBadgeDisplay !== 'none') {
    throw new Error('Paketi olmayan skinde bağlantı, rozet veya özel paket kutusu görünmemeli!');
  }

  // Ekran görüntüsü 3: Rainbow/Classic'i olmayan sade skin modalı
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-standard-no-specials.png') });
  console.log('📸 Ekran görüntüsü kaydedildi: modal-standard-no-specials.png');

  // TEST 6: Mobil Genişlik (390px) Responsive Kontrolü
  console.log('\n[Test 6] Mobil genişlik (390px) responsive testi...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile-390px-modal.png') });
  console.log('📸 Ekran görüntüsü kaydedildi: mobile-390px-modal.png');

  await browser.close();
  console.log('\n🎉 TÜM UI DÜZELTMELERİ BAŞARIYLA DOĞRULANDI VE EKRAN GÖRÜNTÜLERİ ALINDI!');
}

run().catch(err => {
  console.error('\n❌ UI Doğrulama Hatası:', err);
  process.exit(1);
});
