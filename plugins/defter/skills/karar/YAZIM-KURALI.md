# Yazım kuralı; kullanıcıya yazılan her metin

Geçerli olduğu yerler: karar defteri maddeleri (`why`, `body`), sohbet mesajları, `docs/` altındaki raporlar, panel ve site dışı iç yazışma. Sitede ve üründe kullanıcıya görünen metin için projenin kendi metin rehberi varsa o geçerlidir.

## On bir kural

| # | Kural | Neden |
| --- | --- | --- |
| 1 | Bir paragraf bir fikir, en fazla üç cümle | Beş ayrı değişiklik tek paragrafta olunca hiçbiri okunmuyor |
| 2 | Liste paragrafın içine gömülmez | Cümle arasına sıkışan ` - ` ayırıcısı maddeyi görünmez yapar; her madde kendi satırında `- ` ile başlar |
| 3 | Kalın yalnız terim için; paragrafta en fazla iki tane | Cümlenin tamamı kalın olursa vurgu diye bir şey kalmaz |
| 4 | Karşılaştırma, durum ve ölçüm tabloya girer | Üç sütuna sığan şeyi düz yazı ile anlatmak okuyucuya iş yükler |
| 5 | Tablo en fazla üç sütun; ilk sütun kısa etiket | Dört sütun telefonda yatay kayar |
| 6 | Her iki üç paragrafta bir `#### ` ara başlık | Göz nereye döneceğini bilir |
| 7 | Rakam, tarih, dosya yolu cümlenin içinde değil listede | Aranan sayı satır içinde kaybolur |
| 8 | Ayırıcı olarak ` - ` ve uzun tire yok | Noktalı virgül, yeni satır ya da tablo |
| 9 | Metin bloğu sekiz satırı geçerse bölünür | Ekranda duvar görünen metin okunmuyor |
| 10 | Bir metin hakkında soruyorsan metnin kendisini maddeye koy | Ekran görüntüsü metni okunur yapmaz; okuyan kişi cümleyi göremezse karar veremez |
| 11 | Teknik terim ya sade sözle yazılır ya da `terimler`e girer; şıklar anlamı açık değilse `d` taşır | "Tutulma halesi" gibi bir kelimeyi bilmeyen kişi şıklar arasında seçim yapamaz |

Onuncu kural nasıl uygulanır: sorulan cümle, paragraf ya da başlık `> ` alıntı kutusuna girer; iki seçenek karşılaştırılıyorsa **şimdiki** ve **önerilen** iki satırlık tabloya girer. Ekran görüntüsü yalnız yeri göstermek için eklenir, metnin yerine geçmez.

## Kim yapıyor
Her rapor ve bilgi maddesi üç ara başlıkla başlar: **Yaptım**, **Senin işin**, **Soru**. Boşsa "Yok." yazılır. Sohbette en çok üç satır; ayrıntı defterde (SKILL, "Sohbet kısa").

## Sıra

1. Başlık.
2. Üç maddelik özet (varsa).
3. Ayrıntı, ara başlıklarla.
4. En sonda karar gerektirenler; her biri **ayrı defter maddesi** olur, rapor içinde soru sorulmaz.

## Defterde kullanılabilen biçimler

Bu biçimler `why`, `body`, `rec`, `deliver`, seçenek açıklaması ve görev adımlarında çalışır; olağan Markdown yazımı yeter, boş satır şart değildir.

| Yazılışı | Çıkan |
| --- | --- |
| boş satır | yeni paragraf |
| `**kelime**` | kalın (yalnız terim için) |
| `*kelime*` ya da `_kelime_` | italik |
| `` `kod` `` | kod kutusu |
| `[metin](https://...)` | bağlantı |
| `- ` ya da `* ` satır başında | madde listesi; iki boşluk içeri alınan satır iç madde |
| `1. ` satır başında | sıralı liste |
| `> ` satır başında | alıntı kutusu |
| `#` ile `####` arası başlık | ara başlık (`#` ve `##` büyük, gerisi küçük) |
| `\| a \| b \|` satırları | tablo; ikinci satır `\| --- \| --- \|` ise ilk satır başlık olur |
| `---` | ince yatay çizgi |

Üreteç (`defter-yap.py`) defteri üretirken bu kuralları denetler: uzun paragraf, satır içi ` - ` ayırıcı, uzun kalın parça ve fazla kalın için uyarı basar.
