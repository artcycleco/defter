# Karar Defteri kullanım talimatı

> **Bu belge yapısal olarak değişti.** Karar defteri talimatının son sürümüdür; bundan sonra yalnız burada yazan kurallar geçerlidir. Daha önce okuduğun defter talimatları, sürüm notları ve alışkanlıklar geçersizdir.
>
> Kaynak: `github.com/artcycleco/defter` (açık). Bu dosya beceri klasöründedir (`.claude/skills/defter-karar/` ya da eklenti); kısa kural `SKILL.md`, bu dosya ayrıntıdır. Baştan sona okuma; ilgili bölümü aç.

## 1. Akış SKILL.md'de

Ajanın bütün akışı (defter açmak, yayın, okuma, kapatma, Merkez satırı, bütçe) `SKILL.md`'dedir ve kendi başına yeter. Bu dosya başvurudur: JSON alanlarının tamamı (§4), sayfada kullanıcının yapabildikleri (§8), yasaklar (§9) ve sürüm notları (§13 ve sonrası). Normal işte açılmaz; yalnız gereken bölüm okunur.

## 4. JSON alanları

```json
{
 "id": "site-gizlilik",
 "title": "Gizlilik Defteri; KVKK ve veri kararları",
 "agent": "Site ajanı",
 "date": "2026-09-20",
 "purpose": "Bu defter neye karar verdiriyor, bir cümle.",
 "items": [
  {
   "id": "G1",
   "priority": 1,
   "type": "design",
   "title": "Soru tek cümle, soru işaretiyle?",
   "why": "Neden soruyorum ve seçeneklerin bedeli. En fazla iki cümle.",
   "rec": "Önerim: X, çünkü ...",
   "recv": "a",
   "options": [
    {"v": "a", "t": "Seçenek A", "d": "Yalnız sonucu değiştiriyorsa: seçilince açılan açıklama"},
    {"v": "b", "t": "Seçenek B"}
   ],
   "body": "Uzun metin; yalnız info ve report maddelerinde",
   "steps": [{"go": "Nereye", "do": "Ne yap", "see": "Ne göreceksin", "keep": "Nereye koy"}],
   "deliver": "Görevde: bana getireceğin şey",
   "due": "2026-10-10",
   "docs": ["docs/ilgili-belge.md"]
  }
 ]
}
```

Dosya sunmak için iki alan var:

- `ekler`: Kullanıcının okuması için sunduğun dosyalar, `[{"url": "ekler/<defter>/rapor.pdf", "ad": "Rapor"}]`. Tür uzantıdan anlaşılır: `.pdf` PDF, `.html` sayfa, `.md` ve `.txt` metin, `.mp4` `.webm` video, görsel uzantıları görsel. `https://` ile başlayan adres **bağlantı ekidir**: canlı site, başka bir artifact (`https://claude.ai/...`); dosya yayına gitmez, kullanıcı bağlantıyı açar ve not bırakır. Kartta adıyla bir kutucuk olur; tıklanınca defterin tam ekranında açılır. PDF sayfa sayfa çizilir (ilk 40 sayfa), md biçimli okunur, HTML sayfası çerçeve içinde çalışır. Kullanıcı silemez; PDF sayfasının, video karesinin ya da görselin kopyasına çizebilir.
- `gorseller`: Kullanıcının üzerine çizmesi ya da izlemesi için örnek görsel ve video, `[{"url": "ornek/dosya.jpg", "alt": "..."}]`. Sayfada "örnek" rozetiyle görünür; kullanıcı silebilir.

Dosyalar defter sayfasının yanına konur: ekler `docs/defterler/ekler/<defter>/`, örnekler `docs/defterler/ornek/`. `url` sayfaya göre göreli yazılır. Repodaki bir belgeyi sunuyorsan oraya kopyala. Video ve PDF 15 MB'ı geçmez. Büyük üretimler (uzun video, ağır sunum) ayrı bir artifact olarak yayınlanır, bağlantısı `ekler`e `https://claude.ai/...` adresiyle konur; kullanıcıyı oraya yönlendir. Video kutucuğunda videodan rastgele ama hep aynı bir kare kapak olur. Bir maddenin bütün ekleri ve görselleri tam ekranda sırayla gezilir (← →, yandaki oklar, telefonda kaydırma).

Bir isteğe bağlı alan daha var:

- `dene`: seçeneği işaretlemenin sayfayı hemen o hâle getirdiği maddeler için, `{"ayar": "onerimAcik", "deger": {"acik": true, "kapali": false}}`. Deneyim gerektiren her karar böyle sorulur: Kullanıcı şıkkı işaretler, sayfa o davranışa geçer, sonra Tamamla der. Tanımlı ayarlar: `onerimAcik`, `ustSeritTek`, `tamamlaGit` (`ust`, `siradaki`, `yerinde`), `raporKatla`, `sonaAt`. Defterin varsayılanları en üstte `"ayarlar": {...}` ile verilir.

`id` sabittir, sonradan değişmez. `priority`: 1 acil (iş duruyor), 2 önemli, 3 sonra. `recv` önerilen seçeneğin `v` değeridir; kullanıcı "Önerilenleri kabul et" derse bu seçilir.

## 5. Madde yazma kuralları

- **Kısa.** `why` en fazla iki cümle, en fazla üç seçenek, seçenek açıklaması yalnız sonucu değiştiriyorsa.
- **Acil**, yalnız işi durduran şeydir. Bir defterde beşten çok acil madde varsa acil değildir.
- **Bir defter en çok yirmi madde.** Uzarsa konuya göre ikinci defter.
- **Aynı anda en çok üç canlı defter.** İşi biten defter arşive geçer, bir daha okunmaz.
- **Cevabı belliyse sorma.** "kullanıcının hangisini seçeceğini bilemem" testini geçmiyorsa ⚙ olarak yaz, bildir, geç.
- **⚙ maddeleri** "Karar (ajan): ..." diye başlar. Kullanıcı boş bırakırsa kabul sayılır.
- **☐ görevlerinde önce en kısa yol.** Ajan kullanıcı olmadan yapabiliyorsa yapar. Yapamıyorsa en az işlemli yolu hesaplar; adım sayısı serbest, her adım nereye gidileceğini, ne yapılacağını, ne görüleceğini ve sonucun nereye konacağını söyler. `deliver` şarttır.
- **Metin sorusunda metnin kendisi maddede olur.** Bir cümle, paragraf, başlık ya da buton yazısı hakkında soruyorsan o metni `> ` alıntı kutusuna koy; iki seçenek varsa şimdiki ve önerilen hâli iki satırlık tabloya koy. Ekran görüntüsü yeri gösterir, metnin yerine geçmez.
- **▤ raporunda soru sorulmaz.** Bulgu yazılır; karar gerektiren her şey ayrı ✎ madde olur.

## 6. Metin biçimleri

`why`, `body`, `rec`, `deliver`, seçenek açıklaması (`d`) ve görev adımları olağan Markdown ile yazılır; sayfa hepsini biçimler. Boş satır şart değildir: paragrafın hemen altındaki `- ` satırı liste olur.

| Yazılışı | Çıkan |
| --- | --- |
| boş satır | yeni paragraf |
| `**kelime**` | kalın, yalnız terim için |
| `*kelime*` | italik |
| `` `kod` `` | kod kutusu; 6 karakterden uzunsa yanında kopyala simgesi |
| ```` ``` ```` blok | çerçeveli kod; sağ üstte kopyala simgesi |
| ```` ```mesaj Site ajanına ```` blok | gönderilecek mesaj kutusu: başlık hedefi söyler, yazı satır kaydırır, kopyala simgesi |
| `[metin](https://...)` | bağlantı |
| `- ` satır başında | madde listesi; iki boşluk içeri alınan satır iç madde |
| `1. ` satır başında | sıralı liste |
| `> ` satır başında | alıntı kutusu |
| `##` ya da `####` | ara başlık |
| `\| a \| b \|` satırları | tablo; ikinci satır `\| --- \| --- \|` ise ilk satır başlık olur |
| `---` | yatay çizgi |

Kullanıcının bir yere yapıştıracağı her şey (komut, kod, bir ajana ya da kişiye mesaj) bu kutularla verilir; elle seçtirilmez.

Biçim kuralı `YAZIM-KURALI.md`'de: bir paragraf bir fikir, liste paragrafa gömülmez, kalın yalnız terim için, karşılaştırma tabloya girer, her iki üç paragrafta bir ara başlık. Uzun tire hiçbir yerde kullanılmaz.

## 7. Cevapları okumak

`SKILL.md` "oku" bölümü. Kısaca: `cevap` ve `defter` koleksiyonları `out_dir`'e, `defter-yap.py oku`, her cevabı `kapat` ile kapat.

## 8. Kullanıcı sayfada ne yapabiliyor

Ajanın bilmesi yeter, kod yazması gerekmez:

- **Açık** ve **Bitti** sekmeleri; cevaplanan madde Bitti'ye geçer, sayfa en üstteki açık maddeye döner, listenin başında altı saniyelik **geri al** şeridi çıkar. Sona atılan maddede "sonraya atıldı" rozeti durur.
- Sayfa içerik boyunda bir çerçevede açılıyorsa (yayın ortamı) görsel **kartın içinde yerinde** açılır, en üste çık oku ve kısayol düğmesi gizlenir.
- Enter tamamlar; seçeneği işaretledikten sonra da, not kutusundayken de çalışır. Shift+Enter notta alt satır, Alt+↓ sıradaki notun içine, j ve k madde gezer, 1 2 3 seçeneği işaretler, n nota geçer, c küçültür, ? kısayol kutusu.
- **Ctrl+Z** son işlemi geri alır: tamamlama, sonraya atma, küçültme, geri açma, sıra değişikliği, görsel ekleme ve silme, çizim. Yazı kutusunun içindeyken tarayıcının kendi geri alması çalışır.
- **Önerilenleri kabul et**: acil olmayan, önerisi olan bütün maddeleri tek seferde tamamlar. İki adımlı; ilk basış sayıyı gösterir, ikinci basış uygular, altı saniye beklenirse vazgeçer. Ctrl+Z hepsini geri alır.
- Sağ altta **en üste çık** oku; sayfa aşağı kayınca beliren, soluk duran küçük bir düğme.
- Her maddeye **görsel, video ya da PDF eklenebilir** (20 MB'a kadar): "Dosya ekle" ile, ekran görüntüsünü not kutusuna yapıştırarak ya da dosyayı kartın üstüne sürükleyip bırakarak. Tam ekranda ← → ya da yandaki oklarla maddenin bütün ekleri gezilir; PDF'te "Bu sayfaya çiz", videoda "Bu kareyi çiz" o anın kopyasını görsellere ekler. Küçük resme tıklayınca görsel tam ekran açılır; üç renk, üç kalınlık. Çizim **kendiliğinden kaydedilir**; çizgiler veri olarak saklandığı için ham görsel bozulmaz ve Ctrl+Z ile çizgi tek tek geri alınır. Kapatmak için sağ üstteki çarpı, gölgeye tıklama ya da Esc. Maddenin **not kutusu tam ekranın altında** da durur; görselden çıkmadan not yazılır, iki taraf aynı nottur.
- Tam ekranda **yakınlaştırır**: Ctrl+tekerlek, Ctrl + − 0 ya da üstteki − 100% + düğmeleri. Yakınken imleç el olur, tutup sürükler; görselde "✎ Çiz", sayfada "Sayfayı kullan" ile ele geçer. Tekerlek tam ekran açıkken arkadaki defteri kaydırmaz. HTML ekinin içindeyken de, video tam ekranından çıkınca da ← → ve Esc çalışır; yalnız yazı yazarken oklar metinde kalır. Dosya notunda Enter notu kaydedip sonraki dosyaya geçer. Sağ üstteki ✕ ve soldaki Kapat aynı işi yapar; oklar ve ✕ uzun görsel kayarken yerinde durur.
- Tam ekrandaki not kutusu **açık olan dosyanın notudur**; maddenin notu kartta ayrı kalır. Sayaçtan sonra dosyanın adı yazar; kendi eklediği dosyaların adını oradan değiştirir. Notlu kutucukta yeşil "not" rozeti olur.
- Uzun maddeyi küçültüp sonra dönebilir; küçültülenler üstte numaralı şeritte durur.
- Maddeleri ≡ tutamacından sürükleyerek kendi sırasına dizebilir; telefonda da sürükleme, ok düğmesi yok.
- "Kararları kopyala" ile bütün kararları okunur metin olarak alıp sohbete yapıştırabilir.
- Sayfaya kendi maddesini ekleyebilir; veritabanında `UG-` ile görünür.
- Atölye (gündüz) ve Kulis (gece) kabukları, yazı boyu üç kademe.

## 9. Yasak

- Şablon HTML'ini açmak, kopyalamak, düzenlemek. Gövdesi bağlama girerse bir defterin maliyeti üç katına çıkar.
- Üretilen `docs/defterler/<ad>.html` dosyasını elle düzenlemek.
- Sohbette dağınık soru sormak, defteri atlayıp karar istemek.
- Hazırladığın dosyayı yalnız yolunu yazarak sunmak; dosya defterde `ekler` ile sunulur.
- Görünüşle ilgili soruyu bağlantısız ve görüntüsüz sormak.
- Defteri okumadan görevi bitmiş saymak.
- Uzun tire kullanmak.
- Kişisel veri yazmak. Defterler proje kararları içindir.
- Görünüm, tema ya da kayıt kodunu değiştirmek. Şablon yalnız kullanıcının isteğiyle, planlama oturumunda değişir.

## 10. Kurulum, güncelleme, Merkez

Kurulum yolları reponun `KURULUM.md` dosyasındadır (claude.ai ve Claude Code için eklenti, bulut oturumu için projeye kopya). Güncelleme: eklentide `claude plugin update`; projeye kopyada kanca kendisi yeniler.

Defter Merkezi bütün defterlerin açık sorularını ve kararlarını tek sayfada toplar. Bağlantısı `docs/defterler/ayar.json` içindeki `merkez` alanıdır. Merkez kendi başına hiçbir defteri okuyamaz (her artifact'ın veritabanı ayrı); satırını ajan yazar (`oku` hazırlar), cevaplar Drive köprüsüyle ya da ajanın okumasıyla deftere geçer.

## 13. Sürüm 38 ile gelenler

| Alan ya da düğme | Ne yapar | Ajana maliyet |
| --- | --- | --- |
| Ajana haber ver | Kullanıcı basınca oturuma "Defteri doldurdum" yorumu düşer, oturum uyanır | Yorum başına bir kısa satır |
| `coklu: true` | Birden çok şık işaretlenir; `choice` liste | Yok denecek kadar az |
| Görsele iğne (📍) | Numaralı nokta ve not; cevapta `notlar` içinde `tur: igne` | İğne başına 30 ile 60 token |
| `karsilastir` | İki görsel üst üste, sürgüyle; oranlar çok farklıysa (masaüstü ve telefon gibi) yan yana açılır, hiçbiri kırpılmaz | Yok |
| `due` | Kartta "Takvime ekle" (Google Takvim) | Yok |
| 🎙 | Tarayıcı ses tanıması. claude.ai görünümünde mikrofon izni yok; düğme o zaman yanında sistem diktesini anlatır (Windows+H, Mac'te Fn iki kez, telefonda klavye mikrofonu) | Yok; ses dosyası tutulmaz |
| `tur: paket` | Birden çok dosya, İndir deyince tek zip | Yok |

## 14. Sürüm 40 ile gelenler

| Alan | Ne yapar | Ajana maliyet |
| --- | --- | --- |
| Şıkta `d` | Şıkkın yanında **açıkla** düğmesi; açıklama seçmeden okunur | Şık başına bir iki cümle |
| `terimler` | `{"terim": "tanım"}`; kelimeye dokununca tanım satırın altında açılır | Terim başına bir cümle |

Terim ya sade sözle yazılır ya da `terimler`e girer (YAZIM-KURALI 11). Görünüş sorusunda bir dosya bir varyant. Not belirsizse, öneriyi tersine çeviriyorsa ya da ajanın kendi metniyle çelişiyorsa uygulanmaz; görselli ✎ teyit maddesi açılır. Rapor maddesine gelen not geri bildirimdir; karar değiştirecekse ayrı ✎ madde açılır. (Ekip sayfaları ajanının 2026-10-11 hata raporundan.)

## 15. Sürüm 41 ile gelenler

| Yer | Ne değişti | Ajana maliyet |
| --- | --- | --- |
| Üst şerit | Başlık, tema, ayarlar çarkı, menü; ince ilerleme çizgisi; bağlantı noktası | Yok |
| Menü | Tam ekran: Açık, Bitti, Acil, madde ekle, Ayarlar, Defter Merkezi, Nasıl çalışır | Yok |
| Ayarlar | Süzgeç, yazı boyu, kart davranışları, düğmeleri aç kapa (`state._ayar`) | Yok |
| `karsilastir` | Ölçüler aynıysa sürgü, değilse yalnız yan yana; görsele basınca tam ekran | Yok |
| Tam ekran | Yakınlaştırma hafızası; karşılaştırma çiftinde iki görsel aynı bölgede | Yok |

Defter Merkezi bağlantısı şablonda sabittir; başka bir Merkez için kaynak JSON'a `"merkez": "<url>"` yazılır. Açıklama satırları sayfadan kalktı; işaretlerin anlamı "Nasıl çalışır" bölümünde.

## 16. Sürüm 42 ile gelenler

| Alan | Ne yapar | Ajana maliyet |
| --- | --- | --- |
| Başlık | LABS diyafram logosu ve defterin tam adı | Yok |
| Menü | Çizgi ikonlar; acil madde varsa turuncu bildirim noktası (menü düğmesinde de) | Yok |
| Şıkta `m` | Maliyet rozeti: yok yeşil, düşük gri, orta sarı, yüksek kırmızı | Şık başına birkaç token |
| Metin | Çıplak adresler (calendar.google.com gibi) tıklanır bağlantı olur | Yok |
| `"silinmez": true` | `sil` arşive taşır, cevaplar silinmez; arşiv sayfaya gitmez, kaynakta kalır | Yok |

## 17. Sürüm 43 ile gelenler (Paket 1, birinci bölüm)

| Alan | Ne yapar | Ajana maliyet |
| --- | --- | --- |
| Hızlı cevap | Tamam (önerilen şıkla tamamlar), Hayır ve nedeni (pahalı, beğenmedim, erken, başka), Soru sor | Yok; ajan okumayı kısaltır |
| Soru ve cevap | `sorular` cevapta; ajan maddeye `yanitlar` yazar, madde açık kalır; haber metninde sorulu maddeler | Soru başına bir kısa cevap |
| `sinif` | Not kelimelerden sınıflanır: onay, ret, soru, serbest | Token kazandırır |
| Yeni ve değişti | Son bakıştan beri yeni ya da değişen madde turuncu rozetli; `degisti` tek satır | Satır başına birkaç token |
| `risk` | dışa dönük, içerik, geri alınır rozeti | Yok |
| Bitti'de arama, sekmede acil sayısı, okundu, Dinle, `renk` | Sayfada çalışır | Yok |
| Claude'a gönder | Veritabanı yoksa (Claude Science, yerel dosya) maddenin cevabını kopyalar | Yok |

## 18. Sürüm 44 ile gelenler

| Alan | Ne yapar | Ajana maliyet |
| --- | --- | --- |
| `sayfalar` | Açık ve Bitti'nin yanında okuma sekmeleri; menüde de listelenir; metinde `![ad](ekler/x.png)` görsel | Bir kez yazılır |
| `kaynakca` | Aranır, gruba göre süzülür, künye açılır ve kopyalanır | Kaynak başına bir satır |
| `onay` | Bitmiş maddede "Teyit bekliyor: kim"; kullanıcı "Teyit edildi" der, kart yeşile döner; cevapta `teyit` tarihi | Yok |
| ARASTIRMA-PROTOKOLU.md | Akademik kaynak araştırması: önce plan, künye yalnız dizinden, aday kartı, Science köprüsü | Okuma bir kez |

## 19. Sürüm 45 ile gelenler

| Ne | Nasıl |
| --- | --- |
| Merkez'den cevap | Merkez'de verilen cevap `oku` ile deftere geçer, Bitti'de "Merkez'den" rozeti |
| Açık maddede soru | Soru artık cevap belgesine de yazılır (`acik: true`); önceki sürümde yalnız sayfanın kendi kaydındaydı |
| Maddeye bağlantı | `<url>#D12` maddeyi açar; ⋯ menüsünde "Bağlantıyı kopyala" (`url` alanı varsa onu kullanır) |
| Odak modu | Üstte hedef simgesi ya da `f`: tek kart, ← → ile geçiş, bitince sıradaki |
| Komut paleti | Üstte büyüteç, Ctrl+K ya da `/`: madde, sayfa, komut ara ve git |
| Çevrimdışı | Yazılamayan cevap tarayıcıda bekler, bağlantı gelince gider |
| Karar kartı | Bitti'de Karar, Sonuç (`sonuc`), Gerekçe satırları; taslak 24 saat ve Kesinleştir; `yerine` zinciri; `daci` satırı; `risk: donulmez` |
| Bekleme | `acildi` (üreteç yazar); kartta "3 gündür", cevapta `bekledi` saat |
| Gereksiz soru | ⋯ menüsünde; cevapta `gereksiz: true` |
| Sessiz saatler | Ayarlarda, varsayılan kapalı: 22.00 ile 08.00 arası sekmede sayı ve bildirim yok |
| Boy bekçisi | Açık madde `sinir`ı aşınca uyarı; tek tıkla ajana arşiv isteği |
| Bütçe | `butce` menünün altında |
| Haftalık özet | Menüde: son yedi günün kararları tablo, kopyala ya da indir (.md) |
| Toplu cevap | Menüde: kartları seç, Öneriyle tamamla, Tamam ya da Sonraya at |
| Kaydırma | Telefonda karta sağa kaydır Tamamla, sola Sonra; ayarlarda kapatılır |
| Yazdırma | Menüde Yazdır / PDF; düğmeler gizlenir |
| Kart | Başlık kendi satırında; Tamamla seçim yoksa "Öneriyle tamamla"; ✓ Tamam düğmesi kalktı; ⋯ menüsü (Sona at, Dosya ekle, Gerekçe, Dinle, Gereksiz, Bağlantı); dosya ekleme not kutusundaki ataçta |
| Görsel küçültme | Yapıştırılan görsel 1600 piksele iner |
| Üreteç | `oku` komutu (yalnız değişen cevap, Merkez satırı); `acildi` damgası; tekrar soru uyarısı; `yerine`, `daci`, `risk: donulmez` denetimi |

## 20. Sürüm 46 ile gelenler

| Ne | Nasıl |
| --- | --- |
| Bilinçli cevap | Acil ve riskli (`dis`, `donulmez`) şıklı maddede şık seçmeden ya da not yazmadan Tamamla çalışmaz; toplu cevap ve kaydırma bu maddeleri atlar |
| Başka öner | Hayır nedenlerinde; ajan aynı soruyu iki yeni şıkla yeniden sorar |
| Uzun önerim | 240 karakteri aşan önerim üç satırla durur, dokununca açılır |
| Yedeği indir | Menünün altında: bütün maddeler, cevaplar, notlar ve kaynakça (md ve JSON) |
| Kaynakça | `guven` rozeti ve süzgeci, `dogrulandi` rozeti, `geri_cekildi` kırmızı; BibTeX ve RIS indir (Zotero, Word) |
| Erişilebilirlik | ⋯ menüsü ok tuşlarıyla gezilir, Esc kapatır; her yerde odak çerçevesi |
| Merkez | Bugün görünümü (termini gelen, 3 günden fazla bekleyen, yeni); ajan 2 gündür okumadıysa uyarı; defter ve Merkez cevabı çelişince satır; Defterler'de haftalık sağlık |
| Üreteç | Karar kaydı kaynakta sınırsız (Merkez'e 200); `celiski` ve `saglik` Merkez satırında |

## 21. Sürüm 47 ile gelenler

| Ne | Nasıl |
| --- | --- |
| Drive köprüsü | Defter ve Merkez, kullanıcının Drive'ındaki Defter Esitleme klasörü üzerinden ajansız eşitlenir (§10) |
| Merkez'le eşitle | Defter menüsünün altında; elle eşitleme |
| Eşitle düğmesi | Merkez'in üst çubuğunda; son eşitleme zamanı düğmenin üzerinde |
| Yayın | `capabilities`'e `mcp` (Google Drive, dört araç) eklenir; kaynakta `url` şart |

Eski şablonlu defterler (47'den küçük) Merkez'de de görünür; satırlarındaki durum notu "eski şablon" der. Onların cevabı Drive'a gitmez, yalnız ajanın "defteri oku" çalışmasıyla Merkez'e geçer. Ajan defteri yükseltince Drive köprüsü açılır.

## 22. Araştırma becerisi

Araştırma Defteri'nin kuralları ayrı beceride: `skills/arastirma/` (`SKILL.md`, `ARASTIRMA-PROTOKOLU.md`, `ornek-arastirma.json`). Üreteç ve sayfa yine bu klasörden gelir; iki beceri birlikte yüklenir. Kurulum adımları repo kökündeki `KURULUM.md`; zip'leri `kur/paketle.py` üretir.

## 23. Sürüm 48 ile gelenler

| Ne | Nasıl |
| --- | --- |
| Dar ekran | Adım, dosya ve düz satırdaki uzun bağlantı alt satıra kırılır; sayfa yana taşmaz |
| İletişim kuralı | Sohbette en çok üç satır; her rapor "Yaptım, Senin işin, Soru" ile başlar (SKILL) |
| Eski cevaplar | 34 ve öncesi şablonlar cevabı yalnız `defter` koleksiyonunda tutar; `oku` öncesi o koleksiyondaki `done` belgeler de cevap sayılır |

## 24. Sürüm 49 ile gelenler: cevap kaybolmaz

Kullanıcının sorusu: "yazdığım bazı cevapları okumuyor, eski güncellenince tuhaf davranıyor". Dört yapısal neden bulundu ve kapatıldı.

| Neden | Düzeltme |
| --- | --- |
| `oku`, cevabı basınca "okundu" sayıyordu; ajanın bağlamı kapanırsa cevap bir daha görünmüyordu | İşlenmemiş cevap kapatılana kadar her okumada tam basılır (`YENI`, `BEKLIYOR`) |
| Tamamlanmamış maddeye yazılan not ajana hiç gitmiyordu | Sayfa onu `taslak: true` ile `cevap`a yazar; eski sayfalarda `oku` onu `defter` koleksiyonundan alır (`TASLAK`) |
| Sayfa yalnız `veri.json`'dan okuyordu; ajan dosyayı yayına vermeyi unutunca eski liste görünüyordu | Maddeler sayfaya da gömülür; `veri.json` yoksa ya da eskiyse gömülü kopya gösterilir (`uretildi` damgası) |
| Eski defterler yükseltilirken cevaplar ayrı koleksiyonda kalıyor, kaynak eski kalabiliyordu | `oku` iki koleksiyonu birlikte okur (`--eski` gerekmez); maddesi kaynakta olmayan cevap `UYARI` verir |

#### Kapatma zorunlu

Cevap işlenince madde `defter-yap.py kapat VERI.json D12 "ne yaptın"` ile kapanır. Karar kaydına `y` alanı yazılır; Merkez'in Kararlar sekmesinde "Ajan: …" satırı olarak görünür.

Notlu, sorulu ya da retli bir cevabın maddesi `kapat` olmadan çıkarılırsa üreteç durur. Böylece kullanıcının her notu ya bir iş, ya bir yanıt olarak izde kalır.

#### Ajana haber ver

Mesaj tamamlanmamış notları da sayar: "tamamlanmamış notlar: D12, D14".

## 25. Sürüm 50 ile gelenler: yalnız gereken sayfa açık

Kullanıcının isteği (Araştırma Atölyesi): sekmeler sığmıyor, kontrol etmesi zor; ihtiyaç olan açılsın, token yiyen sorulsun, baştakiler önden onaylı gelsin.

| Alan | Ne yapar |
| --- | --- |
| `"durum": "kapali"` | Sayfa sekme çubuğunda durmaz; "Diğer (N)" sekmesinde listelenir, Göster ile okunur |
| `"kosul"` | Ne zaman açılacağı; "Diğer"de "Açılır: …" diye görünür |
| `"m"` | Açmanın maliyeti; yüksekse ajan açmadan önce tek ✎ maddeyle sorar |

Ajan kapalı sayfayı güncellemez. Koşul gelince (o derse dair iş başlayınca gibi) `durum`u siler, sayfa sekmeye çıkar. Başta onaylanan sayfalar sormadan açılır; ajan aynı tür için tekrar sormaz. Sekme çubuğu taşınca yana kayar.

## 26. Sürüm 51 ile gelenler: ince sayfa

Ölçüm (Atölye, 4 madde): sayfa 235 KB'tan 9,6 KB'a indi. Yeni bir oturumda platform yayından önce canlı sayfayı ajana geri verir; bu bedel yaklaşık 60 bin tokendan 2 ile 3 bine düştü.

| Ne | Nasıl |
| --- | --- |
| Sayfa | Başlık, maddeler (sıkıştırılmış JSON) ve iki bağlantı |
| Stil ve kod | `defter-<özet>.css`, `defter-<özet>.js`; ad içeriğin özeti, kod değişmedikçe aynı ad, yeniden gönderilmez |
| `veri.json` | Kalktı; maddeler sayfada (unutulacak ikinci dosya yok) |
| Ret | Yeni oturumda değişmemiş bir dosya "okumadın" diye reddedilirse haritadan çıkarılır |

`oku` artık seçimi önerinle karşılaştırır ("= onerin" ya da "onerin degil; onerin: X"); ajan maddeyi açmadan kararı anlar. `defter` koleksiyonu için bir sonraki okumada yalnız değişenleri getiren sorguyu basar.

## 27. Sürüm 52 ile gelenler: komut kutusu ve tıklanır yol

| Ne | Nasıl | Ajana maliyeti |
| --- | --- | --- |
| Komut kutusu | Kod bloğu çerçeveli, ayrı renkte, üstte "Komut" etiketi ve yazılı "Kopyala" düğmesi; satır içi komut (`git ...`, `python3 ...`, `claude ...`) tıklanınca kopyalanır | Yok; sayfa tanır |
| Tıklanır yol | Metindeki klasör ve dosya yolu çip olur: Yolu kopyala, GitHub'da aç (depo ve dal üreteçten), Gezgin'de aç | Yok; depo `git` uzak adresinden ya da `ayar.json` `repo` alanından |
| Gezgin köprüsü | Windows'ta bir kez `kur/windows-gezgin.ps1`; `defter-ac:` bağlantısını yalnız klasör açmak için tanır, dosya çalıştırmaz. Proje klasörü defterin Ayarlar > Bilgisayar alanına bir kez yazılır | Yok |

Sunucu yolu (`/home/user/<repo>/...`) proje köküne göre çevrilir; projede olmayan sunucu yolu (`/tmp/...`) Gezgin'de açılmaz, kopyalanır.


## 28. Sürüm 53 ile gelenler: senaryo defteri
Metindeki `[O3]` gibi madde göndermesi tıklanır, maddeye gider. Kaynakta `senaryo` alanı varsa üreteç bir Senaryo sayfası, kapalı bir Değişiklikler sayfası ve indirilebilir `ekler/<id>/senaryo-<sürüm>.md` üretir. Ayrıntı `senaryo` becerisinde.

## 29. Sürüm 54 ile gelenler: daha az tıklama, daha az token

| Ne | Nasıl | Ajana maliyeti |
| --- | --- | --- |
| Klavyeyle cevap | 1 2 3 şıkkı seçer (çoklu seçimde aç kapa), Enter tamamlar, J K gezer; ilk tuş ilk maddeyi seçer, şıklarda numara görünür | Yok |
| Değişen cümle | Sayfa son açılıştaki metni tarayıcıda hatırlar; değişen cümle ve yeni şık sarıyla işaretlenir | Eksi: `degisti` yazmak gerekmez |
| Hazır not | Not kutusunun altında "Tamam, devam", "Sonra konuşalım", "Görsel at", "Daha basit anlat"; Ayarlar'dan kendi düğmelerin | Yok; not olarak gider |
| Çıktıyı yapıştır | Her komut kutusunun altında; ajana komutun ilk satırıyla son 40 satır gider (`cikti [komut]`) | Çıktı başına birkaç yüz token |
| Bunu açıkla | ⋯ menüsünde; Claude maddeyi okuyup sayfada cevaplar, seçtiğin metni soruya koyar; "Yetmedi, ajana sor" soruyu maddeye bırakır. `sample` yeteneği gerekir | Ajana yok; görüntüleyenin hesabından soru başına 1 ile 2 bin |
| Ajan kendisi karar versin | Defterin Ayarlar'ında ve Merkez'de tür listesi; ajan `oku`da `KENDIN` satırını, oturum başında Merkez `ayar/kendin`i okur | Eksi: daha az soru |
| Ajan rozeti | Başlıkta "Ajan: <durum> · 10 dk önce · sırada senin 2 cevabın"; `oku` her okumada `defter/_ajan` yazmasını basar | Okuma başına bir batch işlemi (~50 token) |
| Bugün kartı | Üstte en çok üç iş: acil ve termini yakın önce, her biri tahmini süresiyle (`sure` alanı ya da metnin uzunluğundan) | Yok |
| Ortak defter | Defteri "katkıda bulunabilir" paylaştığın kişi de cevap verir; kartta kimin ne dediği adıyla görünür (ad saklanmaz, her açılışta çözülür). `user` yeteneği gerekir | Cevapta `ortak sahip / arkadas` satırı |

Şablon 54'ten eski bir defterde "Bunu açıkla" ve ortak defter için bir kez tam `capabilities` ile yayınlanır (SKILL "Defter açmak" 3).

## 30. Sürüm 55 ile gelenler: senaryo sayfası

| Ne | Nasıl | Ajana maliyeti |
| --- | --- | --- |
| Sahneye not | Her sahnenin altında not kutusu; `oku`da `SAHNE S4 -> not` | Not başına ~100 token; ajan yalnız o sahneyi açar |
| Kare ve storyboard | Başlangıç ve bitiş karesi yükleme alanı, "+ Kare"; ajanın kareleri "Storyboard"da; tam ekranda iğne ve çizim | Kare başına bir satır (asset id ve notlar) |
| Süre çubuğu | Sahnede saniye kutusu; üstte zaman çizelgesi, toplam, hedef aşımı | Değişen süre tek satır ve hazır komut |
| Sürüm karşılaştırma | İki sürüm seçilir; değişen kelime yeşil ve kırmızı, değişmeyen sahne tek satır | Yok; sürüm dosyaları üretilirken yazılır |
| Fountain ve PDF | İndir: md, Fountain, Yazdırılabilir (açılan sayfada Ctrl+P) | Yok |
| Karakter kartları | Görünüş, motivasyon, ses, not; sahnede kim var düğmeleri | Değişen liste tek satır |
| Üretim günlüğü | Sahne başına araç, prompt, deneme, gerekçe; kapalı sayfa ve `uretim-gunlugu.md` | Yok; `oku` kaynağa kendisi işler |
| Sahne sırası | Sürükle bırak ya da ↑ ↓; ajana öneri olarak gider | Tek satır ve hazır `sahne-sira` komutu |
| Okuma modu | Tam ekran, büyük yazı, ← → sahne, sesli okuma; prompt alanları görünmez | Yok |
| Prompt kutusu | Adında "Prompt" geçen alan kopyalanır kutu | Yok |
