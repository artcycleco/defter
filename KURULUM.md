# Kurulum: Karar Defteri ve Araştırma Defteri

Bu repoda üç beceri var. Üçü aynı sayfayı (şablon) ve aynı üreteci kullanır; araştırma becerisi tez ve kaynak işinin, senaryo becerisi sahne sahne ilerleyen bir anlatının kurallarını ekler.

| Beceri | Klasör | Zip |
| --- | --- | --- |
| `defter` (Karar Defteri; açık eklentide `karar`) | `plugins/defter/skills/karar/` | `defter-beceri.zip` |
| `arastirma` (Araştırma Defteri) | `plugins/defter/skills/arastirma/` | `arastirma-beceri.zip` |
| `senaryo` (Senaryo Defteri) | `plugins/defter/skills/senaryo/` | `senaryo-beceri.zip` |

Araştırma becerisi tek başına çalışmaz; üreteç ve sayfa `karar` becerisi (projede `defter-karar`)ndedir. Bu yüzden ikisi her yere birlikte yüklenir.

#### Hangi yol nerede

| Nerede çalışıyorsun | Yol |
| --- | --- |
| claude.ai sohbet, Claude uygulaması, Cowork | 1. Eklenti (claude.ai) |
| Bilgisayarda Claude Code | 2. Eklenti (Claude Code) |
| claude.ai/code bulut oturumu | 3. Projeye kopya |
| Claude Science | 4. Science |

Herkese açık eklenti `github.com/artcycleco/defter` reposundadır; adı **Defter**, pazar adı `artcycle`. Komutlar `/defter:karar`, `/defter:arastirma` ve `/defter:senaryo`.

## 1. claude.ai, Claude uygulaması, Cowork: eklenti

Bir kez yapılır; hesaba bağlıdır, bütün sohbetlerde ve uygulamalarda görünür.

1. claude.ai'da **Customize → Plugins → Add → Add marketplace**, adres `artcycleco/defter`.
2. Listeden **Defter**'i kur. **Customize → Skills**'te `karar`, `arastirma` ve `senaryo` görünür.
3. Eski **Karar defteri** eklentisi ya da elle yüklenmiş `defter` zip'i duruyorsa kaldır; iki kopya yan yana durmasın.

Zip yolu (eklenti kuramayan hesaplar için): repo kökündeki iki zip'i **Customize → Skills → Upload skill** ile yükle. Bulut oturumunda zip'in yanındaki dosyalar gelmez; orada 3. yolu kullan.

#### Drive köprüsü (Merkez'le eşitleme)

Şablon 47'den beri defter, cevaplarını ve açık sorularını Google Drive'ındaki **Defter Esitleme** klasörüne bırakır; Merkez oradan okur. Yapay zekâ çalışmaz, token harcanmaz.

1. claude.ai **Ayarlar → Bağlayıcılar** (Connectors) içinde **Google Drive** bağlı olsun.
2. Bir defterde ilk cevabı verdiğinde sayfa Drive izni ister; **İzin ver** de. Bir kez sorulur.
3. Merkez'de üstteki iki oklu **Eşitle** düğmesi bütün defterleri Drive'dan okur.

## 2. Bilgisayarda Claude Code: eklenti

Her bilgisayarda bir kez:

```bash
claude plugin marketplace add artcycleco/defter
claude plugin install defter@artcycle --scope user
```

Güncellemek için: `claude plugin marketplace update artcycle` sonra `claude plugin update defter@artcycle`.

## 3. Bulut oturumu (claude.ai/code): projeye kopya

Bulut oturumu eklenti kurmaz; beceri projenin içinde durmalı. Her proje için bir kez, projenin kökünde:

```bash
git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter
python3 /tmp/defter/kur/projeye-kur.py .
git add .claude scripts/defter-yap.py .gitignore && git commit -m "Karar defteri becerileri"
```

Kurulunca projede şunlar olur:

| Yol | Ne |
| --- | --- |
| `.claude/skills/defter-karar/` | Karar Defteri becerisi (şablon, üreteç, kılavuz) |
| `.claude/skills/defter-arastirma/` | Araştırma becerisi (protokol, örnek defter) |
| `.claude/skills/defter-senaryo/` | Senaryo becerisi (örnek senaryo defteri) |
| `scripts/defter-yap.py` | Üretece kısa yönlendirme |
| `.claude/settings.json` | Oturum başı kancası: kaynakta yeni sürüm varsa kopyayı tazeler |
| `.gitignore` | `.merkez/` (okuma önbelleği git'e girmez) |

Oturum defter reposuna erişemiyorsa kanca sessizce geçer. O oturumda ajana "artcycleco/defter reposunu ekle" demen yeter.

## 4. Claude Science

Science'ta beceriler hesaptan ya da GitHub'dan gelir.

1. Science'ta **Settings → Skills** aç.
2. Ya **Upload** ile iki zip'i yükle (1. bölümdeki gibi), ya da **Import from GitHub** ile `artcycleco/defter` reposunu göster. Repo özel olduğu için GitHub bağlantısı ister.
3. **Settings → Credentials** içine OpenAlex, Semantic Scholar ve CORE anahtarlarını gir. Anahtar başka hiçbir yere yazılmaz: defter, repo, sohbet.
4. İletişim adresi olarak `ayar.json'daki e-postan` kullanılır (OpenAlex, Unpaywall).

Science'taki ajan aday kaynakları Drive'da `Araştırma/aday` klasörüne `aday-kaynaklar.json` olarak bırakır. Araştırma Defteri'nin ajanı bunu okur, kartları açar.

## Yeni defter açmak

| Ne | Ajana söyle |
| --- | --- |
| Karar defteri | "defter aç" ya da "/defter-karar" |
| Araştırma defteri | "araştırma defteri aç"; iskelet `arastirma/ornek-arastirma.json` |
| Senaryo defteri | "senaryo defteri aç"; iskelet `senaryo/ornek-senaryo.json` |
| Cevapları işlet | "defteri oku" |
| Eski defteri yeni şablona taşı | "defteri yükselt" |

Yeni defter ilk yayından sonra Merkez'e satır olarak eklenir; bağlantısı kaynak JSON'a `url` olarak yazılır.

## Bakım (yalnız bu repoda)

Şablon ya da kural değişince zip'ler yeniden üretilir:

```bash
python3 kur/paketle.py
```

`ARASTIRMA-PROTOKOLU.md` tek kaynaktır: `defter/` içindeki düzenlenir, `paketle.py` onu `arastirma/` içine eşitler.
