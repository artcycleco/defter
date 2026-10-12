# Kurulum: Karar Defteri ve Araştırma Defteri

Bu repoda iki beceri var. İkisi aynı sayfayı (şablon) ve aynı üreteci kullanır; araştırma becerisi tez ve kaynak işinin kurallarını ekler.

| Beceri | Klasör | Zip |
| --- | --- | --- |
| `defter` (Karar Defteri) | `plugins/defter/skills/karar/` | `defter-beceri.zip` |
| `arastirma` (Araştırma Defteri) | `plugins/defter/skills/arastirma/` | `arastirma-beceri.zip` |

Araştırma becerisi tek başına çalışmaz; üreteç ve sayfa `karar` becerisi (projede `defter-karar`)ndedir. Bu yüzden ikisi her yere birlikte yüklenir.

#### Hangi yol nerede

| Nerede çalışıyorsun | Yol |
| --- | --- |
| claude.ai sohbet, Claude uygulaması, Cowork | 1. Zip yükle |
| Bilgisayarda Claude Code | 2. Eklenti |
| claude.ai/code bulut oturumu | 3. Projeye kopya |
| Claude Science | 4. Science |

## 1. claude.ai, Claude uygulaması, Cowork: zip yükle

Bir kez yapılır; hesaba bağlıdır, bütün sohbetlerde ve uygulamalarda görünür.

1. Zip'leri indir. GitHub'da repo kökünde `defter-beceri.zip` ve `arastirma-beceri.zip`; dosyaya tıkla, sağ üstte indir. Ya da Defter Atölyesi'nde beceri maddesinin ekinden.
2. claude.ai'da sol altta adına tıkla, **Ayarlar** (Settings) aç; **Yetenekler** (Capabilities) bölümünde **Beceriler** (Skills) kısmına in. Yeni arayüzde aynı yer **Customize → Skills** olarak görünebilir.
3. **Beceri yükle** (Upload skill) ile önce `defter-beceri.zip`, sonra `arastirma-beceri.zip` dosyasını seç. Zip'i açma; olduğu gibi yükle.
4. Listede `defter` ve `arastirma` görünür; ikisinin de anahtarı açık olsun.
5. Eski bir `defter` yüklüyse önce onu sil, sonra yenisini yükle; iki kopya yan yana durmasın.

Güncelleme: şablon sürümü artınca yeni zip'i aynı yoldan yükle. Ajan eski beceriyle çalışırsa kendisi fark eder ve sohbette tek satırla haber verir (`guncelle.py --kontrol`).

#### Drive köprüsü (Merkez'le eşitleme)

Şablon 47'den beri defter, cevaplarını ve açık sorularını Google Drive'ındaki **Defter Esitleme** klasörüne bırakır; Merkez oradan okur. Yapay zekâ çalışmaz, token harcanmaz.

1. claude.ai **Ayarlar → Bağlayıcılar** (Connectors) içinde **Google Drive** bağlı olsun.
2. Bir defterde ilk cevabı verdiğinde sayfa Drive izni ister; **İzin ver** de. Bir kez sorulur.
3. Merkez'de üstteki iki oklu **Eşitle** düğmesi bütün defterleri Drive'dan okur.

## 2. Bilgisayarda Claude Code: eklenti

Her bilgisayarda bir kez. Repo özel olduğu için önce GitHub girişi gerekir.

```bash
gh auth login
gh auth setup-git
claude plugin marketplace add artcycleco/defter
claude plugin install defter@artcycle --scope user
```

Eklenti iki beceriyi birlikte getirir: `/defter:karar` ve `/defter:arastirma`. Kısa adla da çağrılır (`/defter-karar`).

Otomatik güncelleme için repoyu bir kez klonlayıp şunu çalıştır; eski kopyaları siler ve pazarı otomatik güncellemeye alır:

```bash
git clone --depth 1 https://github.com/artcycleco/defter ~/karar-defteri
python3 ~/karar-defteri/kur/kullaniciya-kur.py
```

Windows'ta `python3` yerine `python`. Elle güncellemek istersen: `claude plugin update defter@artcycle`.

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
| `scripts/defter-yap.py` | Üretece kısa yönlendirme |
| `.claude/settings.json` | Oturum başı kancası: kaynakta yeni sürüm varsa kopyayı tazeler |
| `.gitignore` | `.merkez/` (okuma önbelleği git'e girmez) |

Oturum karar-defteri reposuna erişemiyorsa kanca sessizce geçer. O oturumda ajana "artcycleco/defter reposunu ekle" demen yeter.

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
| Cevapları işlet | "defteri oku" |
| Eski defteri yeni şablona taşı | "defteri yükselt" |

Yeni defter ilk yayından sonra Merkez'e satır olarak eklenir; bağlantısı kaynak JSON'a `url` olarak yazılır.

## Bakım (yalnız bu repoda)

Şablon ya da kural değişince zip'ler yeniden üretilir:

```bash
python3 kur/paketle.py
```

`ARASTIRMA-PROTOKOLU.md` tek kaynaktır: `defter/` içindeki düzenlenir, `paketle.py` onu `arastirma/` içine eşitler.
