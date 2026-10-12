# Karar Defteri

Claude sana sohbette dağınık soru sormaz; soruları, kendi verdiği teknik kararları, raporları ve senin yapacağın işleri tek bir sayfada toplar. Sayfa claude.ai'da özel bir artifact olarak yayınlanır. Sen şıkkı işaretlersin ya da not yazarsın; Claude cevabını sayfanın veritabanından okur ve işine devam eder.

*A decision notebook for Claude: instead of scattering questions across the chat, Claude collects its questions, technical decisions, reports and your to-dos on one page, published as a private claude.ai artifact. You answer by ticking an option or writing a note; Claude reads your answers from the page's database. The interface and the rules are in Turkish for now.*

#### İçinde ne var

| Komut | Ne yapar |
| --- | --- |
| `/defter:karar` (projede `/defter-karar`) | Karar defteri: soru, dosya sunumu, cevap okuma, Defter Merkezi |
| `/defter:arastirma` (projede `/defter-arastirma`) | Araştırma defteri: tez ve akademik kaynak taraması için silinmez defter |

İki noktalı biçim eklentiden gelir (Claude eklenti komutlarını böyle adlandırır); projeye kopyalanan beceride tireli biçim kullanılır.

Bütün defterlerin açık sorularını tek sayfada görmek için **Defter Merkezi** de pakette; ilk kullanımda Claude senin için kendi Merkez'ini yayınlar (aşağıda).

#### Kurulum

| Nerede | Nasıl |
| --- | --- |
| claude.ai, Claude uygulaması, Cowork | Customize → Plugins → Add → Add marketplace → `artcycleco/defter` → Karar Defteri'ni kur |
| Claude Code (bilgisayar) | `claude plugin marketplace add artcycleco/defter` sonra `claude plugin install defter@artcycle` |
| Claude Code bulut oturumu | Bulut oturumu hesaptaki eklentiyi yüklemiyor; becerileri projeye kopyala: `git clone --depth 1 https://github.com/artcycleco/defter /tmp/defter && python3 /tmp/defter/kur/projeye-kur.py .` ve commit et |

Ayrıntı: `KURULUM.md`.

#### İlk kullanım

Claude'a "defter aç" de. İlk seferde adını sorar ve `docs/defterler/ayar.json` dosyasına yazar:

```json
{"ad": "Adın", "merkez": "", "eposta": ""}
```

<a id="merkez"></a>**Defter Merkezi:** "Merkez'i kur" dersen Claude `skills/karar/merkez/merkez-yap.py` ile Merkez sayfanı üretir, yayınlar ve bağlantısını `ayar.json` içine `merkez` olarak yazar. Bundan sonra her defterin menüsündeki Merkez bağlantısı senin Merkez'ine gider.

#### Veri

Cevaplar yalnız defter sayfasının kendi veritabanında durur. İstersen (Google Drive izni verirsen) defter, açık sorularını ve cevaplarını kendi Drive'ındaki "Defter Esitleme" klasörüne küçük bir dosya olarak bırakır; Merkez oradan okur. Başka hiçbir yere veri gitmez.

#### Lisans

MIT. Artcycle LABS & @gurugurs.
