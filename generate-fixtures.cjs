const fs = require('fs');

const DEFAULTS = {
    hero: {
        eyebrow: 'SO3 / PERSONAL TRAINING',
        headline_primary: 'Herkese göre değil.',
        headline_emphasis: 'SANA GÖRE.',
        support_text: 'Kalabalığa değil, gelişimine odaklan.',
        feature_left: 'Kişiye özel antrenman',
        feature_right: 'Birebir takip',
        primary_cta_label: 'Ön görüşme planla',
        primary_cta_target: '/#iletisim',
        secondary_cta_label: 'SO3\'ü keşfet',
        secondary_cta_target: '/#branslar',
        background: null
    },
    contact: {
        contact_eyebrow: 'SO3 / İLETİŞİM',
        contact_headline_primary: 'SO3\'e',
        contact_headline_emphasis: 'ulaş.',
        directions_cta_label: 'Yol Tarifi Al',
        consultation_eyebrow: 'SO3 / ÖN GÖRÜŞME',
        consultation_headline_primary: 'Önce seni',
        consultation_headline_emphasis: 'tanıyalım.',
        consultation_intro_primary: 'Hedefini ve hangi alanda çalışmak istediğini konuşarak başlayalım.',
        consultation_intro_secondary: 'Nereden başlayacağını bilmiyorsan sorun değil. Birlikte değerlendirebiliriz.'
    },
    tour: {
        eyebrow: '360° SANAL TUR',
        headline: 'SO3\'ün içinde dolaş.',
        intro: 'Antrenman alanlarını gelmeden önce sanal turla keşfet.'
    },
    instagram: {
        eyebrow: 'SO3 / REELS',
        headline: 'SO3\'ü takip et.',
        intro: 'Güncel motivasyon, antrenman kesitleri ve SO3 topluluğundan anlar için Instagram\'da bize katılın.',
        cta_label: 'Instagram\'da Takip Et',
        placeholder_text: 'En güncel Reels videolarımızı Instagram hesabımız üzerinden hemen izleyebilirsiniz.',
        reels: []
    },
    community: {
        eyebrow: 'SO3 / TOPLULUK',
        headline: 'SO3 Ailesi Çok Sosyal',
        intro: 'SO3 topluluğu; kano, doğa yürüyüşü, voleybol ve piknik gibi etkinliklerle salon dışında da bir araya gelir.',
        cta_label: 'Tüm Etkinlikleri Keşfet'
    },
    trainers: {
        eyebrow: 'SO3 / EKİP',
        headline: 'Profesyonel Eğitim Kadrosu',
        intro: 'SO3 antrenör kadromuzla tanışın.'
    },
    branches: {
        eyebrow: 'SO3 / BRANŞLAR',
        headline_primary: 'Sana uygun olanı seç.',
        headline_emphasis: 'Harekete geç.',
        gallery_cta_label: 'Galeriyi Gör'
    },
    performance: {
        headline_primary: 'PERFORMANS',
        headline_emphasis: 'TESADÜF DEĞİLDİR.',
        description: 'Disiplinli çalışma, düzenli takip ve gelişime odaklanan yaklaşım SO3 kültürünün bir parçasıdır.',
        background: null
    },
    brand_band: {
        items: [
            'Kişisel Diyetisyen ve Beslenme Programı',
            'Supplement Danışmanlığı',
            'Birebir Dersler',
            'Kişiye Özel Program',
            'Özel Etkinlikler',
            'Profesyonel Eğitmenler'
        ]
    },
    about: {
        eyebrow: 'SO3 HAKKINDA',
        headline_primary: 'Kişiye Özel Bir',
        headline_emphasis: 'Antrenman Süreci',
        paragraph_primary: 'SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.',
        paragraph_secondary: 'SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.',
        youtube_video_id: '0ojUK4qD8yE',
        youtube_title: 'SO3 PT Tanıtım Filmi'
    },
    why_so3: {
        intro: "SO3'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.",
        items: [
            {title: "Birebir Takip", description: "Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler."},
            {title: "Kişiye Özel Program", description: "Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır."},
            {title: "Süreç Takibi", description: "Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir."},
            {title: "Gelişime Göre Güncel", description: "Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir."}
        ],
        eyebrow: "NEDEN SO3",
        headline_primary: "Tek tip program yok.",
        headline_emphasis: "Sana göre bir sistem var."
    },
    process: {
        steps: [
            {title: "Seni tanırız."},
            {title: "Sana göre planlarız."},
            {title: "Birlikte çalışırız."},
            {title: "Sen geliştikçe süreci güncelleriz."}
        ],
        eyebrow: "NASIL ÇALIŞIR?",
        headline_primary: "",
        headline_emphasis: ""
    }
};

const RAW_SQL_SECTIONS = [
    { section_id: 'hero', json: '{"eyebrow": "SO3 / PERSONAL TRAINING", "feature_left": "Kişiye özel antrenman", "support_text": "Kalabalığa değil, gelişimine odaklan.", "feature_right": "Birebir takip", "headline_primary": "Herkese göre değil.", "headline_emphasis": "SANA GÖRE.", "primary_cta_label": "Ön görüşme planla", "primary_cta_target": "/#iletisim", "background_media_id": 67, "secondary_cta_label": "SO3\'ü keşfet", "secondary_cta_target": "/#branslar"}' },
    { section_id: 'brand_band', json: '{"items": ["Kişisel Diyetisyen ve Beslenme Programı", "Supplement Danışmanlığı", "Birebir Dersler", "Kişiye Özel Program", "Özel Etkinlikler", "Profesyonel Eğitmenler"]}' },
    { section_id: 'branches', json: '{}' },
    { section_id: 'about', json: '{"eyebrow": "SO3 HAKKINDA", "youtube_title": "SO3 PT Tanıtım Filmi", "headline_primary": "Kişiye Özel Bir", "youtube_video_id": "0ojUK4qD8yE", "headline_emphasis": "Antrenman Süreci", "paragraph_primary": "SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.", "paragraph_secondary": "SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer."}' },
    { section_id: 'why_so3', json: '{"intro": "SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.", "items": [{"title": "Birebir Takip", "description": "Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler."}, {"title": "Kişiye Özel Program", "description": "Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır."}, {"title": "Süreç Takibi", "description": "Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir."}, {"title": "Gelişime Göre Güncel", "description": "Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir."}], "eyebrow": "NEDEN SO3", "headline_primary": "Tek tip program yok.", "headline_emphasis": "Sana göre bir sistem var."}' },
    { section_id: 'process', json: '{"steps": [{"title": "Seni tanırız."}, {"title": "Sana göre planlarız."}, {"title": "Birlikte çalışırız."}, {"title": "Sen geliştikçe süreci güncelleriz."}], "eyebrow": "NASIL ÇALIŞIR?", "headline_primary": "", "headline_emphasis": ""}' },
    { section_id: 'trainers', json: '{}' },
    { section_id: 'performance', json: '{"background_media_id": 68}' },
    { section_id: 'community', json: '{}' },
    { section_id: 'instagram', json: '{"intro": "Güncel motivasyon, antrenman kesitleri ve SO3 topluluğundan anlar için Instagram\'da bize katılın.", "reels": ["https://www.instagram.com/reel/DblY065tNEt/", "https://www.instagram.com/reel/DbdSs_dNg8r/", "https://www.instagram.com/reel/DahdLQgsdvr/", "https://www.instagram.com/reel/DZxX03itk2o/", "https://www.instagram.com/reel/DZsJRYzt32i/", "https://www.instagram.com/reel/DZnJvg1NWZK/"], "eyebrow": "SO3 / REELS", "headline": "SO3\'ü takip et.", "cta_label": "Instagram\'da Takip Et", "placeholder_text": "En güncel Reels videolarımızı Instagram hesabımız üzerinden hemen izleyebilirsiniz."}' },
    { section_id: 'tour', json: '{}' },
    { section_id: 'contact', json: '{}' }
];

const ORDER = RAW_SQL_SECTIONS.map(s => ({ section_id: s.section_id }));

const CONTENT = {};
for (const raw of RAW_SQL_SECTIONS) {
    const secId = raw.section_id;
    const parsed = JSON.parse(raw.json);
    const defaults = DEFAULTS[secId];
    const merged = { ...defaults, ...parsed };
    
    if (secId === 'hero') {
        merged.background = {
            url: "/media/so3/hero.jpg",
            thumbnail_url: "/media/so3/hero.jpg",
            alt_text: "SO3 Hero"
        };
        delete merged.background_media_id;
    }
    if (secId === 'performance') {
        merged.background = {
            url: "/media/so3/performance.jpg",
            thumbnail_url: "/media/so3/performance.jpg",
            alt_text: "SO3 Performance"
        };
        delete merged.background_media_id;
    }
    
    CONTENT[secId] = merged;
}

// read devFixtures.ts to replace the parts
const devFixturesFile = fs.readFileSync('src/lib/devFixtures.ts', 'utf8');

// I'll just write the entire top part of the file (before export const FIXTURES) to maintain the rest.
const splitParts = devFixturesFile.split('export const FIXTURES = {');
let newFile = splitParts[0] + 'export const FIXTURES = {\n';

newFile += `  HOMEPAGE_ORDER: ${JSON.stringify(ORDER, null, 4)},\n`;
newFile += `  HOMEPAGE_CONTENT: ${JSON.stringify(CONTENT, null, 4)},\n`;

// Append the rest of FIXTURES
const remaining = splitParts[1];
const remainingSplit = remaining.split(/HOMEPAGE_ORDER:.*?,\s*HOMEPAGE_CONTENT:.*?,/s);
if (remainingSplit.length === 2) {
    newFile += remainingSplit[1];
} else {
    // If it didn't match perfectly, just use string replace on the original object literal.
    // Let's do it with a safer regex replacing just HOMEPAGE_ORDER and HOMEPAGE_CONTENT
}
fs.writeFileSync('src/lib/devFixtures.ts.tmp', newFile);
