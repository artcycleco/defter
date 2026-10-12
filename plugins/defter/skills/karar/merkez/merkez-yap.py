#!/usr/bin/env python3
"""Defter Merkezi'ni uretir: merkez-kalip.html + sablonun ortak kabugu -> merkez.html

Merkez ve defter ayri yapilardir ama ayni kabugu kullanir: renkler (Atolye, Kulis), ust cubuk,
menu, ayarlar paneli, kart, palet, odak cubugu. Kabuk yalniz sablonda (karar-defteri.html) yazilir;
bu betik sablonun stilini, logosunu, ust cubuk dugmelerini ve menu simgelerini Merkez'e koyar.
Sablonda ortak bir sey degisince:  python3 merkez/merkez-yap.py  ve merkez.html yeniden yayinlanir.
"""
import io, pathlib, re, sys

KOK = pathlib.Path(__file__).resolve().parent
SABLON = KOK.parent / "karar-defteri.html"


def eleman(html, desen, etiket):
    """desen ile baslayan ilk <etiket ...> ogesini kapanisiyla birlikte doner (ic ice ayni etiket sayilir)."""
    m = re.search(desen, html)
    if not m:
        sys.exit("sablonda bulunamadi: " + desen)
    i = html.rfind("<" + etiket, 0, m.end())
    derin, j = 0, i
    acilis = re.compile(r"<%s[\s>]|</%s>" % (etiket, etiket))
    for t in acilis.finditer(html, i):
        derin += -1 if t.group().startswith("</") else 1
        if derin == 0:
            return html[i:t.end()]
    sys.exit("kapanmayan oge: " + desen)


def main():
    s = io.open(SABLON, encoding="utf-8").read()
    k = io.open(KOK / "merkez-kalip.html", encoding="utf-8").read()
    stil = re.search(r"<style>(.*?)</style>", s, re.S).group(1)
    logo = eleman(s, r'<svg class="diyafram-logo"', "svg").replace('width="26" height="26"', 'width="28" height="28"')
    surum = re.search(r"şablon sürümü: (\d+)", s[:6000]).group(1)
    k = k.replace("{{STIL}}", stil).replace("{{LOGO}}", logo).replace("{{SURUM}}", surum)
    for ad in re.findall(r"\{\{BTN:(\w+)\}\}", k):
        k = k.replace("{{BTN:%s}}" % ad, eleman(s, r'<button[^>]*id="%s"' % ad, "button"))
    nav = s[s.index('<div class="menu-ortu"'):s.index('<div class="ayar-panel"')]
    for ad in re.findall(r"\{\{IKON:(\w+)\}\}", k):
        bas = nav.index('id="merkezLink"' if ad == "merkez" else 'data-git="%s"' % ad)
        ikon = eleman(nav[bas:], r'<i class="ikon"', "i")
        k = k.replace("{{IKON:%s}}" % ad, re.sub(r'<b class="nokta"[^>]*></b>', "", ikon))
    kalan = re.findall(r"\{\{[^}]+\}\}", k)
    if kalan:
        sys.exit("doldurulmadi: " + ", ".join(kalan))
    if "—" in k:
        sys.exit("uzun tire (—) yasak")
    io.open(KOK / "merkez.html", "w", encoding="utf-8").write(k)
    print("yazildi: merkez/merkez.html (%d KB, sablon %s kabugu)" % (len(k) // 1024, surum))


if __name__ == "__main__":
    main()
