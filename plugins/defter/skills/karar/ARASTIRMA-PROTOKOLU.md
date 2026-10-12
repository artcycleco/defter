# Araştırma protokolü

Kullanıcı için akademik kaynak araştırması yapan her ajan bu sırayı izler: tez, ders metni, genel akademik araştırma. Araştırma Claude Science'ta yapılır, toparlama ve onay Araştırma Defteri'nde.

## 1. Önce plan, sonra tarama

Taramaya başlamadan defterde ✎ **tarama planı** maddesi açılır; onay gelmeden tarama yapılmaz. Plan şunları söyler:

- araştırma sorusu tek cümle;
- kaynaklar (aşağıdaki sırayla);
- Türkçe ve İngilizce anahtar sözcükler;
- tarih aralığı, hedef kaynak sayısı, dışlama ölçütü;
- maliyet rozeti (`m`): tarama orta, 5 ile 15 bin token.

## 2. Kaynak sırası

Hepsi 2026-10-12'de denendi. "Otomatik" ajanın doğrudan sorguladığı, "tarayıcı" kullanıcının baktığı, ajanın künyeyi işlediği yerdir. Kullanıcı kararı: ajan içine bakabildiği güvenilir kaynağı sormadan ekler; yapay zekâ ajanlarına kapalı siteler de öneri kaynağı olarak listede durur, bir şey çıkarsa ajan kullanıcıyı yönlendirir, kullanıcı elle indirir.

| Sıra | Kaynak | Nasıl | Ne için |
| --- | --- | --- | --- |
| 1 | TR Dizin, Crossref | otomatik (`turkce-literatur-taramasi` becerisi) | Türkçe ve uluslararası hakemli makale, DOI |
| 2 | DergiPark | otomatik, OAI (`dergipark.org.tr/api/public/oai/`) | Türkçe dergiler, yeni sayılar tarihle |
| 3 | OpenAlex, Semantic Scholar, CORE | otomatik, ücretsiz anahtarla (anahtarsız engelleniyor) | atıf ağı, açık erişim, özet |
| 4 | DOAJ, Aperta (TÜBİTAK), OpenAIRE, Zenodo | otomatik | açık erişimli dergi, proje, rapor, üniversite arşivleri |
| 5 | MSGSÜ ve İTÜ açık arşivleri | otomatik (İTÜ OAI), MSGSÜ site | sanat ve tasarım tezleri, makaleler |
| 6 | Europeana, Getty sözlükleri, Art Institute of Chicago, Cleveland Museum | otomatik | müze kayıtları, açık lisanslı görseller, sanat terimleri |
| 7 | Internet Archive | otomatik | eski kitap ve dergiler (telifi düşmüş) |
| 8 | Üniversite açık arşivleri: Bilkent ve Hacettepe (OAI), Dokuz Eylül, Boğaziçi, Sabancı | otomatik ya da site | tezler ve makaleler; OpenAIRE bunların çoğunu zaten toplar |
| 9 | Müze ve kurum araştırmaları: Tate Papers, Museum and Society (OAI), NEMO raporları, ICOM belgeleri, Getty Research Portal, Ars Electronica arşivi | otomatik ya da site | müzecilik, çevrimiçi sergi, dijital sanat |
| 10 | e-flux journal | site | çağdaş sanat eleştirisi; güven sınıfı `basin`, dayanak değil |
| 11 | İSAM, YÖK Tez, SALT Araştırma, Atatürk Kitaplığı, Milli Kütüphane, Toplu Katalog, OATD, PhilPapers, OAPEN, DOAB, Google Books | tarayıcı | Türkçe makale, tez, sanat arşivi, kitap; açık erişimli kitaplar |
| 12 | Ajanlara kapalı: Rhizome ArtBase (dijital sanat arşivi), MuseWeb bildirileri (çevrimiçi müze), Leonardo (MIT, sanat ve teknoloji), arthistoricum.net, Ankara Üniversitesi ve ODTÜ açık arşivleri, Marmara açık erişim, Kültür ve Turizm Bakanlığı yayınları, TÜİK kültür istatistikleri | tarayıcı | ajan adını ve neden önemli olduğunu yazar; kullanıcı bakar, bulduğunu indirir |
| 13 | Üniversite kütüphanesi abonelikleri: JSTOR, EBSCO Art and Architecture Source, Art Full Text, Oxford Art Online (Grove), ProQuest Dissertations, Bloomsbury Design Library | tarayıcı, üniversite girişiyle | sanat tarihi ve kuramının ana dergileri ve sözlükleri |

Arşivler ve tarayıcı kaynakları için kullanıcıya ☐ görev açılır: hangi sitede, hangi arama sözcüğüyle, ne aradığı yazılır. Kullanıcı bulduğunu nota yapıştırır ya da dosyayı ekler, ajan aday kartını kurar.

#### Kimlik

OpenAlex ve Unpaywall isteklerinde iletişim adresi `ayar.json'daki e-postan`. OpenAlex, Semantic Scholar ve CORE anahtarları yalnız Claude Science'ın Settings → Credentials bölümünde durur; deftere, repoya ve sohbete yazılmaz.

#### Güven sınıfı

Her kaynakta `guven`: `hakemli`, `kitap`, `tez`, `rapor`, `arsiv`, `basin`. Basın ve blog yalnız veri (tarih, olay, söz) olur, tezde dayanak olmaz.

## 3. Künye kuralı

- Künye yalnız dizin kaydından gelir; elle yazılmaz, tahmin edilmez.
- DOI varsa doi.org üzerinden çözülür; yoksa "DOI yok" yazılır.
- Başlığı iki dilli gelen kayıtta özgün dil esas alınır.
- TR Dizin konu etiketleri ve toplam sayılar güvenilir değildir (OR eşleşmesi); sayım başlık düzeyinde yapılır.

## 4. Aday kaynak kartı

Her aday bir ✎ madde olur:

- `title`: kaynağın kısa adı;
- `why`: neden ilgili, tek cümle;
- `kaynak`: `{baslik, yazar, yil, dergi, doi, url, grup, erisim}`;
- şıklar: **Kabul**, **Ret**, **Sonra**, **Özet iste** (`m: yüksek` rozetiyle).

Çok aday varsa 10'arlı `coklu` gruplar kullanılır.

## 4a. Tarama sırasında toplananlar (token tasarrufu)

Tetiklenen işler (kullanıcı basınca çalışanlar) ikinci kez araştırma yapmaz; gereken bilgi taramada, kayıt zaten açıkken toplanır. Her `kaynak` şu alanları da taşır, dizin kaydında varsa:

| Alan | Nereden | Ne için |
| --- | --- | --- |
| `openalex` | OpenAlex kaydının kimliği | eşleştirme, aynı kaynak uyarısı |
| `oa_url` | OpenAlex `open_access.oa_url` | açık erişim bağlantısı; düğme gerekmez |
| `refs` | `referenced_works` (kimlik listesi) | atıf ağı; sayfa kendisi çizer |
| `atif` | `cited_by_count` | ağda düğüm büyüklüğü |
| `ilgili` | `related_works` (en çok 10) | benzer kaynak önerisi |
| `ozet` | özet, en çok 600 karakter | atıf bağlamı ve tablo için ön bilgi |
| `yontem`, `bulgu`, `bosluk` | Science okurken birer satır | literatür tablosu |

Kural: bu alanlar tarama sırasında doldurulur, sonradan ayrı bir okuma yapılmaz. Tam metin yalnız kullanıcı "atıf bağlamı" isteyince ve yalnız o kaynak için okunur.

## 5. Cevaba göre

| Cevap | Ne olur |
| --- | --- |
| Kabul | Kaynak defterin `kaynakca` listesine girer (grup ve neden ile) |
| Ret | Madde arşive gider; kaynak silinmez |
| Sonra | Madde açık kalır |
| Özet iste | Önce 2 ya da 3 soruluk ✎ madde (neye odaklanayım); onaydan sonra en çok bir sayfa özet, sayfa numaralarıyla |

## 6. Boşluk ölçümü

Kesişimler tabloyla, gerekirse grafikle (`sayfalar` içinde görsel) sunulur. Toplam sayının yanıltıcı olabileceği yazılır.

## 7. Claude Science köprüsü

- Science'ta çalışan ajan aday kaynakları `aday-kaynaklar.json` olarak kaydeder: yukarıdaki `kaynak` alanlarının listesi (4a'daki alanlar dahil) ve her biri için `neden`.
- Dosya Google Drive'da `Araştırma/aday` klasörüne konur (Drive bağlayıcısı iki yerde de var) ya da kullanıcı sohbete ekler.
- Defter ajanı dosyayı okur, kartları açar, yayınlar. Science tarafında defter HTML olarak açılırsa cevaplar "Claude'a gönder" ile döner.

## 8. Kurallar

- **Doğrulama:** künye dizinden doğrulanınca `dogrulandi: "YYYY-AA-GG"` yazılır.
- **Geri çekilme:** Crossref'te `update-type: retraction` kaydı olan kaynak `geri_cekildi: true` olur; tezde kullanılmaz, kullanıcıya bildirilir.
- **Doğrudan alıntı:** sayfa numarası olmadan alıntı kaydedilmez.
- **Yapay zekâ beyanı:** ajanın çalıştığı her iş (tarama, özet, metin önerisi, düzeltme) Araştırma Defteri'ndeki "Yapay zekâ beyanı" sayfasına tarih, iş ve kullanıcının ne kadar değiştirdiği ile yazılır; enstitü ya da dergi isteyince hazırdır.
- **Görüşme ve kişisel veri:** görüşülen kişinin adı kısaltılır (A. D.), onay formunun alındığı kaydedilir; ses ve tam metin deftere konmaz.
- **İzinler:** etik kurul ve izin işleri `due` ile açılır, Terminler takvimine yazılır.

- Kişisel bilgi (adres, telefon, kimlik, sağlık, aile, para) ve sergi motorunun tarifi deftere ya da metne girmeden önce kullanıcıya sorulur.
- Araştırma Defteri silinmezdir (`"silinmez": true`): kaynak, karar ve cevaplar arşive geçer.
- Görsel, ses ve metin dahil her ekin kaynak satırı olur: kimden, nereden, hangi izinle.
- Aylık özet, kaynak özeti ve sunum taslağı yalnız kullanıcı onaylayınca ya da isteyince yapılır.
