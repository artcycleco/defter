---
name: arastirma
description: Araştırma Defteri; kullanıcının tezi, ders metinleri ve akademik kaynak araştırması için silinmez defter. "araştırma defteri", "tez defteri", "kaynak tara", "literatür taraması", "kaynakça", "Claude Science'tan gelen adaylar" dendiğinde ya da akademik bir kaynağı kullanıcıya onaylatman gerektiğinde kullan. Defter sayfası ve üreteç `karar` becerisi (projede `defter-karar`)nden gelir; bu beceri araştırmanın sırasını ve kurallarını verir.
---
> Kaynak: `github.com/artcycleco/defter` (özel repo), `plugins/defter/skills/arastirma/`. Burada düzenleme yapma.

Bu klasördeki dosyalar:

| Dosya | Ne |
| --- | --- |
| `${CLAUDE_SKILL_DIR}/ARASTIRMA-PROTOKOLU.md` | Tarama sırası, kaynak tablosu, künye kuralı, aday kartı, Science köprüsü; işe başlamadan oku |
| `${CLAUDE_SKILL_DIR}/ornek-arastirma.json` | Yeni araştırma defteri için iskelet (silinmez, sayfalar, kaynakça, plan maddesi) |

## Defter nereden

Sayfa, üreteç ve genel kurallar `karar` becerisi (projede `defter-karar`)ndedir. Önce onu oku (`karar` becerisi (projede `defter-karar`)ni çağır ya da `.claude/skills/defter-karar/SKILL.md`). Üreteç şu sırayla aranır:

1. `${CLAUDE_SKILL_DIR}/../karar/defter-yap.py` (eklenti) ya da `${CLAUDE_SKILL_DIR}/../defter-karar/defter-yap.py` (proje kopyası)
2. projede `scripts/defter-yap.py`
3. ikisi de yoksa: `artcycleco/defter` reposunu oturuma ekle, `git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter`, sonra `python3 /tmp/defter/kur/projeye-kur.py .`

## Araştırma defterinin farkı

| Alan | Ne |
| --- | --- |
| `"silinmez": true` | Madde silinmez, tarihle arşive geçer; cevaplar ve kararlar kalır |
| `sayfalar` | Strateji, ders sayfaları, Takvim ve "Yapay zekâ beyanı" okuma sekmeleri |
| `kaynakca` | Onaylanan kaynaklar: `{baslik, yazar, yil, dergi, doi, url, grup, neden, guven, dogrulandi}` |
| Aday kartı | Her aday bir ✎ madde: Kabul, Ret, Sonra, Özet iste (`m: yüksek`) |

## Akış

1. **Plan.** Tarama yapmadan ✎ tarama planı maddesi aç (soru, kaynaklar, anahtar sözcükler, tarih aralığı, hedef sayı, maliyet rozeti). Onay gelmeden tarama yok.
2. **Tarama.** Protokol §2 sırasıyla; künye yalnız dizinden (§3). Tarama sırasında §4a alanlarını topla, sonradan ikinci tarama yapma.
3. **Adaylar.** Her aday bir kart; 10'dan fazlaysa `coklu` grup. Ajanlara kapalı kaynak için kullanıcıya ☐ görev: hangi site, hangi sözcük, ne aranıyor.
4. **Cevap.** Kabul edilen `kaynakca`ya girer, `dogrulandi` tarihiyle; Ret arşive; Özet iste yalnız seçilince yapılır.
5. **Beyan.** Ajanın yaptığı her iş "Yapay zekâ beyanı" sayfasına tarih ve işle yazılır.

## Claude Science

Araştırma Claude Science'ta da yürür; toparlama ve onay bu defterde. Science'taki ajan adayları `aday-kaynaklar.json` olarak Drive'da `Araştırma/aday` klasörüne bırakır (protokol §7); defter ajanı okur, kartları açar, yayınlar. OpenAlex, Semantic Scholar ve CORE anahtarları yalnız Science'ın **Settings → Credentials** bölümünde durur; deftere, repoya ve sohbete yazılmaz. İletişim adresi `ayar.json'daki e-postan`.

## Asla

- Künyeyi elle yazmak ya da tahmin etmek; geri çekilmiş kaynağı (`geri_cekildi`) tezde kullanmak.
- Sayfa numarası olmadan doğrudan alıntı kaydetmek.
- Kişisel bilgiyi, görüşülen kişinin tam adını ya da sergi motorunun tarifini onay almadan deftere ya da metne yazmak.
- Yüksek maliyetli işi (özet, aylık rapor, sunum taslağı) sormadan yapmak; böyle işler sade bir soru olarak maliyetiyle sorulur.
