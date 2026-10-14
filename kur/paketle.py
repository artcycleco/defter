#!/usr/bin/env python3
"""claude.ai Beceriler icin zip'ler: defter-karar.zip, defter-arastirma.zip ve defter-senaryo.zip (repo kokunde). Kullanim: python3 kur/paketle.py"""
import pathlib, re, zipfile
KOK = pathlib.Path(__file__).resolve().parent.parent
BEC = KOK / "plugins" / "defter" / "skills"
for ad, zad in (("karar", "defter-karar"), ("arastirma", "defter-arastirma"), ("senaryo", "defter-senaryo")):
    hedef = KOK / (zad + ".zip")
    with zipfile.ZipFile(hedef, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted((BEC / ad).rglob("*")):
            if f.is_file() and "__pycache__" not in f.parts:
                yol = zad + "/" + f.relative_to(BEC / ad).as_posix()
                if f.name == "SKILL.md":
                    z.writestr(yol, re.sub(r"(?m)^name: .*$", "name: " + zad, f.read_text(encoding="utf-8"), count=1))
                else:
                    z.write(f, yol)
    print("[ok] %s (%d KB)" % (hedef.name, hedef.stat().st_size // 1024))
