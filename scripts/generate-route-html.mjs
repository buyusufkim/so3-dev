import fs from 'fs';
import path from 'path';

const distPath = path.resolve('dist');
const indexHtmlPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found! Make sure to run vite build first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

function cleanHtml(html) {
  let cleaned = html
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<!--.*?Open Graph Basics.*?-->/gi, '')
    .replace(/<script\b[^>]*\bid=["\']so3-home-jsonld["\'][^>]*>[\s\S]*?<\/script>/gi, "");
  return cleaned;
}

function generateMeta(opts) {
  const eText = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  const eAttr = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let meta = `
    <title>${eText(opts.title)}</title>
    <meta name="description" content="${eAttr(opts.description)}" />
    <link rel="canonical" href="${eAttr(opts.url)}" />
    <meta property="og:title" content="${eAttr(opts.title)}" />
    <meta property="og:description" content="${eAttr(opts.description)}" />
    <meta property="og:type" content="${eAttr(opts.ogType || 'website')}" />
    <meta property="og:url" content="${eAttr(opts.url)}" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:site_name" content="SO3 Personal Training" />`;
      
  if (opts.ogImage) {
    meta += `
    <meta property="og:image" content="${eAttr(opts.ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${eAttr(opts.title)}" />
    <meta name="twitter:description" content="${eAttr(opts.description)}" />
    <meta name="twitter:image" content="${eAttr(opts.ogImage)}" />`;
  } else {
    meta += `
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${eAttr(opts.title)}" />
    <meta name="twitter:description" content="${eAttr(opts.description)}" />`;
  }
    
  if (opts.noindex) {
    meta += `
    <meta name="robots" content="noindex, follow" />`;
  } else {
    meta += `
    <meta name="robots" content="index, follow" />`;
  }

  if (opts.url === "https://so3pt.com.tr/" && !opts.noindex) {
    const jsonLdData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://so3pt.com.tr/#organization",
          "name": "SO3 Personal Training",
          "url": "https://so3pt.com.tr/",
          "logo": "https://so3pt.com.tr/brand/so3-logo.png"
        },
        {
          "@type": "WebSite",
          "@id": "https://so3pt.com.tr/#website",
          "name": "SO3 Personal Training",
          "url": "https://so3pt.com.tr/",
          "inLanguage": "tr-TR",
          "publisher": {
            "@id": "https://so3pt.com.tr/#organization"
          }
        }
      ]
    };
    const jsonStr = JSON.stringify(jsonLdData).replace(/</g, '\\u003c');
    meta += `\n    <script id="so3-home-jsonld" type="application/ld+json">${jsonStr}</script>`;
  }
  return meta;
}

function writeRouteHtml(route, opts, outputFilename = 'index.html') {
  const cleaned = cleanHtml(templateHtml);
  const metaBlock = generateMeta(opts);
  const finalHtml = cleaned.replace('</head>', `${metaBlock}\n  </head>`);
  
  let targetDir = distPath;
  if (route !== '/') {
    targetDir = path.join(distPath, route.replace(/^\//, ''));
  }
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const targetPath = path.join(targetDir, outputFilename);
  fs.writeFileSync(targetPath, finalHtml, 'utf-8');
  console.log(`Generated HTML for ${route} -> ${targetPath.replace(distPath, '')}`);
}

// 1. Homepage (Overwrites dist/index.html with exact meta)
writeRouteHtml('/', {
  title: "SO3 Personal Training | Kayseri",
  description: "Kayseri'de kişiye özel antrenman, birebir dersler, fitness, yoga, pilates, boks ve uzman diyetisyen desteği. SO3 Personal Training ile hedeflerine göre şekillenen kişisel bir antrenman deneyimi.",
  url: "https://so3pt.com.tr/",
  ogType: "website"
});

// 2. Events Archive
writeRouteHtml('/etkinlikler', {
  title: "SO3 Etkinlikleri | SO3 Personal Training Kayseri",
  description: "SO3 topluluğunun kano, doğa yürüyüşleri, voleybol ve grup antrenmanlarından gerçek etkinlik karelerini keşfedin.",
  url: "https://so3pt.com.tr/etkinlikler",
  ogType: "website"
});

// 3. Event Details
// Note: Event-detail SEO is served dynamically by api/seo-event.php at runtime.

// 4. Legacy redirect-only routes (noindex)
const legacyRoutes = ['/branslar', '/egitmenler', '/topluluk', '/iletisim', '/360-tur'];
legacyRoutes.forEach(route => {
  writeRouteHtml(route, {
    title: "SO3 Personal Training | Kayseri",
    description: "Kayseri'de kişiye özel antrenman, birebir dersler, fitness, yoga, pilates, boks ve uzman diyetisyen desteği. SO3 Personal Training ile hedeflerine göre şekillenen kişisel bir antrenman deneyimi.",
    url: "https://so3pt.com.tr/",
    ogType: "website",
    noindex: true
  });
});

// 5. 404 page (noindex)
writeRouteHtml('/', {
  title: "Sayfa Bulunamadı | SO3 Personal Training",
  description: "Sayfa bulunamadı.",
  url: "https://so3pt.com.tr/404.html",
  ogType: "website",
  noindex: true
}, '404.html');

console.log('Route HTML generation completed successfully.');
