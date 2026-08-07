# SO3 PT Digital Platform

Bu repo, SO3 PT premium spor ve yaşam kulübü için geliştirilecek uzun vadeli dijital platformun temel iskeletidir.

## Proje Mimarisi

- `src/assets/`: Görseller, logolar ve statik medya dosyaları.
- `src/components/`:
  - `ui/`: Buton, input, modal gibi temel (atomic) UI bileşenleri.
  - `layout/`: Navbar, Footer, Sidebar gibi sayfa düzeni bileşenleri.
- `src/config/`: Sabitler, ortam değişkenleri ve genel konfigürasyon dosyaları.
- `src/data/`: Mock datalar veya sabit içerikler (örn. menü linkleri).
- `src/features/`: Spesifik modüllere (ör. auth, etkinlikler) ait bileşenler ve mantık katmanı.
- `src/lib/`: Yardımcı fonksiyonlar (utils), üçüncü parti araçların yapılandırmaları.
- `src/pages/`:
  - `public/`: Herkese açık web sayfası görünümleri.
  - `admin/`: Sistem yöneticisi ekranları.
  - `member/`: Üye platformu ekranları.
  - `trainer/`: Antrenör yönetim ekranları.
  - `reception/`: Resepsiyon ve operasyon ekranları.
- `src/routes/`: React Router yapılandırması ve navigasyon mimarisi.
- `src/styles/`: Global stiller ve Tailwind konfigürasyonları.
- `src/types/`: TypeScript interface ve tipleri.

## Kurulum ve Çalıştırma

1. Proje dizinine gidin.
2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

## Build Alma

Projenin üretime hazır (production-ready) versiyonunu oluşturmak için:
```bash
npm run build
```

## Kalite Standartları

Bu projede Strict TypeScript uygulanmaktadır. Hiçbir build veya type hatası kabul edilemez. Tasarımlar daima mobil öncelikli (mobile-first) ve Tailwind utility class'ları ile geliştirilir.

Diğer standartlar için `AGENTS.md` ve `SO3_PRODUCT_SPEC.md` dosyalarını inceleyin.
