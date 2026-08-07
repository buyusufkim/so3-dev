# AI Asistanı Geliştirme Kuralları (SO3 PT Platformu)

Bu dosya, SO3 PT platformunun geliştirilmesi sırasında yapay zekâ asistanının (ve diğer geliştiricilerin) uyması gereken temel prensipleri ve kuralları içerir.

## Temel Kurallar
- Görev kapsamı dışındaki dosyaları kesinlikle değiştirme.
- Halihazırda çalışan özellikleri gereksiz yere yeniden yazma.
- Yeni bağımlılık (paket) eklemeden önce mevcut yapıyı ve projede daha önce kullanılmış alternatifleri kontrol et.
- Veritabanı değişikliklerini ileride yalnızca migration yöntemleri ile yap.
- Row Level Security (RLS) kuralları tanımlanmadan kişisel veya hassas veri içeren tablo oluşturma.
- Service role anahtarını veya diğer gizli anahtarları kesinlikle istemci (client) koduna veya herkese açık repo alanlarına koyma.
- Geliştirme sürecinde hiçbir TypeScript hatası veya uyarısı bırakma (strict mod kurallarına tamamen uy).
- Her görev veya özellik tamamlandığında mutlaka build (`npm run build`) ve lint kontrollerini çalıştır.
- Yaptığın değişikliklerin ardından değiştirilen dosyaları ve etkilenen alanları net bir şekilde raporla.
- Belirsiz iş kuralları veya eksik gereksinimlerle karşılaştığında varsayım yapmak yerine kullanıcıdan açıklama iste.

## Dil ve İsimlendirme
- Kullanıcı arayüzünde (UI) ve son kullanıcıya gösterilen tüm metinlerde **Türkçe** kullan.
- Kod (değişkenler, fonksiyonlar, sınıflar), dosya ve veritabanı tablo isimlerinde her zaman tutarlı **İngilizce** isimlendirme standartlarını kullan.

## Mimari Prensipler
- Modüler bileşen (component) mimarisine bağlı kal.
- Tüm tasarımları Mobil Öncelikli (Mobile-First) olarak kodla.
- Premium, minimalist ve kurumsal bir görünüm elde etmek için belirlenen tasarım kurallarının dışına çıkma.

## Ek Faz 0.1 Kuralları
- Raporladığın bir kontrolü gerçekten çalıştırmadan "başarılı" olarak işaretleme.
- Kullanıcı tarafından verilmemiş telefon, e-posta, adres, sosyal medya, fiyat, eğitmen veya istatistik uydurma.
- Bir özellik henüz geliştirilmediyse çalışanmış gibi mock davranış üretme.
- Faz sınırlarını ihlal etme.
- Yeni framework veya backend teknolojisi ekleme.
- Kullanılmayan dependency bırakma.
- UI değişikliği yaparken mevcut iş mantığını gereksiz yere değiştirme.
- Veritabanı devreye girdikten sonra eski migration dosyalarını değiştirme veya silme.
- Hassas anahtarları client bundle'a koyma.
- Her görev sonunda `npm run lint` ve `npm run build` gerçekten çalıştır.
