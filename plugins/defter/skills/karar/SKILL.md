---
name: karar
description: Karar Defteri, kullanıcıya soru sorma, dosya sunma ve cevap okuma sistemi. "defteri kullan", "defter aç", "defteri oku", "defteri güncelle", "/defter-karar" dendiğinde ya da kullanıcıya birden fazla soru sorman, bir dosya göstermen ya da görünüşle ilgili onay alman gerektiğinde kullan. Sohbette dağınık soru sorma; defter üret ve yayınla.
---
> Kaynak: `github.com/artcycleco/defter` (özel repo). Bu klasör onun kopyasıdır; burada düzenleme yapma. Bundan önce okuduğun defter talimatları geçersizdir.

Bu klasördeki dosyalar:

| Dosya | Ne |
| --- | --- |
| `${CLAUDE_SKILL_DIR}/defter-yap.py` | Üreteç; tek araç |
| `${CLAUDE_SKILL_DIR}/karar-defteri.html` | Şablon; **açma, okuma, kopyalama** |
| `${CLAUDE_SKILL_DIR}/KULLANIM.md` | Uzun kılavuz; yalnız gereken bölümü aç |
| `${CLAUDE_SKILL_DIR}/YAZIM-KURALI.md` | Kullanıcıya yazılan metnin biçim kuralı |

**Dosyalar yoksa** (beceri hesaptan yüklendiyse ve `${CLAUDE_SKILL_DIR}/defter-yap.py` bulunamıyorsa): `artcycleco/defter` reposunu oturuma ekle (bulutta `add_repo`), `git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter`, sonra `python3 /tmp/defter/kur/projeye-kur.py .` ile projeye kopyala; bundan sonra `scripts/defter-yap.py` kullanılır. Sohbette "defter burada yok" deme; önce bu yolu dene.

Kip kullanıcının sözünden anlaşılır: "aç" ya da "kullan" yeni defter ya da güncelleme, "oku" cevapları işle, "yükselt" eski defteri yeni şablona taşı, "güncelle" bu beceriyi kaynaktan yenile (KULLANIM §11).

## Oturum başı
Bağlamda `[karar-defteri N]` ile başlayan bir satır varsa önce onu uygula: kopya güncellendiyse commit et; eski sürümde defter varsa her birini "yükselt". Sonra asıl işe geç.
Bulutta ya da Cowork'te o satır gelmediyse (kanca yok), beceriyi ilk kullandığında bir kez `python3 ${CLAUDE_SKILL_DIR}/guncelle.py --kontrol` çalıştır; çıktısını uygula.

## Ayar: ad, Merkez, e-posta
Kullanıcının adı, Defter Merkezi bağlantısı ve e-postası projede `docs/defterler/ayar.json` dosyasında durur: `{"ad": "...", "merkez": "https://claude.ai/artifact/...", "eposta": "..."}`. Üreteç `merkez` bağlantısını her deftere kendisi koyar. Dosya yoksa ilk defterden önce tek satırla adını sor ve dosyayı yaz. Merkez yoksa ve kullanıcı "Merkez'i kur" derse `python3 ${CLAUDE_SKILL_DIR}/merkez/merkez-yap.py` (bu klasörde yoksa reponun `merkez/` klasörü) `merkez.html` üretir; onu `capabilities: {"db": {}, "mcp": {"servers": [{"server": "Google Drive", "tools": ["search_files", "create_file", "download_file_content", "trash_file"]}]}}` ile yayınla, bağlantıyı `merkez` alanına yaz.

## Konu belli değilse
Kullanıcı yalnız `/defter-karar` yazdıysa: önce projede defter var mı bak (`docs/defterler/veri/*.json`). Varsa "oku" kipini çalıştır. Yoksa defter açma, konu uydurma; tek satır sor: "Hangi konuda defter açayım?"

## Sohbet kısa, ayrıntı defterde
Sohbette en çok üç satır yazılır: ne yaptın (bir cümle), defterin bağlantısı, kullanıcıdan ne beklediğin. Açıklama, rapor, rehber, karşılaştırma ve "nasıl yürütürüz" konuşması deftere madde olarak gider; sohbette uzun metin yazılmaz.

Her rapor ve bilgi maddesinin gövdesi üç ara başlıkla başlar, kullanıcı "bunu sen mi yapacaksın, ben mi?" diye düşünmez:
- `#### Yaptım`: bitti ve doğrulandı; yarım kalanı buraya yazma.
- `#### Senin işin`: Kullanıcının yapacağı iş, adımıyla; yoksa "Yok." Ayrı bir ☐ görev maddesi varsa numarasını yaz.
- `#### Soru`: karar gerekiyorsa ayrı ✎ maddenin numarası; yoksa "Yok."

Yapamadığın iş (izin reddi, erişim yok, bağlayıcı kapalı) "Senin işin"e nedeniyle yazılır. "Yapıldı" yalnız gerçekten yapılıp denenen iş için söylenir.

## Canlı defter
1. Çalışırken çıkan her görev, soru ve teknik karar o iş adımında deftere eklenir ve yayınlanır; oturum sonuna biriktirilmez.
2. Hazırladığın md, PDF, HTML, görsel ya da video ilgili maddeye `ekler` olarak konur. Kullanıcıya yalnız dosya yolu verilmez.
3. Görünüşle ilgili soruda canlıysa bağlantı, değilse ekran görüntüsü şart; yoksa önce görüntüyü üret, sonra sor.
4. Görev boyunca her iş kaleminin sonunda ve her commit'ten önce `_ozet` okunur; `son` alanı son okumandan yeniyse "oku" kipini tam çalıştır (sayılar sıfır olsa da: tamamlanmamış not sayılara girmez). Onaylanan cevap hemen işlenir.
5. Görevi bitmiş saymadan önce defter son kez okunur. Cevapta iş varsa yapılır. Cevap yoksa ve iş ona bağlıysa durulur: "Defterde N madde cevabını bekliyor: <bağlantı>".
6. Kullanıcı defterdeki **Ajana haber ver**'e basınca bu oturuma "Defteri doldurdum" yorumu gelir: "oku" kipini çalıştır, sonunda yoruma tek satırla cevap ver.
7. Acil madde eklediysen ve `PushNotification` aracın varsa tek satır bildirim gönder ("Defterde 1 acil madde: <başlık>").
8. Her yayından ve her "oku" turundan sonra **Defter Merkezi**'ne satırını yaz (KULLANIM §12). Satırı `defter-yap.py oku` hazırlar: açık sorular, son kararlar, ajanın kısa durumu. Kullanıcı soruları Merkez'de görür ve oradan da cevaplar; Merkez kendi başına hiçbir defteri okuyamaz (her artifact'ın veritabanı ayrı), soruyu oraya yalnız sen taşırsın.
9. Terminli (`due`) madde açtıysan ve Google Takvim bağlayıcın varsa kullanıcının **Terminler** takvimine etkinlik yaz: kimlik Merkez'de `meta/ayar` belgesinin `takvim` alanı; başlık `[Acil] ...` ya da `[Defter] ...`, açıklamada defter bağlantısı ve madde id'si. Sessiz saatlere (22.00 ile 08.00) hatırlatma koyma.

## Bütçe
- Şablonu, üretilen sayfayı ve `.veri.json` dosyasını okuma. Kaynak JSON'u bütün okuma; `liste`, `ekle`, `sil` alt komutları var.
- Sayfa (`<ad>.html`) maddelerin gömülü kopyasını da taşır (şablon 49). `veri.json`'u yayına vermeyi unutursan sayfa yine güncel maddeleri gösterir; yine de haritayı her yayında aynen ver (ekler de orada).
- Bir iş adımında çıkan maddeleri tek yayında topla; madde başına ayrı yayın yapma.
- Cevap okuma: `cevap` ve `defter` koleksiyonları aynı `out_dir`'e, sonra `defter-yap.py oku`. Belgeleri tek tek okuma; üreteç basar.
- Ekran görüntüsünü çekip maddeye koy; kendin açıp bakma, yalnız doğrulaman gerekiyorsa bak.
- Cevapları `defter-yap.py oku` ile oku: işlenmemiş her cevabı, kapatana kadar her okumada tam basar; bağlamın kapansa da cevap kaybolmaz.
- Yükseltme ve Merkez satırı gibi mekanik işi küçük modele ver (Agent aracı, `model: haiku`); karar ve metin işini kendin yap.
- Yayında `"butce": "bu hafta ≈ 40 bin token"` gibi kabaca tahmini kaynak JSON'a yaz; menüde görünür.
- Bu dosya kısa kural; ayrıntı için KULLANIM.md'de yalnız ilgili bölümü aç.

## Defter üretmek
```bash
python3 ${CLAUDE_SKILL_DIR}/defter-yap.py liste docs/defterler/veri/<ad>.json          # maddeleri gör
python3 ${CLAUDE_SKILL_DIR}/defter-yap.py ekle  docs/defterler/veri/<ad>.json yeni.json # ekle ya da değiştir (- ile stdin)
python3 ${CLAUDE_SKILL_DIR}/defter-yap.py sil   docs/defterler/veri/<ad>.json D3 D4
python3 ${CLAUDE_SKILL_DIR}/defter-yap.py docs/defterler/veri/<ad>.json docs/defterler/<ad>.html
```
Üreteç `<ad>.html` ve `<ad>.veri.json` yazar, sonda "Artifact files" haritasını basar. Yayın: Artifact `file_path` = `<ad>.html`, `files` = o harita aynen, ilk yayında (ve sürüm 47'ye yükseltirken bir kez) `capabilities: {"db": {}, "assets": {}, "downloads": true, "comments": {}, "mcp": {"servers": [{"server": "Google Drive", "tools": ["search_files", "create_file", "download_file_content", "trash_file"]}]}}`. `mcp` Drive köprüsüdür: defter cevaplarını ve açık sorularını Merkez'e kendisi bildirir (KULLANIM §12). İlk yayından sonra kaynak JSON'a `"url"` yaz; köprü defteri onunla tanır. Aynı dosya yolu aynı bağlantıyı korur. Yeni bir oturumda yayın "canlı sürümü görmedin" diye reddedilirse ve fark yalnız senin değişikliğinse aynı yayını bir kez daha gönder.

Projede `scripts/defter-yap.py` varsa aynı üretecin yönlendirmesidir.

## Madde yazmak
- Alanlar: `id, priority (1 acil, 2 önemli, 3 sonra), type, title, why` ve türe göre `options, rec, recv, body, steps, deliver, ekler, gorseller, dene`. En çok 5 acil, 20 madde, 3 seçenek. `why` en çok iki cümle.
- `type`: `design` ✎ kullanıcı seçer (tasarım, marka, isim, para, hukuk, kullanıcıya görünen metin) · `tech` ⚙ "Karar (ajan): ..." · `info` ⓘ · `report` ▤ (içinde soru yok) · `task` ☐ (`deliver` şart).
- Görünüş sorusunda bir dosya bir varyant: her varyant ayrı görsel, ikili karşılaştırma `karsilastir`; dört varyantı tek görselde gösterme (kullanıcının notu hangisine ait, kaybolur). Görselde ok ya da etiketle göster; kullanıcı yerini iğneyle işaretler.
- Okuma sayfaları: `"sayfalar": [{"id": "strateji", "ad": "Strateji", "body": "md"}]` Açık ve Bitti'nin yanında sekme olur; metinde görsel `![ad](ekler/...png)`. Kaynakça: `"kaynakca": [{baslik, yazar, yil, dergi, doi, url, grup, neden}]` aranır, gruba göre süzülür, künyesi kopyalanır. Bitince birinin teyidi gereken maddede `"onay": "kim"`; kullanıcı "Teyit edildi" der.
- Akademik kaynak araştırması ve tez: `arastirma` becerisi (yüklüyse); yoksa `${CLAUDE_SKILL_DIR}/ARASTIRMA-PROTOKOLU.md` (önce plan, künye yalnız dizinden, aday kartı, Science köprüsü).
- İsteğe bağlı alanlar: `"risk": "dis | icerik | geri | donulmez"` (dışa dönük işte şart; baskı, sözleşme, yayın gibi geri alınamayan işte `donulmez`); güncellediğin maddede `"degisti": "tek satır ne değişti"`; defterin vurgu rengi `"renk"`; 20 madde sınırını kullanıcı onaylarsa kaynağa `"sinir": 30`; defterin kendi bağlantısı `"url"` (ilk yayından sonra yaz).
- Karar hafızası: eski bir kararı değiştiren maddede `"yerine": "D12"`; bir ortak ya da ekip işin içindeyse `"daci": {"karar": "kullanıcı", "danis": "Ortak", "haber": "Ekip"}`; kapanan kararın sonucunu `"sonuc": "tek satır"` ile yaz (Bitti'deki karar kartında görünür). `acildi` alanını üreteç kendisi yazar (bekleme süresi). Üreteç yeni bir başlık eskisine çok benziyorsa uyarır: önce eski kararı bul, gerekiyorsa sorma.
- Token harcayan şıkta `"m": "yok | düşük | orta | yüksek"` (gerekirse ` · 2 ile 5 bin`); şıkkın yanında küçük rozet olur. Maliyeti `d`'ye uzun cümle olarak yazma.
- Kişisel bilgi (adres, telefon, kimlik, sağlık, aile, para) deftere, rapora ya da tez metnine girecekse önce ✎ onay maddesi aç; onay gelmeden yazma.
- Şık kendini anlatmıyorsa `d` yaz: ne demek, kullanıcı ekranda ne görür, öteki şıktan farkı (en çok iki cümle); şıkkın yanında **açıkla** düğmesi çıkar, seçmeden okunur. Kullanıcının bilmeyebileceği her terim (tutulma halesi, LOD, bake) ya sade sözle yazılır ya da `"terimler": {"terim": "tek cümle tanım"}`e girer; kelimeye dokununca tanımı altında açılır. Kapalı durdukları için okurken yer kaplamaz.
- Birden çok şık seçilebilen soru: `"coklu": true`, `recv` liste olabilir (en çok 10 şık). Önce/sonra: `"karsilastir": [{url, ad}, {url, ad}]`. Birden çok dosyayı tek zip olarak sunmak: ek `{"url": "ekler/<defter>/paket", "tur": "paket", "ad": "...", "dosyalar": [...], "zipAdi": "x.zip"}`; sunucu zip, docx barındırmaz, zip sayfada kurulur.
- Dosya sunmak: `"ekler": [{"url": "ekler/<defter>/rapor.pdf", "ad": "Rapor"}]`. Tür uzantıdan: pdf, html, md, txt, mp4/webm, görsel. `https://` adresi bağlantı ekidir (canlı site, başka artifact). Üzerine çizilecek örnek görsel ve video `gorseller`. Dosyalar sayfanın yanına (`docs/defterler/ekler/<defter>/`, `docs/defterler/ornek/`), `url` göreli. 15 MB'tan büyük dosya ayrı artifact olarak yayınlanır, bağlantısı `ekler`e konur.
- **Soru kalıpları**:
  - Görünüş: her varyant ayrı görsel ya da `karsilastir`, şıklar varyant adları, önerin `recv`.
  - Metin onayı: şimdiki ve önerilen metin tablo ya da `> ` alıntı; şıklar "Böyle kalsın" ve "Değiştir (nota yaz)".
  - Maliyetli iş: her şıkta `m`; "Yapma" şıkkı hep var.
  - Liste seçimi: `coklu`, en çok 10 şık; why'da "İşaretlediğin kabul, işaretlemediğin ret".
  - Ad ya da isim: en çok 3 aday, her birinde `d` ile kısa gerekçe.
  - Teknik karar: ⚙, şıksız; "Karar (ajan): ..." ve itiraz notla.
- Metin sorusunda metnin kendisi maddeye girer (`> ` alıntı ya da şimdiki/önerilen tablosu). Cevabı belliyse sorma, ⚙ yaz.
- Biçim: boş satır paragraf, `**kalın**`, `- ` ve `1. ` liste, `> ` alıntı, `#### ` ara başlık, `| a | b |` tablo, ``` kod bloğu. Uzun tire yok.
- Kullanıcının kopyalayıp bir yere yapıştıracağı her şey kopyalanabilir verilir: komut satır içinde `` `komut` `` ya da ``` bloğu; bir ajana ya da kişiye gönderilecek mesaj ```` ```mesaj Site ajanına ```` bloğu (başlık hedefi söyler). Hepsinde kopyala simgesi çıkar; kullanıcı elle seçmez. Kural: `${CLAUDE_SKILL_DIR}/YAZIM-KURALI.md`.

## "oku": cevapları işle
1. Kestirme yok: `_ozet`e bakıp durma. Kullanıcı tamamlamadan not yazmış olabilir (taslak); hep 2. adımı yap.
2. Cevapları topla ve üreteçle oku (KULLANIM §12):
   - ArtifactData `list`, defterin url'si, collection `cevap`, `out_dir` `.merkez/ham/<ad>`;
   - ArtifactData `list`, defterin url'si, collection `defter`, aynı `out_dir` (eski şablonların cevapları, tamamlanmamış notlar, kullanıcının eklediği `UG-` maddeleri buradadır);
   - ArtifactData `query`, Merkez url'si, collection `cevap`, `where [["defter","==","<defter doc_id>"]]`, `out_dir` `.merkez/ham/<ad>-merkez`;
   - `python3 ${CLAUDE_SKILL_DIR}/defter-yap.py oku docs/defterler/veri/<ad>.json --url <defter url> --cevap .merkez/ham/<ad> --merkez .merkez/ham/<ad>-merkez --durum "<şu an ne yapıyorsun, tek satır>" --proje "<proje>"`.
   Çıktının satırları: `YENI` ve `BEKLIYOR` işlenmemiş cevap (BEKLIYOR = daha önce basıldı, hâlâ kapatılmadı; atlanmaz), `SORU` yanıt bekleyen soru, `TASLAK` kullanıcının tamamlamadan yazdığı not ya da seçim, `SENDEN` kullanıcının eklediği madde, `UYARI` maddesi kaynakta olmayan cevap (kaynak JSON canlı defterden eski: canlı `veri.json`'u Artifact read ile al, birleştir, sonra üret). Merkez'den gelenleri deftere taşımak için hazırlar ve yazmaları söyler: deftere `cevap` belgeleri (batch), Merkez'e satır (`defterler/<doc_id>` update). Hepsini yap.
   `TASLAK`: notu oku; soru ya da istekse yanıtla (`yanitlar`) ya da yap; seçimi Tamamla gelmeden uygulama. `SENDEN`: maddeyi işle (yeni madde aç ya da yap), sonra `kapat`.
   Cevap alanları: `{q, choice, label, note, steps, gorsel, notlar, doneAt}`. Çoklu soruda `choice` liste, `label` "A · B". `notlar` kullanıcının tek tek dosyalara ve görseldeki numaralı iğnelere yazdığı notlardır: `[{ad, tur, not}]` (`tur: "igne"`, `ad: "Görsel · iğne 2"`); her birini o yere dair geri bildirim say.
Cevapta `sinif` (onay, ret, soru, serbest, gereksiz) varsa onay ve reti tek satır işle, gerisini tam oku; `ret` Hayır nedeni. `sorular: [{q, at}]` kullanıcının o maddeye sorduklarıdır: maddeye `"yanitlar": [{"q": "...", "a": "..."}]` ekleyip yayınla, madde açık kalır. `acik: true` olan cevap belgesi tamamlanmamış maddedeki sorudur; yalnız yanıtla.
- `gereksiz: true`: Kullanıcı bu soruyu gereksiz buldu. Kararı kendin ver, ⚙ olarak bildir; bu türde bir daha sorma (proje notuna ya da `docs/KARARLAR.md`'ye "bu tür soruyu ajan karar verir" yaz).
- `gerekce`: kararın nedeni; karar kaydına aynen geçir. `bekledi`: madde kaç saat bekledi; çok bekleyen soru türünü daha erken ve daha basit sor.
- `kaynak: "merkez"`: cevap Merkez'den geldi, defterdekiyle aynı işlenir.
- `ret: "Başka öner"`: aynı soruyu iki yeni şıkla yeniden aç (aynı id, `degisti` satırıyla); eski şıkları tekrar sunma.
- Acil ve riskli (`dis`, `donulmez`) madde sayfada şık seçmeden, toplu cevapla ya da kaydırarak tamamlanmaz; cevap hep bilinçli gelir.
- Taslak: cevap 24 saat taslaktır. `risk` `dis` ya da `donulmez` olan işi `kesin` gelmeden ya da 24 saat dolmadan uygulama; öteki cevaplar hemen uygulanır.
3. `senden` sıfır değilse `defter` içinde `UG-` ile başlayan belgeler.
Not belirsizse, önerini tersine çeviriyorsa ya da kendi yazdığın metinle çelişiyorsa uygulama: o notu alıntılayıp iki okumayı şık yapan görselli bir ✎ teyit maddesi aç, öteki cevaplarla devam et. Rapor (▤) maddesine gelen not geri bildirimdir; bir kararı değiştirecekse ayrı ✎ madde açılır, nottan karar çıkarılmaz.
Kaynak JSON'da `"silinmez": true` varsa (tez gibi): `sil` maddeyi tarihle `arsiv`e taşır, `cevap/<id>` kayıtları silinmez; hiçbir şey kaybolmaz.
Her cevap için: karar kaydı (`docs/KARARLAR.md` varsa `tarih | karar | defter id`) → uygula → `defter-yap.py kapat docs/defterler/veri/<ad>.json <id> "ne yaptın, tek cümle"` (maddeyi çıkarır, karar kaydına `y` yazar; Merkez'in Kararlar sekmesinde "Ajan: …" olarak görünür) → kapatın bastığı batch ile belgeleri sil → üret ve yayınla → sohbette tek satır. Notlu, sorulu ya da retli cevabı `sil` ile çıkarırsan üreteç durur; `kapat` kullan. Silinen id bir daha kullanılmaz.

## "yükselt" ve "güncelle"
- Yükselt: kaynak JSON aynı; yeni şablonla üret, aynı bağlantıya yayınla. Cevaplar madde id'siyle durur.
- Kapanmış defter (işi bitmiş, kullanıcı bir daha açmayacak): kaynağa `"kapandi": "YYYY-AA-GG"` yaz; kanca onu eski sürüm diye bildirmez, yükseltilmez. Yeniden açılırsa alan silinir.
- Güncelle: KULLANIM §11 adımları; kısaca kaynak repoyu çek, `kur/projeye-kur.py` çalıştır, bu dosyayı yeniden oku.
