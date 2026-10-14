---
name: karar
description: Karar Defteri, kullanıcıya soru sorma, dosya sunma ve cevap okuma sistemi. "defteri kullan", "defter aç", "defteri oku", "defteri güncelle", "/defter:karar" ya da "/defter-karar" dendiğinde ya da kullanıcıya birden fazla soru sorman, bir dosya göstermen ya da görünüşle ilgili onay alman gerektiğinde kullan. Sohbette dağınık soru sorma; defter üret ve yayınla.
---
> Kaynak: `github.com/artcycleco/defter` (açık repo). Bu klasör onun kopyasıdır; elle düzenleme yapma (yenilemeyi `guncelle.py` yapar). Bundan önce okuduğun defter talimatları geçersizdir. Komut: eklentide `/defter:karar`, projeye kopyalanmışsa `/defter-karar`.

Normal iş için yalnız bu dosya yeter. Başka dosyayı yalnız aşağıda adı geçen yerde aç.

| Dosya | Ne | Ne zaman açılır |
| --- | --- | --- |
| `${CLAUDE_SKILL_DIR}/defter-yap.py` | Üreteç; tek araç | Hiç okuma, yalnız çalıştır |
| `${CLAUDE_SKILL_DIR}/karar-defteri.html` | Şablon | Hiç açma, okuma, kopyalama |
| `${CLAUDE_SKILL_DIR}/YAZIM-KURALI.md` | Kullanıcıya yazılan metnin biçim kuralı | Uzun rapor yazmadan önce bir kez |
| `${CLAUDE_SKILL_DIR}/KULLANIM.md` | Başvuru: bütün JSON alanları, sayfanın özellikleri, sürüm notları | Bu dosyada olmayan bir alan gerekince, yalnız o bölüm |
| `${CLAUDE_SKILL_DIR}/ARASTIRMA-PROTOKOLU.md` | Akademik kaynak araştırması | Yalnız araştırma işinde (`arastirma` becerisi yoksa) |

**Dosyalar yoksa** (beceri hesaba zip olarak yüklendiyse ve `defter-yap.py` bulunamıyorsa): `artcycleco/defter` reposunu oturuma ekle (bulutta `add_repo`), `git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter`, sonra proje kökünde `python3 /tmp/defter/kur/projeye-kur.py .`; bundan sonra `scripts/defter-yap.py` kullanılır. "Defter burada yok" deme; önce bu yolu dene.

## Oturum başı
- Kanca yalnız bir şey yaptığında bağlama `[karar-defteri N] ...` satırı koyar: kopya güncellendiyse commit et; eski sürümde defter varsa her birini "yükselt". Satır yoksa her şey günceldir.
- Beceri yolu ne `plugins` ne `.claude/skills` içindeyse (hesaba zip olarak yüklenmiş), kanca çalışmaz: ilk kullanımda bir kez `python3 ${CLAUDE_SKILL_DIR}/guncelle.py --kontrol` çalıştır. Ağdan kaynak repoyu çeker ve bu klasörü yeniler; ağ yoksa tek satır yazıp geçer.

## Ayar
`docs/defterler/ayar.json`: `{"ad": "...", "merkez": "https://claude.ai/artifact/...", "eposta": "..."}`.
- `ad` şart: dosya yoksa ilk defterden önce tek satırla adını sor, yalnız `ad` ile yaz. Bilmediğin alanı yazma, boş bırakma.
- `merkez`: Defter Merkezi bağlantısı; üreteç her deftere kendisi koyar. Yoksa Merkez adımlarını atla. Kullanıcı "Merkez'i kur" derse `python3 ${CLAUDE_SKILL_DIR}/merkez/merkez-yap.py` `merkez.html` üretir (bu klasörde yoksa reponun `merkez/` klasörü); `capabilities: {"db": {}, "mcp": {"servers": [{"server": "Google Drive", "tools": ["search_files", "create_file", "download_file_content", "trash_file"]}]}}` ile yayınla, bağlantıyı `merkez`e yaz.
- `eposta`: yalnız araştırmada (OpenAlex, Unpaywall iletişim adresi); başka yerde kullanılmaz.

## Kipler
- "aç" ya da "kullan": yeni defter ya da var olana madde. "oku": cevapları işle. "yükselt": eski defteri yeni şablona taşı. "güncelle": beceriyi kaynaktan yenile.
- Yalnız komut yazıldıysa (konu yok): projede `docs/defterler/veri/*.json` varsa "oku"; yoksa konu uydurma, tek satır sor: "Hangi konuda defter açayım?"

## Sohbet kısa, ayrıntı defterde
Sohbette en çok üç satır: ne yaptın, defterin bağlantısı, kullanıcıdan ne beklediğin. Açıklama, rapor, karşılaştırma deftere madde olarak gider.

Her rapor ve bilgi maddesinin gövdesi üç ara başlıkla başlar:
- `#### Yaptım`: bitti ve doğrulandı; yarım kalan buraya yazılmaz.
- `#### Senin işin`: Kullanıcının yapacağı iş, adımıyla; yoksa "Yok." Ayrı ☐ görev varsa numarası.
- `#### Soru`: ayrı ✎ maddenin numarası; yoksa "Yok."

Yapamadığın iş (izin reddi, erişim yok) "Senin işin"e nedeniyle yazılır. "Yapıldı" yalnız yapılıp denenen iş için söylenir.

## Defter açmak
1. Kaynak JSON `docs/defterler/veri/<ad>.json`; `<ad>` = `id` (küçük harf, tire):
   ```json
   {"id": "web-sitesi", "title": "Web sitesi; kısa amaç", "agent": "Bu işi yapan ajan (ör. Site ajanı)",
    "date": "YYYY-AA-GG", "purpose": "Bir cümle: defter neyi karara bağlar", "items": []}
   ```
   Madde id'si kısa önek ve sayı (W1, W2); bir kez kullanılan id bir daha kullanılmaz.
2. Üret (komutları proje kökünden çalıştır): `python3 ${CLAUDE_SKILL_DIR}/defter-yap.py docs/defterler/veri/<ad>.json docs/defterler/<ad>.html`. Hata varsa sayfa yazılmaz; uyarıları düzelt.
3. Yayınla: Artifact `file_path` `docs/defterler/<ad>.html`; `files` üretecin bastığı harita aynen (yollar proje köküne göre; çalışma klasörün proje kökü değilse `root` = proje kökü). İlk yayında `icon: "notebook"`, `description` = `purpose`, `capabilities: {"db": {}, "assets": {}, "downloads": true, "comments": {}, "mcp": {"servers": [{"server": "Google Drive", "tools": ["search_files", "create_file", "download_file_content", "trash_file"]}]}}`.
4. Dönen bağlantıyı kaynağa `"url"` olarak yaz, yeniden üret, bir kez daha yayınla (Merkez köprüsü defteri bağlantısıyla tanır; sayfa ince, ikinci yayın ucuz).
   Sonraki her yayında Artifact'a `url` = kaynaktaki `url` ver (vermezsen yeni bir artifact açılır); `icon` ve `capabilities` verme, korunur.
5. Satırı Merkez'e yaz (Merkez kurulu değilse `oku` "yazma yok" der, atla): `python3 ${CLAUDE_SKILL_DIR}/defter-yap.py oku docs/defterler/veri/<ad>.json --url <url> --durum "<tek satır>" --proje "<proje>"` (cevap yokken `--cevap` gerekmez), çıktının söylediği tek yazmayı yap.
6. Sohbette: "Defter hazır: <bağlantı>. N madde, M acil." Projenin kuralı commit istiyorsa kaynak JSON, sayfa ve ekleri commit et.

Sonraki turlar: `liste` (maddeleri JSON'u okumadan gör), `goster VERI.json W3` (tek maddeyi kısa gör: şıklar, öneri, adımlar), `ekle VERI.json yeni.json` (yeni madde; var olan id'ye yalnız değişen alanları verirsen birleştirir, `title` verirsen bütün maddeyi değiştirir; `-` ile stdin), `yanitla VERI.json W3 "soru" "yanıt"`, üret, yayınla. Bir iş adımında çıkan maddeleri tek yayında topla.

#### Yayın ve ince sayfa (şablon 51)
Sayfa ince: maddeler sayfanın içinde; stil ve kod `defter-<özet>.css` ve `defter-<özet>.js` dosyalarında, adları içeriklerinin özeti. Yeni bir oturumda yayın bir dosya için "okumadın" diye reddedilirse ve o dosyayı bu turda değiştirmediysen (kod dosyaları, eski ekler) haritadan çıkar, yeniden gönder; sunucudaki kalır. Sayfanın kendisi reddedilirse platformun verdiği canlı sürüme bak: fark yalnız senin değişikliğinse aynı yayını tekrar gönder; başka bir değişiklik varsa (başka oturum yayınlamış) kaynağına işle, sonra üret.

## Canlı defter
1. Çalışırken çıkan her görev, soru ve teknik karar o adımda deftere eklenir ve yayınlanır; oturum sonuna biriktirilmez.
2. Hazırladığın md, PDF, HTML, görsel, video ilgili maddeye `ekler` olarak konur; kullanıcıya yalnız dosya yolu verilmez.
3. Görünüş sorusunda canlıysa bağlantı, değilse görsel şart (aşağıda "Görünüş").
4. Her iş kaleminin sonunda ve her commit'ten önce `read_db` get `defter/_ozet`; `son` alanı son okumandan yeniyse "oku"yu tam çalıştır (sayılar sıfır olsa da). "oku"dan hemen sonra gerekmez.
5. Görevi bitmiş saymadan önce defter son kez okunur. Cevap yoksa ve iş ona bağlıysa dur: "Defterde N madde cevabını bekliyor: <bağlantı>".
6. Kullanıcı **Ajana haber ver**'e basınca oturuma "Defteri doldurdum" yorumu gelir: "oku"yu çalıştır, yoruma tek satırla cevap ver, yorumu kapat.
7. Acil madde eklediysen ve `PushNotification` aracın varsa tek satır bildirim gönder.
8. Terminli (`due`) madde açtıysan ve Google Takvim bağlayıcın varsa Merkez'de `meta/ayar.takvim` takvimine etkinlik yaz (başlık `[Acil] ...` ya da `[Defter] ...`); 22.00 ile 08.00 arasına hatırlatma koyma.

## Madde yazmak
- Alanlar: `id, priority, type, title, why` ve türe göre `options, rec, recv, body, steps, deliver, ekler, gorseller`. En çok 5 acil, 20 madde, 3 şık. `why` en çok iki cümle.
- `priority`: 1 iş bunu beklemeden ilerlemiyor · 2 bu hafta · 3 sonra.
- `type`: `design` ✎ kullanıcı seçer (tasarım, marka, isim, para, hukuk, kullanıcıya görünen metin) · `tech` ⚙ "Karar (ajan): ..." şıksız, itiraz notla · `info` ⓘ · `report` ▤ (içinde soru yok) · `task` ☐ (`steps` ve `deliver` şart).
- Şık: `{"v": "a", "t": "kısa ad", "d": "ne demek, öteki şıktan farkı (en çok iki cümle)", "m": "yok | düşük | orta | yüksek"}`. `rec` önerinin cümlesi, `recv` önerilen şıkkın `v`'si (oku cevabı buna göre "= onerin" diye işaretler). `m` yalnız token harcayan şıkta; "Yapma" şıkkı hep olsun.
- Kullanıcının bilmeyebileceği terim ya sade sözle yazılır ya da `"terimler": {"terim": "tek cümle"}`e girer.
- Çoklu seçim: `"coklu": true`, `recv` liste olabilir, en çok 10 şık; why'a "İşaretlediğin kabul, işaretlemediğin ret".

#### Görünüş
- Varyantlar `ekler`e: şık sırasıyla bir dosya bir varyant (`{"url": "ekler/<ad>/a.png", "ad": "A · Lacivert"}`); dört varyantı tek görselde gösterme. İkili önce/sonra: `"karsilastir": [{url, ad}, {url, ad}]`.
- `gorseller`: yalnız kullanıcının üzerine çizip iğneyle işaretleyeceği tek örnek görsel (`docs/defterler/ornek/`).
- Görsel yoksa resim üretmek zorunda değilsin: her varyantı küçük bir HTML sayfası olarak `ekler`e koy (sayfada açılır). Ekran görüntüsünü kendin açıp bakma; yalnız doğrulaman gerekiyorsa bak.

#### Dosya ve sayfa
- `ekler`: `[{"url": "ekler/<ad>/rapor.pdf", "ad": "Rapor"}]`; tür uzantıdan (pdf, html, md, txt, mp4, webm, görsel). `https://` adresi bağlantı ekidir. Dosyalar `docs/defterler/ekler/<ad>/`, `url` göreli. 15 MB'tan büyük dosya ayrı artifact olur, bağlantısı `ekler`e. Birden çok dosya tek zip: `{"url": "ekler/<ad>/paket", "tur": "paket", "dosyalar": [...], "zipAdi": "x.zip"}`.
- Okuma sayfaları: `"sayfalar": [{"id": "strateji", "ad": "Strateji", "body": "md"}]` sekme olur. Yalnız gerekeni aç: `"durum": "kapali"`, `"kosul": "ne zaman açılır"`, gerekirse `"m": "yüksek"`; kapalı sayfa "Diğer" altında listelenir, onu güncelleme. Koşul gelince `durum`u sil; `m` yüksekse önce tek ✎ maddeyle sor; başta onaylanan sayfa sormadan açılır.
- Kaynakça: `"kaynakca": [{baslik, yazar, yil, dergi, doi, url, grup, neden}]`.

#### Kalıplar
- Metin onayı: şimdiki ve önerilen metin tablo ya da `> ` alıntı; şıklar "Böyle kalsın" ve "Değiştir (nota yaz)".
- Ad ya da isim: en çok 3 aday, her birinde `d`.
- Görev: `steps` `[{"go": "nereye", "do": "ne yap", "see": "ne görürsün"}]`, `deliver` ne getireceği. Satın alma görevi kendiliğinden onay gerektirmez; ama kart, adres, kimlik isteme.
- Cevabı belliyse sorma, ⚙ yaz.

#### İsteğe bağlı alanlar
- `risk`: yalnız para, yayın, silme, sözleşme gibi dışa dönük ya da geri alınamayan işte (`dis | icerik | geri | donulmez`). Riskli ve acil madde sayfada şık seçmeden tamamlanmaz.
- `degisti`: güncellediğin maddede tek satır ne değişti. `yerine`: eski kararı değiştiren madde. `daci`: `{"karar": "kullanıcı", "danis": "...", "haber": "..."}`. `sonuc`: kapanan kararın sonucu. `due`: termin. `onay`: bitince teyidi gereken kişi.
- Defter düzeyinde: `"silinmez": true` (tez gibi; madde arşive geçer), `"sinir": 30` (kullanıcı onaylarsa), `"renk"`, `"butce"` (yalnız biliyorsan; tahmin uydurma).
- Kişisel bilgi (adres, telefon, kimlik, sağlık, aile, hesap) deftere ya da rapora girecekse önce ✎ onay maddesi aç.

#### Biçim
Komut ve yol için özel alan yok; sayfa kendisi tanır. Komutu kod bloğuna ya da `` `git pull` `` gibi satır içine yaz: çerçeveli, renkli, "Kopyala" düğmeli kutu olur. Yolu `` `docs/defterler/` `` gibi yaz (proje köküne göre ya da `C:\...`): tıklanınca kopyala, GitHub'da aç, Gezgin'de aç menüsü çıkar.
Boş satır paragraf, `**kalın**`, `- ` ve `1. ` liste, `> ` alıntı, `#### ` ara başlık, `| a | b |` tablo, kod bloğu. Uzun tire yok. Kullanıcının kopyalayacağı komut `` `komut` `` ya da kod bloğunda; birine gönderilecek mesaj ```` ```mesaj Site ajanına ```` bloğunda. Kural: `${CLAUDE_SKILL_DIR}/YAZIM-KURALI.md`.

## "oku": cevapları işle
1. Topla; belgeleri tek tek okuma, hepsi `out_dir`'e:
   - Defterin `cevap` ve `defter` koleksiyonları, ikisi aynı `out_dir` `.merkez/ham/<ad>`: oturumdaki ilk okumada ikisine de ArtifactData `list`; sonraki okumalarda `oku`nun son satırda bastığı `query where updatedAt >= ...` ile yalnız değişenler. `defter` koleksiyonunda tamamlanmamış notlar, kullanıcının eklediği `UG-` maddeleri ve eski şablonların cevapları durur.
   - Merkez varsa: Merkez'in `cevap` koleksiyonu, `query where [["defter", "==", "<defter doc_id>"]]`, `out_dir` `.merkez/ham/<ad>-merkez`.
2. `python3 ${CLAUDE_SKILL_DIR}/defter-yap.py oku docs/defterler/veri/<ad>.json --url <url> --cevap .merkez/ham/<ad> [--merkez .merkez/ham/<ad>-merkez] --durum "<tek satır>" --proje "<proje>"`.
3. Çıktı her cevabı sorusuyla tek satırda verir: `D3 Logo rengi -> secim: Lacivert (= onerin) | not: ...`. Maddeyi açman gerekmez; bir soruyu yanıtlamak için maddenin ayrıntısı lazımsa `goster VERI.json D3`.

| Satır | Ne | Ne yaparsın |
| --- | --- | --- |
| `YENI`, `BEKLIYOR` | İşlenmemiş cevap; BEKLIYOR daha önce basılmış, hâlâ kapanmamış | "= onerin" ve not yoksa hazırladığın planı uygula; değilse notu oku, uygula |
| `SORU` | Açık maddeye soru | `yanitla VERI.json W3 "soru" "yanıt"`; madde açık kalır |
| `TASLAK` | Tamamla'ya basılmadan yazılan not ya da seçim | Soruysa `yanitla`, istekse yap; seçimi Tamamla gelmeden uygulama. Değişmeyen taslak bir daha tek satır basılır |
| `SENDEN` | Kullanıcının eklediği madde | İşle (yap ya da madde aç), sonra `kapat` |
| `UYARI` | Maddesi kaynakta olmayan cevap | Kaynak canlı defterden eski: canlı sayfayı Artifact read ile al, kaynağa işle, sonra üret |

4. Her cevaptan sonra: karar kaydı (`docs/KARARLAR.md` varsa `tarih | karar | defter id`), uygula, sonra `python3 ${CLAUDE_SKILL_DIR}/defter-yap.py kapat docs/defterler/veri/<ad>.json D3 "ne yaptın, tek cümle" [D4 "..."]`. Kapat maddeyi çıkarır ve karar kaydına `y` yazar (Merkez'de "Ajan: ..." satırı); veritabanında silme gerekmez, kapanan cevap bir daha basılmaz. Notlu, sorulu ya da retli cevabı başka yolla çıkarırsan üreteç durur.
5. Üret, yayınla, `oku`nun söylediği yazmaları yap (Merkez'den gelen cevaplar deftere, Merkez satırı).
6. Okuma "Defteri doldurdum" yorumuyla başladıysa: ArtifactComments `{"action": "reply", "url": <defter>, "thread_id": <yorum mesajındaki>, "text": "tek satır"}`, sonra aynı url ve thread_id ile `{"action": "resolve"}`.

Cevap alanları (hepsi `oku` çıktısında yazılı; belgeyi ayrıca açma): `sinif` (onay, ret, soru, serbest, gereksiz): onay ve ret kısa işlenir, soru ve serbest notu dikkatle oku. `ret` Hayır nedeni; `ret: "Başka öner"` gelirse aynı id ile iki yeni şık sun (`degisti` yaz). `gereksiz: true`: kararı kendin ver, ⚙ bildir, bu türü bir daha sorma. `gerekce`: karar kaydına aynen. `notlar`: dosyalara ve görseldeki iğnelere yazılmış notlar (`[{ad, tur, not}]`), her biri o yere dair. `kaynak: "merkez"`: Merkez'den geldi, aynı işlenir. `bekledi`: kaç saat bekledi.

Cevap 24 saat taslaktır: `risk` `dis` ya da `donulmez` olan işi `kesin` gelmeden ya da 24 saat dolmadan uygulama; öteki cevaplar hemen uygulanır. Önerinden farklı bir şık seçilmesi olağandır; uygula. Yalnız not belirsizse (iki türlü okunuyorsa) ya da seçilen şıkla çelişiyorsa uygulama: notu alıntılayan bir ✎ teyit maddesi aç. Rapora gelen not geri bildirimdir; kararı değiştirecekse ayrı ✎ madde açılır. `"silinmez": true` defterde hiçbir belge silinmez; `kapat` silme önermez.

## "yükselt" ve "güncelle"
- Yükselt: kaynak JSON aynı; önce "oku" (cevap kaybolmasın), sonra yeni şablonla üret, aynı bağlantıya yayınla. İlk ince yayında platform eski kalın sayfayı bir kez geri verir; bu bir kezlik bedeldir.
- Başka oturumun defterini yükseltirken kaynak canlı sayfadan eski olabilir: `oku` UYARI verirse önce canlıyı al.
- Kapanmış defter: kaynağa `"kapandi": "YYYY-AA-GG"`; kanca onu bildirmez, yükseltilmez.
- Güncelle: kaynak repoyu çek, `kur/projeye-kur.py` çalıştır, bu dosyayı yeniden oku.

## Bütçe
| İş | Ne okursun | Yaklaşık |
| --- | --- | --- |
| Beceri | Bu dosya, oturumda bir kez | 5 bin token |
| Yeni oturumda ilk yayın | Platformun geri verdiği ince sayfa (maddeler) | 2 ile 10 bin |
| Okuma turu | Liste çıktıları ve `oku` çıktısı | 1 ile 3 bin; cevap başına ~100 |
| Kapatma, üretme | Komut çıktısı | 100 ile 300 |

- Şablonu, üretilen sayfayı, `defter-*.js` ve `defter-*.css` dosyalarını hiç okuma; kaynak JSON'u bütün okuma (`liste`, `ekle`).
- Koleksiyonları her turda baştan listeleme; `oku`nun bastığı sorguyu kullan. `.merkez/` klasörleri okuma önbelleğidir, git'e girmez (`oku` `.gitignore`'a ekler).
- Yükseltme ve Merkez satırı gibi mekanik işi küçük modele ver (Agent aracı, `model: haiku`); karar ve metin işini kendin yap.
