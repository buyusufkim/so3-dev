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
    .replace(/<!--.*?Open Graph Basics.*?-->/gi, '');
  return cleaned;
}

function generateMeta(opts) {
  let meta = `
    <title>${opts.title}</title>
    <meta name="description" content="${opts.description}" />
    <link rel="canonical" href="${opts.url}" />
    <meta property="og:title" content="${opts.title}" />
    <meta property="og:description" content="${opts.description}" />
    <meta property="og:type" content="${opts.ogType || 'website'}" />
    <meta property="og:url" content="${opts.url}" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:site_name" content="SO3 Personal Training" />`;
    
  if (opts.ogImage) {
    meta += `
    <meta property="og:image" content="${opts.ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${opts.title}" />
    <meta name="twitter:description" content="${opts.description}" />
    <meta name="twitter:image" content="${opts.ogImage}" />`;
  } else {
    meta += `
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${opts.title}" />
    <meta name="twitter:description" content="${opts.description}" />`;
  }
  
  if (opts.noindex) {
    meta += `
    <meta name="robots" content="noindex, follow" />`;
  } else {
    meta += `
    <meta name="robots" content="index, follow" />`;
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

// 3. Events Details
const events = [
  { slug: 'kano-etkinligi', title: 'Kano Etkinliği' },
  { slug: 'gomeda-vadisi-yuruyusu', title: 'Gomeda Vadisi Yürüyüşü' },
  { slug: 'kirlangic-vadisi-yuruyusu', title: 'Kırlangıç Vadisi Yürüyüşü' },
  { slug: 'voleybol-etkinligi', title: 'Voleybol Etkinliği' },
  { slug: 'plaj-voleybolu', title: 'Plaj Voleybolu' },
  { slug: 'mobilite-grup-dersi', title: 'Mobilite Grup Dersi' }
];

events.forEach(evt => {
  const coverPath = `/media/so3/events/${evt.slug}/cover.webp`;
  const physicalCoverPath = path.join(distPath, coverPath);
  
  if (!fs.existsSync(physicalCoverPath)) {
    console.error(`ERROR: Expected cover image not found at ${physicalCoverPath}`);
    process.exit(1);
  }

  writeRouteHtml(`/etkinlikler/${evt.slug}`, {
    title: `${evt.title} | SO3 Personal Training`,
    description: `${evt.title} etkinliğinden SO3 topluluğuna ait gerçek fotoğraf ve video içeriklerini keşfedin.`,
    url: `https://so3pt.com.tr/etkinlikler/${evt.slug}`,
    ogType: "article",
    ogImage: `https://so3pt.com.tr${coverPath}`
  });
});

// 4. Legacy redirect-only routes (noindex)
const legacyRoutes = ['/branslar', '/egitmenler', '/topluluk', '/iletisim'];
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
