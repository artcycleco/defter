#!/usr/bin/env python3
"""Oturum basi kancasi: defteri guncel tutar, eski defterleri haber verir. Sessizdir; sorun varsa hicbir sey yazmaz.

Iki yerden cagrilir:
  --eklenti  : eklentinin kancasi (bu dosya eklenti klasorunde). Calisilan projede eski bir
               .claude/skills/defter-karar kopyasi varsa onu eklentidekiyle yeniler.
  --proje    : projenin .claude/settings.json kancasi (bulut oturumlari). Kaynak repoda yeni surum
               varsa kopyayi oradan yeniler (git erisimi yoksa sessizce gecer).
Her iki durumda projedeki eski surumlu defterleri sayar ve modele tek satir bildirir.
Ciktinin tamami birkac satir; baglami sisirmez.
"""
import json, os, pathlib, re, shutil, subprocess, sys, tempfile

KAYNAK = "https://github.com/artcycleco/defter"
BURASI = pathlib.Path(__file__).resolve().parent
SURUM_RE = re.compile(r"şablon sürümü: (\d+)")


def surum(dosya):
    try:
        with open(dosya, encoding="utf-8") as f:
            m = SURUM_RE.search(f.read(4000))
        return int(m.group(1)) if m else 0
    except OSError:
        return 0


def proje_koku():
    p = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()).resolve()
    for q in [p] + list(p.parents):
        if (q / ".git").exists() or (q / ".claude").is_dir():
            return q
    return p


def ad_duzelt(klasor):
    """Kopyalanan becerinin SKILL.md adini klasor adina esitler (acik surumde proje kopyasi defter-karar olur)."""
    s = klasor / "SKILL.md"
    if s.is_file():
        t = s.read_text(encoding="utf-8")
        t2 = re.sub(r"(?m)^name: .*$", "name: " + klasor.name, t, count=1)
        if t2 != t:
            s.write_text(t2, encoding="utf-8")


def kopyala(kaynak, hedef):
    if hedef.exists():
        shutil.rmtree(hedef)
    shutil.copytree(kaynak, hedef, ignore=shutil.ignore_patterns("__pycache__"))
    ad_duzelt(hedef)
    # kardes beceri (arastirma) defterle birlikte tasinir
    ka, ha = kaynak.parent / "arastirma", hedef.parent / "defter-arastirma"
    if ka.is_dir() and ka.resolve() != ha.resolve():
        if ha.exists():
            shutil.rmtree(ha)
        shutil.copytree(ka, ha, ignore=shutil.ignore_patterns("__pycache__"))
        ad_duzelt(ha)


def kaynaktan_cek():
    """Kaynak repoyu gecici klasore ceker; olmazsa None."""
    try:
        t = tempfile.mkdtemp(prefix="karar-defteri-")
        subprocess.run(["git", "clone", "--depth", "1", "-q", KAYNAK, t], check=True, timeout=40,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return pathlib.Path(t) / "plugins" / "defter" / "skills" / "karar"
    except Exception:
        return None


def main():
    kip = "--proje" if "--proje" in sys.argv else ("--kontrol" if "--kontrol" in sys.argv else "--eklenti")
    kok = proje_koku()
    kopya = kok / ".claude" / "skills" / "defter-karar"
    satirlar = []
    yeni = surum(BURASI / "karar-defteri.html")

    if kip == "--kontrol":
        # hesaptan yuklenen beceri (bulut, Cowork): kanca calismaz; ajan ilk cagrida bir kez calistirir
        isaret = pathlib.Path(tempfile.gettempdir()) / "karar-defteri-kontrol"
        if isaret.exists():
            return
        isaret.write_text("1")
        kaynak = kaynaktan_cek()
        if not kaynak:
            satirlar.append("Kaynak repoya erisilemedi; artcycleco/defter'yi oturuma ekle (add_repo), sonra bu komutu yeniden calistir. Simdilik eldeki surumle devam et.")
            isaret.unlink()
        else:
            v = surum(kaynak / "karar-defteri.html")
            if v > yeni:
                try:
                    for f in kaynak.iterdir():
                        if f.is_file():
                            shutil.copy2(f, BURASI / f.name)
                    satirlar.append("Hesaptaki beceri %d, guncel %d; bu oturum icin guncellendi, SKILL.md'yi yeniden oku. Kalici olmasi icin kullaniciya tek satir: hesaptaki beceriyi yeni zip'le degistir (Defter Atolyesi, beceri zip eki)." % (yeni, v))
                    yeni = v
                except OSError:
                    satirlar.append("Hesaptaki beceri %d, guncel %d; bu oturumda %s klasorunu kullan ve kullaniciya yeni zip'i yuklemesini soyle." % (yeni, v, kaynak))
            if v <= yeni:   # kopyalandiysa ya da zaten guncelse; kopyalanamadiysa klasor ajana lazim
                shutil.rmtree(kaynak.parents[3], ignore_errors=True)   # gecici klon kalmasin
    elif kip == "--eklenti":
        if kopya.is_dir() and kopya.resolve() != BURASI and surum(kopya / "karar-defteri.html") < yeni:
            eski = surum(kopya / "karar-defteri.html")
            kopyala(BURASI, kopya)
            satirlar.append("Defter kopyasi %d -> %d guncellendi (.claude/skills/defter-karar); degisikligi commit et." % (eski, yeni))
    else:
        # proje kancasi yalniz bulutta (ya da eklenti kurulu degilse) calisir; yerelde eklenti kancasi ayni isi yapar
        ev = pathlib.Path.home() / ".claude" / "plugins"
        eklenti_var = ev.is_dir() and any("defter" in str(p) for p in ev.glob("*/*"))
        if os.environ.get("CLAUDE_CODE_REMOTE") != "true" and eklenti_var:
            return
        kaynak = kaynaktan_cek()
        if kaynak and surum(kaynak / "karar-defteri.html") > yeni:
            eski, yeni = yeni, surum(kaynak / "karar-defteri.html")
            kopyala(kaynak, kopya)
            satirlar.append("Defter kopyasi %d -> %d guncellendi (.claude/skills/defter-karar); degisikligi commit et." % (eski, yeni))
        if kaynak:
            shutil.rmtree(kaynak.parents[3], ignore_errors=True)

    eskiler = []
    for d in kok.glob("docs/defterler/*.html"):
        kaynak_json = kok / "docs" / "defterler" / "veri" / (d.stem + ".json")
        try:
            if kaynak_json.exists() and json.loads(kaynak_json.read_text(encoding="utf-8")).get("kapandi"):
                continue   # kapanmis defter ("kapandi": tarih) yukseltilmez
        except ValueError:
            pass
        v = surum(d)
        if 0 < v < yeni:
            eskiler.append("%s (%d)" % (d.stem, v))
    if eskiler:
        satirlar.append("Bu projede %d defter eski surumde: %s. Isine baslamadan once defter becerisindeki 'yukselt' adimini uygula (kaynak JSON ayni, yeniden uret, ayni baglantiya yayinla)." % (len(eskiler), ", ".join(sorted(eskiler)[:8])))
    if satirlar:
        print("[karar-defteri %d] " % yeni + " ".join(satirlar))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
