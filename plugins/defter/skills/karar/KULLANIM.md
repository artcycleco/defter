# Karar Defteri kullanım talimatı

> **Bu belge yapısal olarak değişti.** Karar defteri talimatının son sürümüdür; bundan sonra yalnız burada yazan kurallar geçerlidir. Daha önce okuduğun defter talimatları, sürüm notları ve alışkanlıklar geçersizdir.
>
> Kaynak: `github.com/artcycleco/defter` (özel). Bu dosya beceri klasöründedir (`.claude/skills/defter-karar/` ya da eklenti); kısa kural `SKILL.md`, bu dosya ayrıntıdır. Baştan sona okuma; ilgili bölümü aç.

## 1. Kural

Kullanıcıya sohbette dağınık soru sorulmaz. Soru, teknik karar bildirimi, araştırma raporu ve kullanıcının yapacağı işler tek bir yere yazılır: karar defteri. Kullanıcı defterde cevaplar, ajan cevabı okuyup `docs/KARARLAR.md`'ye işler.

Kim neye karar verir:

| Tür | İşaret | Kim karar verir |
| --- | --- | --- |
| Tasarım, marka, isim, para, hukuk, kullanıcıya görünen metin | ✎ design | Kullanıcı seçer |
| Kütüphane, dosya düzeni, algoritma, altyapı | ⚙ tech | Ajan karar verir, defterde bildirir, kullanıcı itiraz edebilir |
| Şunu bil | ⓘ info | Kullanıcı okur, tamamlar |
| Araştırma bulgusu, uzun metin | ▤ report | Kullanıcı okur; bulgudan doğan her seçim ayrı ✎ madde olur |
| Kullanıcının yapacağı iş | ☐ task | Adım adım yazılır, sonunda ne getireceği söylenir |

## 1a. Canlı defter: görev boyunca

Defter oturum sonunda doldurulan bir rapor değildir; iş sürerken yaşar. Beş kural:

1. **Yeni görev, soru ya da teknik karar anında deftere girer.** Düşünürken ya da çalışırken ortaya çıkan her madde o an JSON'a eklenir, defter üretilir ve aynı yola yeniden yayınlanır. Sohbette liste yazılmaz, oturum sonuna biriktirilmez.
2. **Hazırladığın her dosya defterde sunulur.** md, PDF, HTML, görsel ya da video ürettiysen ilgili maddeye `ekler` (ya da görsel ve video için `gorseller`) olarak koy. Kullanıcıya dosya yolu verilmez; dosyayı defterin içinde açar, okur, üzerine çizer. Ayrıntı §4.
3. **Görünüşle ilgili soruda kanıt şarttır.** Bir şeyin nasıl göründüğünü soruyorsan, canlıysa çalışan bağlantıyı, değilse ekran görüntüsünü maddeye koy. İkisi de yoksa önce görüntüyü üret (yerel sunucu + Playwright ekran görüntüsü), sonra sor. Üreteç kanıtsız görünüş sorusuna uyarı basar.
4. **Cevaplar görev boyunca okunur.** Her iş kaleminin sonunda, her commit'ten önce ve uzun işte en geç yarım saatte bir `defter/_ozet` okunur (§7); `son` alanı son okumadan yeniyse cevaplar tam okunur (§12). Onaylanan cevap hemen işlenir: karar kaydı, uygulama, maddenin silinmesi, yeniden yayın.
5. **"Bitti" demeden önce defter okunur.** Görevi bitmiş saymadan önce son kez "oku" çalışır (`cevap` ve `defter` koleksiyonları, §12). Cevaplanan maddede yapılacak iş varsa ona başlanır ve döngü tekrarlanır. Cevap gelmemiş ve iş ona bağlıysa durulur: sohbette tek satır "Defterde N madde cevabını bekliyor: `<bağlantı>`", sonra beklenir. Cevaba bağlı olmayan işler sürer.

## 1b. Bütçe dostu kullanım

Defterin maliyeti ajanın bağlamına giren metindir. Sayfanın kendisi büyüktür ama hiç okunmaz; okunan yalnız küçük parçalardır.

| İş | Pahalı yol (yapma) | Ucuz yol |
| --- | --- | --- |
| Madde eklemek, silmek | Kaynak JSON'u okuyup baştan yazmak | `defter-yap.py ekle` / `sil` |
| Maddeleri görmek | JSON'u okumak | `defter-yap.py liste` (madde başına bir satır) |
| Yeniden yayın | Maddeler sayfanın içinde; her turda sayfa değişir, yeni oturumda yayın koca bir farkla reddedilir | Sayfa sabit, maddeler `veri.json`'da; fark çıkmaz |
| Cevap okumak | Belgeleri tek tek okumak | İki koleksiyonu `out_dir`'e listeleyip `defter-yap.py oku` |
| Kılavuz | Bu dosyayı her seferinde baştan okumak | `SKILL.md` yeter; burada yalnız ilgili bölüm |
| Ekran görüntüsü | Çektiği görüntüyü açıp bakmak | Maddeye koymak; yalnız doğrulamak gerekirse bakmak |
| Yayın sıklığı | Her madde için ayrı yayın | Bir iş adımının maddelerini tek yayında toplamak |

#### Şablonu geliştirirken (planlama oturumu)

- **Ortak kabuk:** Merkez ve defter ayrı yapılardır ama aynı kabuğu kullanır (renkler, üst çubuk, menü, ayarlar, kart, ara ve git, odak). Kabuk yalnız şablonda yazılır; `merkez/merkez-yap.py` şablonun stilini ve simgelerini Merkez'e koyar. Kabukta bir şey değişince Merkez yeniden üretilir ve yayınlanır; ortak bir özellik (ör. odak modu, kaydırma) ikisine de eklenir, Merkez'e özgü kurallar `merkez-kalip.html`'de kalır.

Her yeni özellikte bütçe ölçülür ve rapora yazılır: ajanın okuduğu yüzeyler (`SKILL.md` boyutu, `cevap` kaydının boyutu, üretecin çıktısı), sayfanın boyutu ve yeniden yayın farkı. Ajanın okuduğu bir şey büyüyorsa küçültmeden yayınlanmaz. Sayfada kalan özellik (görünüm, tuş, düğme) ajana maliyet getirmez.

Şablon sürümü değiştiğinde sayfa bir kez değişir; o turdaki yayın farkı büyük olabilir. Bu yüzden şablonu yalnız kullanıcının isteğiyle planlama oturumu yükseltir, öteki ajanlar "yükselt" denince yapar.

## 2. Dosyalar

| Dosya | Ne işe yarar | Ajan ne yapar |
| --- | --- | --- |
| `docs/defterler/veri/<ad>.json` | Defterin kaynağı; maddeler burada yaşar | `ekle`, `sil` ile değiştirir, commit eder |
| `<beceri>/defter-yap.py` (projede `scripts/defter-yap.py` yönlendirmesi) | Kaynağı denetler, sayfayı ve veri dosyasını üretir | Çalıştırır |
| `docs/defterler/<ad>.html` ve `<ad>.veri.json` | Üretilen sayfa ve maddeler; yayınlanan şey | Elle düzenlemez, okumaz |
| `<beceri>/karar-defteri.html` | Şablon: görünüm, kayıt, klavye, tema | **Açmaz, kopyalamaz, değiştirmez** |
| `<beceri>/YAZIM-KURALI.md` | Kullanıcıya yazılan her metnin biçim kuralı | Madde yazmadan önce okur |
| `docs/KARARLAR.md` | Verilen kararların tek sayfalık kaydı | Cevap geldikçe işler |

## 3. Yeni defter açmak

```bash
# 1. kaynağı yaz
docs/defterler/veri/site-gizlilik.json

# 2. sayfayı üret: site-gizlilik.html (sabit sayfa) + site-gizlilik.veri.json (maddeler)
python3 scripts/defter-yap.py docs/defterler/veri/site-gizlilik.json docs/defterler/site-gizlilik.html

# 3. artifact olarak yayınla: file_path site-gizlilik.html, capabilities {"db": {}, "assets": {}}
#    files: üretecin bastığı "Artifact files" haritası aynen (veri.json her zaman içindedir)

# sonraki turlar
python3 scripts/defter-yap.py ekle docs/defterler/veri/site-gizlilik.json yeni-madde.json
python3 scripts/defter-yap.py sil  docs/defterler/veri/site-gizlilik.json G3
python3 scripts/defter-yap.py liste docs/defterler/veri/site-gizlilik.json
```

Yerelde tarayıcıda açıp bakmak için `--tek` ile tek dosya üretilir; yayında kullanılmaz.

Üreteç JSON'u denetler: uzun tire varsa durur, yazım kuralına aykırı madde için uyarı basar. Ek ve görsel dosyalarını da denetler: dosya yoksa, yol göreli değilse ya da dosya 15 MB'tan büyükse defteri üretmez. Sonunda yayında `files` olarak verilecek haritayı basar; elle yazma, onu kopyala. Uyarıları düzelt, sonra yayınla.

Yayından sonra sohbette tek satır: "Defter hazır: `<bağlantı>`, N acil madde." Bağlantıyı `docs/DURUM.md`'ye kendi başlığının altına yaz.

Var olan deftere madde eklemek de aynı yoldur: JSON'a ekle, üret, **aynı dosya yoluna** yeniden yayınla. Bağlantı ve cevaplar korunur.

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

## 7. Cevapları okumak ve işlemek

Ne zaman: görev boyunca düzenli olarak ve görevi bitirmeden önce mutlaka (§1a, kural 4 ve 5).

Üç adımda, her adım bir öncekinden ucuz olduğu için sırayla:

1. **Özet.** `read_db` get `defter/_ozet` → `{acik, bitti, senden, taslak, son}`. `son` son okumandan eski değilse tam oku; sayılar sıfır diye durma (şablon 48 ve öncesi tamamlanmamış notu saymaz).
2. **Cevaplar.** `read_db` list collection `cevap`. Her belge incedir, yalnız tamamlanmış maddeler:

```json
{"id": "G1", "q": "Sorunun başlığı", "choice": "a", "label": "Seçenek A",
 "note": "kullanıcının maddeye notu", "steps": [true, false], "gorsel": 1,
 "notlar": [{"ad": "Ana sayfa taslağı", "tur": "resim", "not": "başlık çok büyük"}], "doneAt": "..."}
```

`note` maddenin notudur. `notlar` kullanıcının tam ekranda tek tek dosyalara (ek, görsel, video, PDF, bağlantı) yazdığı notlardır; `ad` hangi dosya olduğunu söyler. Her birini o dosyaya dair geri bildirim olarak işle.

3. **Kullanıcının eklediği maddeler.** `senden` sıfır değilse collection `defter` içinde `UG-` ile başlayan belgeler (`title`, `body`).

`gorsel` yalnız sayıdır: Kullanıcı o maddeye görsel, video ya da PDF eklemiş, belki üzerine çizmiştir. Ajan görselin kendisini açamaz; içeriği gerekiyorsa sohbete yapıştırmasını ister. `defter` koleksiyonunun geri kalanı sayfanın kendi durumudur (sıra, küçültme, çizgiler); ajan okumaz.

Her cevap için sırasıyla:

1. `docs/KARARLAR.md`'ye `tarih | karar | kaynak (defter id)` satırı ekle.
2. Kararı uygula.
3. Maddeyi JSON kaynağından sil; `write_db` batch ile `cevap/<id>` belgelerini sil.
4. Defteri yeniden üret ve yayınla.
5. Sohbette tek satır: "N cevap işlendi: ...".

Silinen madde id'si bir daha kullanılmaz. Fikir değişirse yeni madde açılır.

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

## 10. Her projede ve her bilgisayarda kullanım

Defter kendi reposundadır: `github.com/artcycleco/defter`. Repo bir Claude Code eklenti pazarıdır.

| Nerede | Nasıl gelir |
| --- | --- |
| Bilgisayarındaki Claude Code (terminal, masaüstü) | Eklenti: `claude plugin marketplace add artcycleco/defter`, sonra `claude plugin install defter@artcycle --scope user`. Çağırma `/defter-karar` ya da `/defter:karar` |
| Bulut oturumu (claude.ai/code) | Bulut eklenti kurmaz; projede `.claude/skills/defter-karar/` kopyası olmalı (`kur/projeye-kur.py`) |
| Claude uygulaması sohbeti, Cowork | claude.ai'da Beceriler (Skills) bölümüne `defter` klasörünün zip'i yüklenir |

## 11. "defteri güncelle"

Kullanıcı bir ajana "defteri güncelle" dediğinde:

1. Kaynak repoyu al: `git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter` (varsa `git -C /tmp/defter pull`). Bulutta erişim yoksa repoyu oturuma ekle.
2. Projenin kökünde çalıştır: `python3 /tmp/defter/kur/projeye-kur.py .` Beceri `.claude/skills/defter-karar/` altına kopyalanır, `scripts/defter-yap.py` yönlendirmesi yazılır, eski talimat dosyalarının yerine yönlendirme konur.
3. Yeni `SKILL.md`'yi oku; eski alışkanlıkları bırak.
4. Canlı defterleri "yükselt": kaynak JSON aynı, yeni şablonla üret, aynı bağlantıya yayınla.
5. Commit et; sohbette tek satır "Defter güncellendi: sürüm N".

## 12. Defter Merkezi

Bütün defterlerin tek sayfası: https://github.com/artcycleco/defter#merkez . Kullanıcı bütün defterlerin açık sorularını burada görür ve buradan cevaplar (öneriyi onayla, şık seç, not yaz, Hayır ve nedeni, görevde Yaptım). Defterler, Kararlar (bütün defterlerde arama) ve Arşiv sekmeleri de burada.

Merkez kimsenin defterini okuyamaz: her artifact'ın veritabanı ayrıdır, bir sayfa ötekinin cevabını göremez. Soruları ve son kararları Merkez'e ajan taşır; Merkez'de verilen cevabı da deftere ajan taşır. İkisini `defter-yap.py oku` hazırlar:

```
# 1) defterin cevapları ve Merkez'de bu deftere verilen cevaplar
ArtifactData list   url <defter url>  collection cevap  out_dir .merkez/ham/<ad>
ArtifactData query  url https://github.com/artcycleco/defter#merkez  collection cevap
                    query {"where": [["defter","==","<defter doc_id>"]]}  out_dir .merkez/ham/<ad>-merkez
# 2) oku: değişen cevaplar, Merkez'den gelenler, Merkez satırı
python3 defter-yap.py oku docs/defterler/veri/<ad>.json --url <defter url> \
  --cevap .merkez/ham/<ad> --merkez .merkez/ham/<ad>-merkez --durum "Paket 1 kuruluyor" --proje "artcycle.co · Site"
# 3) çıktının söylediği iki yazma
ArtifactData batch  url <defter url>  writes [{op: set, collection: cevap, doc_id: <id>, file_path: .../aktar/<id>.json}, ...]
ArtifactData update url <Merkez url>  collection defterler  doc_id <defter doc_id>  file_path .../satir.json  if_version <satırın sürümü>
```

- Merkez satırı: `{ad, url, proje, surum, acik, acil, son, durum, maddeler, kararlar}`. `maddeler` açık soruların kısa hâli (başlık, öneri, şıklar, maliyet rozeti, bekleme); `kararlar` son 30 karar.
- Merkez cevabı `cevap/<defter doc_id>__<madde id>`: `{defter, id, q, choice, label, note, sinif, ret, at}`. Deftere `kaynak: "merkez"` ile geçer; sayfa onu Bitti'ye alır, "Merkez'den" rozeti çıkar.
- Merkez'de cevap, ajan bir sonraki okumaya kadar "gönderildi" görünür (kullanıcı geri alabilir); ajan okuyunca "işlendi" olur. Defterde cevaplanan soru Merkez'den ajan okuyunca düşer.
- `.merkez/` klasörü (ham cevaplar, okunan özeti, bekleyenler) git'e girmez.
- Bedeli: okuma başına birkaç yüz token (yalnız işlenmemiş cevap tam basılır; kapatılan bir daha basılmaz), satır yazma 300 ile 600 token.

#### Eşitle (Drive köprüsü, sürüm 47)

Merkez'in üst çubuğundaki iki oklu düğme ve defter menüsündeki "Merkez'le eşitle" ajansız çalışır, token harcamaz:

- Defter, cevap değiştikçe (4 saniye sonra) ve açılışta kullanıcının Drive'ındaki **Defter Esitleme** klasörüne `kd-<defter id>.json` bırakır: açık sorular ve verilen cevaplar. Eski dosya çöpe gider.
- Merkez Eşitle'de (izin verildiyse açılışta da) bu dosyaları okur: cevaplanan sorular düşer, yeni sorular gelir, Merkez'de satırı olmayan defter kendiliğinden katılır. Değişmeyen dosya indirilmez.
- Merkez'de verilen cevaplar `kd-merkez-cevap.json`'a yazılır; defter açılınca ya da eşitlenince onları alır, Bitti'ye "Merkez'den" rozetiyle geçirir ve ajanın okuduğu `cevap` belgesine yazar.
- Gerekenler: Google Drive bağlayıcısı (claude.ai Ayarlar → Bağlayıcılar), sayfanın `mcp` yeteneği (SKILL'deki yayın satırı) ve kaynakta `url`. Her sayfa ilk kullanımda Drive iznini bir kez sorar.
- Ajanın `oku` turu yine çalışır ve aynı satırı yazar; köprü onu gereksiz kılmaz, yalnız kullanıcının beklemesini kaldırır.

Şablon sürümü değişince planlama oturumu `meta/surum` belgesine `{son: N}` yazar; Merkez eski sürümleri buna göre işaretler. `meta/ayar` belgesinde `takvim`: Kullanıcının Terminler takviminin kimliği.

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
| Drive köprüsü | Defter ve Merkez, kullanıcının Drive'ındaki Defter Esitleme klasörü üzerinden ajansız eşitlenir (§12 Eşitle) |
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

