// Development fallback fixtures
// DO NOT USE IN PRODUCTION

export interface HomepageOrderSection {
    section_id: string;
}

export interface MediaAsset {
    id: number | string;
    url: string;
    thumbnail_url: string;
    alt_text: string;
}

export interface HomepageContent {
    [key: string]: unknown;
    hero?: {
        eyebrow: string;
        headline_primary: string;
        headline_emphasis: string;
        support_text: string;
        feature_left: string;
        feature_right: string;
        primary_cta_label: string;
        primary_cta_target: string;
        secondary_cta_label: string;
        secondary_cta_target: string;
        background: MediaAsset | null;
    };
    brand_band?: {
        items: string[];
    };
    about?: {
        eyebrow: string;
        headline_primary: string;
        headline_emphasis: string;
        paragraph_primary: string;
        paragraph_secondary: string;
        youtube_video_id: string;
        youtube_title: string;
    };
    why_so3?: {
        intro: string;
        items: Array<{ title: string; description: string; }>;
        eyebrow: string;
        headline_primary: string;
        headline_emphasis: string;
    };
    process?: {
        steps: Array<{ title: string; }>;
        eyebrow: string;
        headline_primary: string;
        headline_emphasis: string;
    };
    performance?: {
        headline_primary: string;
        headline_emphasis: string;
        description: string;
        background: MediaAsset | null;
    };
    instagram?: {
        eyebrow: string;
        headline: string;
        intro: string;
        cta_label: string;
        placeholder_text: string;
        reels: string[];
    };
    contact?: {
        contact_eyebrow: string;
        contact_headline_primary: string;
        contact_headline_emphasis: string;
        directions_cta_label: string;
        consultation_eyebrow: string;
        consultation_headline_primary: string;
        consultation_headline_emphasis: string;
        consultation_intro_primary: string;
        consultation_intro_secondary: string;
    };
    tour?: {
        eyebrow: string;
        headline: string;
        intro: string;
    };
    community?: {
        eyebrow: string;
        headline: string;
        intro: string;
        cta_label: string;
    };
    trainers?: {
        eyebrow: string;
        headline: string;
        intro: string;
    };
    branches?: {
        eyebrow: string;
        headline_primary: string;
        headline_emphasis: string;
        gallery_cta_label: string;
    };
}

export interface SiteSettings {
    [key: string]: unknown;
}

export interface Branch {
    id: string;
    slug: string;
    name: string;
    description: string;
    cover_image?: MediaAsset | null;
    media?: MediaAsset[];
}

export interface Trainer {
    id: string;
    slug: string;
    name: string;
    role_title: string;
    bio: string | null;
    instagram_username: string | null;
    profile_image?: MediaAsset | null;
    branch_slug?: string;
}

export interface EventCategory {
    id: string;
    name: string;
    slug: string;
}

export interface Event {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    event_date: string | null;
    location: string | null;
    status: string;
    is_featured: boolean;
    featured_order: number | null;
    category?: EventCategory | null;
    cover_image?: MediaAsset | null;
    media?: MediaAsset[];
}

export interface FixturesType {
    HOMEPAGE_ORDER: HomepageOrderSection[];
    HOMEPAGE_CONTENT: HomepageContent;
    SITE_SETTINGS: SiteSettings;
    BRANCHES: Branch[];
    TRAINERS: Trainer[];
    EVENTS: Event[];
    EVENT_CATEGORIES: EventCategory[];
}

export const FIXTURES: FixturesType = {
    HOMEPAGE_ORDER: [
        { section_id: 'hero' },
        { section_id: 'brand_band' },
        { section_id: 'branches' },
        { section_id: 'about' },
        { section_id: 'why_so3' },
        { section_id: 'process' },
        { section_id: 'trainers' },
        { section_id: 'performance' },
        { section_id: 'community' },
        { section_id: 'instagram' },
        { section_id: 'tour' },
        { section_id: 'contact' }
    ],
    HOMEPAGE_CONTENT: {
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
            background: { id: 67, url: '/media/so3/hero-so3.webp', thumbnail_url: '/media/so3/hero-so3.webp', alt_text: 'SO3 Hero' }
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
        branches: {
            eyebrow: 'SO3 / BRANŞLAR',
            headline_primary: 'Sana uygun olanı seç.',
            headline_emphasis: 'Harekete geç.',
            gallery_cta_label: 'Galeriyi Gör'
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
            intro: 'SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.',
            items: [
                { title: 'Birebir Takip', description: 'Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler.' },
                { title: 'Kişiye Özel Program', description: 'Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır.' },
                { title: 'Süreç Takibi', description: 'Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir.' },
                { title: 'Gelişime Göre Güncel', description: 'Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir.' }
            ],
            eyebrow: 'NEDEN SO3',
            headline_primary: 'Tek tip program yok.',
            headline_emphasis: 'Sana göre bir sistem var.'
        },
        process: {
            steps: [
                { title: 'Seni tanırız.' },
                { title: 'Sana göre planlarız.' },
                { title: 'Birlikte çalışırız.' },
                { title: 'Sen geliştikçe süreci güncelleriz.' }
            ],
            eyebrow: 'NASIL ÇALIŞIR?',
            headline_primary: '',
            headline_emphasis: ''
        },
        trainers: {
            eyebrow: 'SO3 / EKİP',
            headline: 'Profesyonel Eğitim Kadrosu',
            intro: 'SO3 antrenör kadromuzla tanışın.'
        },
        performance: {
            headline_primary: 'PERFORMANS',
            headline_emphasis: 'TESADÜF DEĞİLDİR.',
            description: 'Disiplinli çalışma, düzenli takip ve gelişime odaklanan yaklaşım SO3 kültürünün bir parçasıdır.',
            background: { id: 68, url: '/media/so3/performance.webp', thumbnail_url: '/media/so3/performance.webp', alt_text: 'SO3 Performance' }
        },
        community: {
            eyebrow: 'SO3 / TOPLULUK',
            headline: 'SO3 Ailesi Çok Sosyal',
            intro: 'SO3 topluluğu; kano, doğa yürüyüşü, voleybol ve piknik gibi etkinliklerle salon dışında da bir araya gelir.',
            cta_label: 'Tüm Etkinlikleri Keşfet'
        },
        instagram: {
            intro: 'Güncel motivasyon, antrenman kesitleri ve SO3 topluluğundan anlar için Instagram\'da bize katılın.',
            reels: [
                'https://www.instagram.com/reel/DblY065tNEt/',
                'https://www.instagram.com/reel/DbdSs_dNg8r/',
                'https://www.instagram.com/reel/DahdLQgsdvr/',
                'https://www.instagram.com/reel/DZxX03itk2o/',
                'https://www.instagram.com/reel/DZsJRYzt32i/',
                'https://www.instagram.com/reel/DZnJvg1NWZK/'
            ],
            eyebrow: 'SO3 / REELS',
            headline: 'SO3\'ü takip et.',
            cta_label: 'Instagram\'da Takip Et',
            placeholder_text: 'En güncel Reels videolarımızı Instagram hesabımız üzerinden hemen izleyebilirsiniz.'
        },
        tour: {
            eyebrow: '360° SANAL TUR',
            headline: 'SO3\'ün içinde dolaş.',
            intro: 'Antrenman alanlarını gelmeden önce sanal turla keşfet.'
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
        }
    },
    SITE_SETTINGS: {
        contact_phone: '+90 530 000 0000',
        contact_email: 'info@so3.com.tr',
        contact_address: 'Barbaros Mah. Mor Sümbül Sok.',
        business_hours_weekdays: '07:00 - 23:00',
        business_hours_weekends: '09:00 - 21:00'
    },
    BRANCHES: [
        {
            id: '1',
            slug: 'fitness',
            name: 'Fitness',
            description: 'Güç, kondisyon ve kişisel hedeflere göre şekillenen kişiye özel antrenman süreci.',
            cover_image: null,
            media: []
        },
        {
            id: '2',
            slug: 'boks',
            name: 'Boks',
            description: 'Kondisyon, refleks ve güç artırımı odaklı özel boks dersleri.',
            cover_image: null,
            media: []
        },
        {
            id: '3',
            slug: 'pilates',
            name: 'Pilates',
            description: 'Reformer pilates ile esneklik, merkez bölge gücü ve postür gelişimi.',
            cover_image: null,
            media: []
        },
        {
            id: '4',
            slug: 'yoga',
            name: 'Yoga',
            description: 'Beden ve zihin bütünlüğü, esneklik ve denge odaklı pratikler.',
            cover_image: null,
            media: []
        }
    ],
    TRAINERS: [
        { id: '1', slug: 'selami-ozyildirim', name: 'Selami Özyıldırım', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '2', slug: 'selim-ozyildirim', name: 'Selim Özyıldırım', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '3', slug: 'sencer-ozyildirim', name: 'Sencer Özyıldırım', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '4', slug: 'burak-corakcioglu', name: 'Burak Çorakçıoğlu', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '5', slug: 'eren-sencer-ozturk', name: 'Eren Sencer Öztürk', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '6', slug: 'mehmet-katipoglu', name: 'Mehmet Katipoğlu', role_title: 'Fitness Eğitmeni · Uzman Diyetisyen', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '7', slug: 'hulusi-unlu', name: 'Hulusi Ünlü', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '8', slug: 'sahranur-sozer', name: 'Sahranur Sözer', role_title: 'Fitness Eğitmeni', branch_slug: 'fitness', bio: null, instagram_username: null },
        { id: '9', slug: 'mehmet-ates', name: 'Mehmet Ateş', role_title: 'Boks Eğitmeni', branch_slug: 'boks', bio: null, instagram_username: null },
        { id: '10', slug: 'serhat-guler', name: 'Serhat Güler', role_title: 'Boks Eğitmeni', branch_slug: 'boks', bio: null, instagram_username: null },
        { id: '11', slug: 'almira-tektas', name: 'Almira Tektaş', role_title: 'Pilates Eğitmeni', branch_slug: 'pilates', bio: null, instagram_username: null },
        { id: '12', slug: 'muniyra-karayagiz', name: 'Müniyra Karayağız', role_title: 'Pilates Eğitmeni', branch_slug: 'pilates', bio: null, instagram_username: null },
        { id: '13', slug: 'irem-bulut', name: 'İrem Bulut', role_title: 'Yoga Eğitmeni', branch_slug: 'yoga', bio: null, instagram_username: null }
    ],
    EVENT_CATEGORIES: [
        { id: '1', name: 'Doğa Yürüyüşleri', slug: 'doga-yuruyusleri' },
        { id: '2', name: 'Takımlı Oyunlar', slug: 'takimli-oyunlar' },
        { id: '3', name: 'Kano Etkinlikleri', slug: 'kano-etkinlikleri' },
        { id: '4', name: 'Salon Etkinlikleri', slug: 'salon-etkinlikleri' }
    ],
    EVENTS: [
        { id: '1', title: 'Gomeda Vadisi Yürüyüşü', slug: 'gomeda-vadisi-yuruyusu', category: { id: '1', name: 'Doğa Yürüyüşleri', slug: 'doga-yuruyusleri' }, excerpt: 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: true, featured_order: 10 },
        { id: '2', title: 'Kano Etkinliği', slug: 'kano-etkinligi', category: { id: '3', name: 'Kano Etkinlikleri', slug: 'kano-etkinlikleri' }, excerpt: 'SO3 topluluğunun kano etkinliğinden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: true, featured_order: 20 },
        { id: '3', title: 'Voleybol Etkinliği', slug: 'voleybol-etkinligi', category: { id: '2', name: 'Takımlı Oyunlar', slug: 'takimli-oyunlar' }, excerpt: 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: true, featured_order: 30 },
        { id: '4', title: 'Mobilite Grup Dersi', slug: 'mobilite-grup-dersi', category: { id: '4', name: 'Salon Etkinlikleri', slug: 'salon-etkinlikleri' }, excerpt: 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: false, featured_order: 40 },
        { id: '5', title: 'Kırlangıç Vadisi Yürüyüşü', slug: 'kirlangic-vadisi-yuruyusu', category: { id: '1', name: 'Doğa Yürüyüşleri', slug: 'doga-yuruyusleri' }, excerpt: 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: false, featured_order: null },
        { id: '6', title: 'Plaj Voleybolu', slug: 'plaj-voleybolu', category: { id: '2', name: 'Takımlı Oyunlar', slug: 'takimli-oyunlar' }, excerpt: 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', content: '', event_date: null, location: '', status: 'published', is_featured: true, featured_order: null },
        { id: '7', title: 'Halı Saha', slug: 'hali-saha', category: { id: '2', name: 'Takımlı Oyunlar', slug: 'takimli-oyunlar' }, excerpt: 'So3 Ekibi Halısahada', content: '', event_date: null, location: '', status: 'published', is_featured: false, featured_order: null }
    ]
};
