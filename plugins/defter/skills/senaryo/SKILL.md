---
name: senaryo
description: Senaryo Defteri; film, video, animasyon, sergi kurgusu ya da sahne sahne ilerleyen bir anlatının senaryosunu kullanıcıyla birlikte geliştirmek için. "senaryo defteri", "senaryo yaz", "senaryoyu geliştir", "sahne", "storyboard", "/defter:senaryo" ya da "/defter-senaryo" dendiğinde kullan. Sayfa ve üreteç `karar` becerisi (projede `defter-karar`)nden gelir; bu beceri senaryonun yapısını ve kurallarını verir.
---
> Kaynak: `github.com/artcycleco/defter` (açık repo), `plugins/defter/skills/senaryo/`. Komut: eklentide `/defter:senaryo`, projeye kopyalanmışsa `/defter-senaryo`.

Senaryo defteri bir karar defteridir; ek olarak senaryonun kendisi kaynakta yapılandırılmış durur. Üreteç ondan bir **Senaryo** sekmesi (sayfa yapıyı kendisi çizer) ve indirilecek dosyalar üretir: `senaryo-<sürüm>.md`, `.fountain` (senaryo programları), `-yazdir.html` (PDF için), `.json` (sürüm karşılaştırma). Senaryoyu sen bir kez, sahne sahne yazarsın; tam metni hiçbir turda yeniden yazmaz ve okumazsın.

| Dosya | Ne |
| --- | --- |
| `${CLAUDE_SKILL_DIR}/../karar/SKILL.md` (eklenti) ya da `${CLAUDE_SKILL_DIR}/../defter-karar/SKILL.md` (proje kopyası) | Defterin bütün akışı: açmak, yayın, okuma, kapatma. Önce onu oku. |
| `${CLAUDE_SKILL_DIR}/ornek-senaryo.json` | Yeni senaryo defteri için iskelet |

Üreteç: `defter-yap.py` (defter becerisinin klasöründe ya da projede `scripts/defter-yap.py`).

## Yapı
Kaynak JSON'da `"senaryo"` alanı:

```json
{"ad": "Modern Sanatçının Öyküsü", "surum": "0.1", "tarih": "2026-10-12",
 "bilgi": {"Süre": "60 ile 90 saniye", "Kadraj": "Dikey; finalde yataya açılma [O4]"},
 "logline": "Tek cümle", "ana_fikir": "Bir paragraf",
 "hedef_sure": 90,
 "bolumler": [{"ad": "Bölüm 1 · Sanatçının Öyküsü", "zaman": "0:00 ile 0:30",
   "sahneler": [{"id": "S1", "ad": "Mağara", "sure": 8, "kimler": ["Sanatçı"],
     "alanlar": {"Görüntü": "...", "Ses": "...", "Işık": "...", "Prompt": "cave wall, torch light, 35mm"},
     "kareler": [{"url": "ekler/<id>/s1-a.png", "ad": "Kare 1"}], "bagli": ["O3"]}]}],
 "karakterler": [{"ad": "Sanatçı", "rol": "ana", "gorunus": "...", "motivasyon": "...", "ses": "...", "not": "..."}],
 "gunluk": [{"surum": "0.1", "tarih": "2026-10-12", "ne": "İlk taslak"}]}
```

- Sahne id'si `S` ve sayı; karar maddeleri başka önekle (`O1`, `D1`) ki karışmasın.
- Sahne alanları serbesttir; her sahnede aynı adlar kullanılır (Görüntü, Ses, Işık, Kadraj, Not, Üretim).
- Bir sahne bir karara bağlıysa `bagli`: o maddenin id'si. Senaryo sayfası sahnenin altına "Bağlı karar: [O3]" yazar ve sonda "Açık sorular" tablosunu kendisi kurar; madde kapanınca bağ düşer.
- Metinde `[O3]` yazdığın her yer sayfada tıklanır, maddeye gider.
- `sure` saniye; sayfa üstte zaman çizelgesi ve toplam çıkarır, `hedef_sure`yi (yoksa `bilgi.Süre`deki en büyük sayı) aşınca uyarır.
- Adında "Prompt" geçen alan sayfada kopyalanır kutu olur; okuma modunda ve Fountain metninde görünmez (Fountain'de not).
- `kareler`: senin koyduğun storyboard karesi (`ekler/<id>/`). Kullanıcı başlangıç ve bitiş karesini sayfada kendisi yükler; iğne ve çizimle not koyar.
- `uretim`: sahne başına `{arac, prompt, deneme, secim, at}`; kapalı "Üretim günlüğü" sayfası ve `uretim-gunlugu.md` (yöntem bölümü ve yapay zekâ beyanı için) kendiliğinden çıkar.

## Komutlar (kaynak JSON'u okumadan)
```bash
python3 <üreteç> sahne VERI.json S4 Görüntü "Gece, modern bir oda..."   # bir alanı yaz ya da değiştir ("-" siler)
python3 <üreteç> sahne VERI.json S4 ad "Yeni ateş"                        # sahne adı
python3 <üreteç> sahne VERI.json S4 bagli "O3,O7"                         # bağlı kararlar
python3 <üreteç> sahne-ekle VERI.json 2 S11 "Yeni sahne" --sonra S7       # 2. bölüme, S7'den sonra
python3 <üreteç> goster VERI.json S4                                       # tek sahneyi gör
python3 <üreteç> surum VERI.json 0.2 "O2, O3 ve O4 cevaplarıyla"          # sürüm ve değişiklik günlüğü
python3 <üreteç> sahne VERI.json S4 sure 12                                # süre (sn); kimler "A,B"; kare "ekler/x/s4.png|Kare 1"
python3 <üreteç> sahne-sira VERI.json "S1,S2|S4,S3"                        # kullanıcının önerdiği sıra (| bölüm ayırır)
python3 <üreteç> uretim VERI.json S4 "Runway" "slow pan" 3 "en akıcı"       # üretim günlüğü kaydı
```

## Akış
1. **Aç:** iskeletten başla; logline, bölümler, sahneler (kısa), açık kararlar ✎ madde olarak. Her karar maddesinin `why`'ında hangi sahneyi etkilediğini yaz.
2. **Cevap gelince** ("oku" defter becerisinde): kararı ilgili sahnelere `sahne` komutuyla işle, maddeyi `kapat` ile kapat, sonra `surum` ile sürümü artır (bir turdaki bütün cevaplar tek sürüm). Bir sonraki taslakta ne değiştiğini `surum`un cümlesi söyler; ayrı rapor yazma.
3. **Sayfadan gelenler** (`oku` çıktısında):

| Satır | Ne | Ne yaparsın |
| --- | --- | --- |
| `SAHNE S4 -> not: ...` | Sahnenin altındaki not | Yalnız o sahneyi `goster` ile aç, `sahne` ile değiştir, `kapat VERI.json SN-S4 "ne yaptın"` |
| `... sure: 12 sn (kaynakta 8)`, `kimler: ...` | Kullanıcı süreyi ya da sahnedekileri değiştirdi | Satırdaki `sahne` komutunu çalıştır |
| `... kare Başlangıç karesi [asset a9] \| iğne 1: ...` | Yüklediği kare ve üstündeki notlar | Görmen gerekirse Artifact read `path` = asset id; notu uygula |
| `... uretim: N kayit kaynaga islendi` | Sayfadan girilen üretim kaydı | Hiçbir şey; `oku` kaynağa kendisi işledi |
| `SIRA önerilen sahne sırası` | Sürükleyerek önerdiği sıra | Uygunsa satırdaki `sahne-sira` komutu; değilse ✎ madde aç |

4. **Görsel:** kare, storyboard, kadraj şeması sahnenin `kareler`ine (`sahne S4 kare`) ya da maddenin `ekler`ine; görünüş kararı defter becerisindeki "Görünüş" kuralıyla sorulur.

## Kurallar
- Senaryonun tam metnini maddeye, rapora ya da sohbete kopyalama; Senaryo sekmesi ve md dosyası onu taşır.
- Telif ve izin gerektiren şey (şarkı, alıntı, gerçek kişi) ✎ madde olur ve `risk: "dis"` alır; hukuki görüş verme, kontrol edilmesini söyle.
- Kişisel bilgi ve gerçek kişiler için defter becerisinin onay kuralı geçerlidir.
- Değişiklikler ve Üretim günlüğü sayfaları kapalı durur (token yok); istenince açılır.
- Okuma modu, sürüm karşılaştırma, Fountain ve PDF sayfanın işidir; sen yalnız `surum` ile sürümü artırırsın (her sürümün karşılaştırma dosyası üretilirken yazılır).
