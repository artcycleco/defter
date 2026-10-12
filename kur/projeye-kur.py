#!/usr/bin/env python3
"""Defter becerisini bir projeye kurar ya da gunceller (bulut oturumlari icin sart).

Kullanim:  python3 kur/projeye-kur.py <proje koku>
Yaptigi:   1) <proje>/.claude/skills/defter-karar/ ve arastirma/ = bu reponun beceri klasorlerinin kopyasi
           2) <proje>/scripts/defter-yap.py = ureteç yonlendirmesi (eski komutlar calismaya devam eder)
           3) eski defter dosyalarinin yerine kisa yonlendirme koyar, eski kopyalari siler
"""
import json, pathlib, re, shutil, sys

KAYNAK_REPO = "https://github.com/artcycleco/defter"
KOK = pathlib.Path(__file__).resolve().parent.parent
KANCA = 'python3 "$CLAUDE_PROJECT_DIR/.claude/skills/defter-karar/guncelle.py" --proje 2>/dev/null || python "$CLAUDE_PROJECT_DIR/.claude/skills/defter-karar/guncelle.py" --proje 2>/dev/null || true'
BECERI = KOK / "plugins" / "defter" / "skills" / "karar"
ARASTIRMA = KOK / "plugins" / "defter" / "skills" / "arastirma"

YONLENDIRME_MD = """# Karar defteri taşındı

Defter kendi reposunda: {repo}

Bu projede güncel kopya: `.claude/skills/defter-karar/` (kısa kural `SKILL.md`, ayrıntı `{hedef}`).
Kullanıcı "defteri güncelle" derse: `.claude/skills/defter-karar/KULLANIM.md` §11 adımlarını uygula.
Bu dosyada kural yok; buradan sonrasını okuma.
"""

URETEC = '''#!/usr/bin/env python3
"""Yonlendirme: ureteç .claude/skills/defter-karar/defter-yap.py icinde (kaynak: {repo})."""
import pathlib, runpy, sys
hedef = pathlib.Path(__file__).resolve().parent.parent / ".claude" / "skills" / "defter-karar" / "defter-yap.py"
sys.argv[0] = str(hedef)
runpy.run_path(str(hedef), run_name="__main__")
'''


def ad_duzelt(klasor):
    """Kopyalanan becerinin SKILL.md adini klasor adina esitler (acik surumde proje kopyasi defter-karar olur)."""
    s = klasor / "SKILL.md"
    if s.is_file():
        t = s.read_text(encoding="utf-8")
        t2 = re.sub(r"(?m)^name: .*$", "name: " + klasor.name, t, count=1)
        if t2 != t:
            s.write_text(t2, encoding="utf-8")


def surum():
    m = re.search(r"sürümü: (\d+)", (BECERI / "karar-defteri.html").read_text(encoding="utf-8"))
    return m.group(1) if m else "?"


def kur(proje):
    proje = pathlib.Path(proje).resolve()
    hedef = proje / ".claude" / "skills" / "defter-karar"
    if hedef.exists():
        shutil.rmtree(hedef)
    shutil.copytree(BECERI, hedef)
    ad_duzelt(hedef)
    print("[ok] beceri  -> %s (sablon surumu %s)" % (hedef.relative_to(proje), surum()))
    if ARASTIRMA.is_dir():
        h2 = proje / ".claude" / "skills" / "defter-arastirma"
        if h2.exists():
            shutil.rmtree(h2)
        shutil.copytree(ARASTIRMA, h2)
        ad_duzelt(h2)
        print("[ok] beceri  -> %s (arastirma)" % h2.relative_to(proje))

    (proje / "scripts").mkdir(exist_ok=True)
    (proje / "scripts" / "defter-yap.py").write_text(URETEC.format(repo=KAYNAK_REPO), encoding="utf-8")
    print("[ok] uretec  -> scripts/defter-yap.py (yonlendirme)")

    eski = proje / "docs" / "sablonlar"
    yonlendir = {"KARAR-DEFTERI-KULLANIMI.md": "KULLANIM.md", "YAZIM-KURALI.md": "YAZIM-KURALI.md"}
    for ad, yeni in yonlendir.items():
        p = eski / ad
        if p.exists() and "Karar defteri taşındı" not in p.read_text(encoding="utf-8"):
            p.write_text(YONLENDIRME_MD.format(repo=KAYNAK_REPO, hedef=".claude/skills/defter-karar/" + yeni), encoding="utf-8")
            print("[ok] yonlendirme -> %s" % p.relative_to(proje))
    for p in [eski / "karar-defteri.html", eski / "global", proje / ".claude" / "commands" / "defter.md"]:
        if p.exists():
            shutil.rmtree(p) if p.is_dir() else p.unlink()
            print("[ok] eski kopya silindi: %s" % p.relative_to(proje))
    # oturum basi kancasi: bulutta kopyayi kaynaktan tazeler, eski defterleri haber verir
    ayar = proje / ".claude" / "settings.json"
    try:
        veri = json.loads(ayar.read_text(encoding="utf-8")) if ayar.exists() else {}
    except ValueError:
        veri = None
    if veri is not None:
        komut = KANCA
        ss = veri.setdefault("hooks", {}).setdefault("SessionStart", [])
        if not any("defter/guncelle.py" in h.get("command", "") for g in ss for h in g.get("hooks", [])):
            ss.append({"matcher": "startup|resume", "hooks": [{"type": "command", "command": komut, "timeout": 60}]})
            ayar.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("[ok] kanca   -> .claude/settings.json (SessionStart)")
    else:
        print("[!] .claude/settings.json okunamadi; kancayi elle ekle")
    # defter-yap.py oku: ham cevaplar ve okunan ozeti .merkez/ altinda; git'e girmez
    gi = proje / ".gitignore"
    satirlar = gi.read_text(encoding="utf-8").splitlines() if gi.exists() else []
    if ".merkez/" not in satirlar:
        gi.write_text("\n".join(satirlar + ["# karar defteri: okuma onbellegi", ".merkez/"]) + "\n", encoding="utf-8")
        print("[ok] .gitignore -> .merkez/")
    ps1 = proje / "scripts" / "defter-yukle.ps1"
    if ps1.exists():
        ps1.write_text('Write-Host "Defter tasindi: %s. Bilgisayara kurmak icin o repodaki README (eklenti) ya da kur/kullaniciya-kur.py"\n' % KAYNAK_REPO, encoding="utf-8")
        print("[ok] yonlendirme -> scripts/defter-yukle.ps1")
    print("Sonra: .claude/skills/defter-karar/SKILL.md oku, canli defterleri 'yukselt', commit et.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    kur(sys.argv[1])
