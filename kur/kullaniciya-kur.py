#!/usr/bin/env python3
"""Bilgisayardaki eski defter kopyalarini temizler; istenirse beceriyi kullanici kapsamina kopyalar.

Onerilen yol eklentidir (README). Eklentiyi kurduktan sonra bunu bir kez calistir: eski kopyalar
silinir, iki ayri /defter yuklenmez.
    python3 kur/kullaniciya-kur.py            # yalniz temizle (eklenti kullanilacak)
    python3 kur/kullaniciya-kur.py --kopya    # eklenti yoksa: ~/.claude/skills/defter-karar'a kopyala
Windows'ta python3 yerine python.
"""
import json, pathlib, re, shutil, sys

KOK = pathlib.Path(__file__).resolve().parent.parent
BECERI = KOK / "plugins" / "defter" / "skills" / "karar"
EV = pathlib.Path.home() / ".claude"

BLOK = """## Karar Defteri (kullanıcı ile iletişim yolu)
Kullanıcıya sohbette dağınık soru sorma; soru, teknik karar, rapor, kullanıcının yapacağı işler ve hazırlanan dosyalar **karar defteri** ile gider. Kurallar `karar` becerisi (projede `defter-karar`)nde (eklenti `karar-defteri`, kaynak github.com/artcycleco/defter). "defteri kullan", "defteri oku", "defteri güncelle" dendiğinde o beceriyi çağır.
"""


def main():
    kopya = "--kopya" in sys.argv
    for p in [EV / "commands" / "defter.md", EV / "sablonlar" / "karar-defteri.html", EV / "sablonlar" / "defter-yap.py", EV / "skills" / "defter-karar"]:
        if p.exists():
            shutil.rmtree(p) if p.is_dir() else p.unlink()
            print("[ok] eski kopya silindi: %s" % p)
    if kopya:
        shutil.copytree(BECERI, EV / "skills" / "defter-karar")
        print("[ok] beceri -> %s" % (EV / "skills" / "defter-karar"))
    # eklenti pazarini otomatik guncellemeye al (ayar dosyasina; /plugin ekranina gerek kalmaz)
    ay = EV / "settings.json"
    try:
        veri = json.loads(ay.read_text(encoding="utf-8")) if ay.exists() else {}
        veri.setdefault("extraKnownMarketplaces", {})["artcycle"] = {"source": {"source": "github", "repo": "artcycleco/defter"}, "autoUpdate": True}
        ay.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("[ok] otomatik guncelleme acik (~/.claude/settings.json)")
    except ValueError:
        print("[!] ~/.claude/settings.json okunamadi; /plugin > Marketplaces > otomatik guncelleme")
    cm = EV / "CLAUDE.md"
    metin = cm.read_text(encoding="utf-8") if cm.exists() else ""
    yeni = re.sub(r"## Karar Defteri \(U.*?(?=\n## |\Z)", BLOK.strip() + "\n", metin, flags=re.S) if "## Karar Defteri (U" in metin else (metin.rstrip() + "\n\n" + BLOK)
    cm.parent.mkdir(parents=True, exist_ok=True)
    cm.write_text(yeni, encoding="utf-8")
    print("[ok] ~/.claude/CLAUDE.md defter blogu guncel")
    if not kopya:
        print("Eklenti kurulu degilse: claude plugin marketplace add artcycleco/defter && claude plugin install defter@artcycle --scope user")


if __name__ == "__main__":
    main()
