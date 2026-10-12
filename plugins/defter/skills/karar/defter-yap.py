#!/usr/bin/env python3
"""Karar defteri uretici.

Ajan yalniz JSON yazar; sablon HTML'i hic acmaz, hic kopyalamaz, uretilen sayfayi okumaz.

Uret:    python3 defter-yap.py VERI.json docs/defterler/AD.html
         -> AD.html (sayfa; maddelerin gomulu kopyasi da icinde) + AD.veri.json (maddeler)
         Yayinda ikisi birden gider; sonda basilan "Artifact files" haritasini aynen ver.
         veri.json unutulsa ya da eski kalsa sayfa gomulu kopyayi gosterir (sablon 49).
         --tek  : maddeler sayfanin icinde (tek dosya; yerelde acmak icin)
         --yayinda : ek dosyalari yerelde yoksa hata degil uyari (baska oturumun yayinladigi defteri yukseltirken; dosyalar sunucuda kalir)
Ekle:    python3 defter-yap.py ekle VERI.json MADDE.json   (ya da - ile stdin; nesne ya da liste; ayni id varsa degistirir)
Sil:     python3 defter-yap.py sil VERI.json D31 D32
Liste:   python3 defter-yap.py liste VERI.json            (id, tur, oncelik, baslik; JSON'u okumadan)
Oku:     python3 defter-yap.py oku VERI.json --url DEFTER_URL --cevap KLASOR [--merkez KLASOR] [--durum "kisa durum"] [--proje "ad"]
         KLASOR: defterin "cevap" ve "defter" koleksiyonlarinin ayni out_dir'e ArtifactData list ciktisi
         (KLASOR/cevap/*.json, KLASOR/defter/*.json). "defter" koleksiyonu eski sablonlarin cevaplarini,
         tamamlanmamis notlari (taslak) ve kullanicinin ekledigi maddeleri (UG-) tasir; hep birlikte okunur.
         Islenmemis her cevabi HER okumada tam basar (kapatilana kadar); Merkez'den gelenleri defter icin hazirlar;
         Merkez satirini .merkez/AD/ altina yazar ve yapilacak yazmalari basar. --eski KLASOR eski adidir, hala gecer.
Kapat:   python3 defter-yap.py kapat VERI.json D31 "ne yaptin" [D32 "ne yaptin" ...]
         cevabi islenen maddeyi kaynaktan cikarir (silinmezde arsive) ve karar kaydina ne yaptigini (y) yazar.
         Notlu, sorulu ya da retli cevap "kapat" olmadan maddeden cikarilirsa uretec hata verir.
Sablon:  bu dosyanin yanindaki karar-defteri.html (degismez; kaynak: karar-defteri reposu)
"""
import datetime, html, io, json, re, sys, pathlib

SABLON = pathlib.Path(__file__).resolve().parent / "karar-defteri.html"   # beceri klasorunde, ureteçle yan yana
BAS = '<script type="application/json" id="defter">'
SON = '</script>'


ID_DESEN = re.compile(r"^[A-Za-z0-9_.-]{1,60}$")   # ArtifactData doc_id deseniyle uyumlu
TURLER = {"design", "tech", "info", "report", "task"}
MEDYA_TURLERI = {"resim", "video", "pdf", "html", "metin", "dosya", "paket"}
SUNULAN = {".html", ".css", ".js", ".mjs", ".json", ".txt", ".md", ".csv", ".xml", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico",
           ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".pdf"}
DUZ_METIN = {".py", ".sh", ".ps1", ".toml", ".yaml", ".yml", ".ini", ".cfg", ".ts", ".tsx", ".jsx", ".sql", ".env.example"}
GORSEL_SORU = re.compile(r"g\u00f6r\u00fcn|renk|tasar\u0131m|g\u00f6rsel|ekran|logo|yerle\u015fim|tipografi|yaz\u0131 tipi|font|ikon|d\u00fczen|g\u00f6r\u00fcnt\u00fc", re.I)
YAYIN_SINIR_MB = 15   # Artifact files: ikili dosya basina 15 MB


def medya_turu(url):
    u = url.split("?")[0].split("#")[0].lower()
    if u.endswith(".pdf"):
        return "pdf"
    if u.endswith((".html", ".htm")):
        return "html"
    if u.endswith((".md", ".markdown", ".txt")):
        return "metin"
    if not u.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp")) and re.search(r"\.[a-z0-9]{2,5}$", u):
        return "dosya"
    if u.endswith((".mp4", ".webm", ".mov", ".m4v", ".ogv")):
        return "video"
    return "resim"


def yayin_girdisi(dosya):
    """Artifact files haritasi icin girdi; sunulmayan duz metinler text/plain ile."""
    try:
        yol = str(dosya.resolve().relative_to(pathlib.Path.cwd().resolve()))
    except ValueError:
        yol = str(dosya.resolve())
    if dosya.suffix.lower() in DUZ_METIN:
        return {"from": yol, "contentType": "text/plain"}
    return yol


def medya_denetle(veri, cikti_yolu):
    """gorseller ve ekler: dosya var mi, yol guvenli mi, boyut sinirda mi. Yayin haritasini dondurur."""
    hata, uyari, harita = [], [], {}
    # --yayinda: baska oturumun yayinladigi defteri yukseltirken ek dosyalari yerelde yok ama sunucuda duruyor;
    # eksik dosya hata degil uyari olur ve haritaya girmez (yayinda olan dosya korunur)
    eksik = (lambda m: uyari.append(m + " (yayinda varsayildi)")) if YAYINDA else hata.append
    kok = pathlib.Path(cikti_yolu).resolve().parent
    # okuma sayfalarindaki gorseller: ![ad](ekler/x.png)
    for sf in veri.get("sayfalar") or []:
        for url in re.findall(r"!\[[^\]]*\]\(([^\s)]+)\)", str((sf or {}).get("body", ""))):
            if re.match(r"^[a-z]+:", url, re.I):
                continue
            dosya = kok / url
            if url.startswith("/") or ".." in url.split("/") or not dosya.is_file():
                (eksik if not url.startswith("/") and ".." not in url.split("/") else hata.append)("sayfa %s: gorsel yok ya da yol goreli degil: %s" % ((sf or {}).get("id"), url))
                continue
            harita[url] = yayin_girdisi(dosya)
    for it in veri.get("items", []):
        iid = it.get("id", "?")
        for alan in ("gorseller", "ekler", "karsilastir"):
            liste = it.get(alan) or []
            if not isinstance(liste, list):
                hata.append("%s: %s liste olmali" % (iid, alan))
                continue
            for g in liste:
                url = str((g or {}).get("url", ""))
                if not url:
                    hata.append("%s: %s ogesinde url yok" % (iid, alan))
                    continue
                if alan == "ekler" and url.startswith("https://"):
                    continue   # baglanti eki: dosya yok, yayina gitmez (buyuk uretimler ayri artifact olarak)
                if re.match(r"^[a-z]+:", url, re.I) or url.startswith("/") or ".." in url.split("/"):
                    hata.append("%s: %s yolu goreli olmali (ornek/x.jpg, ekler/rapor.pdf): %s" % (iid, alan, url))
                    continue
                tur = g.get("tur") or medya_turu(url)
                if tur == "paket":
                    dosyalar = g.get("dosyalar") or []
                    if not dosyalar:
                        hata.append("%s: paket ekinde dosyalar listesi yok" % iid)
                    for f in dosyalar:
                        yol = kok / url.rstrip("/") / f
                        if not yol.is_file():
                            eksik("%s: paket dosyasi yok: %s" % (iid, yol))
                            continue
                        harita[url.rstrip("/") + "/" + f] = yayin_girdisi(yol)
                    continue
                if tur not in MEDYA_TURLERI:
                    hata.append("%s: tur %r gecersiz (%s)" % (iid, tur, ", ".join(sorted(MEDYA_TURLERI))))
                if alan == "gorseller" and tur in ("pdf", "html", "metin"):
                    uyari.append("%s: %s gorseller yerine ekler alanina yazilir" % (iid, url))
                dosya = kok / url
                if not dosya.is_file():
                    eksik("%s: dosya yok: %s" % (iid, dosya))
                    continue
                mb = dosya.stat().st_size / 1048576
                if mb > YAYIN_SINIR_MB:
                    hata.append("%s: %s %.1f MB; yayin siniri %d MB. Sikistir ya da ayri artifact olarak yayinla ve baglantisini ekler'e https adresiyle koy" % (iid, url, mb, YAYIN_SINIR_MB))
                if dosya.suffix.lower() not in SUNULAN and dosya.suffix.lower() not in DUZ_METIN:
                    hata.append("%s: %s turu yayinlanamaz (zip, docx gibi); dosyalari ayri koyup paket eki kullan" % (iid, url))
                    continue
                harita[url] = yayin_girdisi(dosya)
        # gorunusle ilgili soruya kanit: ek, gorsel ya da canli baglanti
        if it.get("type") == "design" and GORSEL_SORU.search(str(it.get("title", "")) + " " + str(it.get("why", ""))):
            metin = json.dumps(it, ensure_ascii=False)
            if not (it.get("gorseller") or it.get("ekler") or "https://" in metin or "http://localhost" in metin):
                uyari.append("%s: gorunusle ilgili soru; ekran goruntusu (gorseller) ya da canli baglanti koy" % iid)
    return hata, uyari, harita


def cumle_say(metin):
    return len([c for c in re.split(r"(?<=[.!?])\s+", metin.strip()) if c])


def yapisal(veri):
    """Kural ihlallerini bulur: ağır olanlar hata (liste 1), hafifler uyarı (liste 2)."""
    hata, uyari = [], []
    if not ID_DESEN.match(str(veri.get("id", ""))):
        hata.append("defter id gecersiz: yalniz harf, rakam, _ . - (Turkce harf yok)")
    gorulen = set()
    items = veri.get("items", [])
    sinir = int(veri.get("sinir") or 20)  # kullanici onaylarsa kaynakta "sinir": 30; defter bolunmez
    if len(items) > sinir:
        uyari.append("madde sayisi %d; sinir %d. Asmak gerekiyorsa kullaniciya bir kez sor, onaylarsa kaynaga \"sinir\" yaz" % (len(items), sinir))
    acil = [it for it in items if it.get("priority") == 1]
    if len(acil) > 5:
        uyari.append("%d acil madde; besten cogu acil degildir" % len(acil))
    for sf in veri.get("sayfalar") or []:
        if not (isinstance(sf, dict) and sf.get("id") and sf.get("ad")):
            hata.append("sayfalar: her sayfa {id, ad, body} olmali")
    for k in veri.get("kaynakca") or []:
        if not (isinstance(k, dict) and k.get("baslik")):
            hata.append("kaynakca: her kaynakta en az baslik olmali")
    for it in items:
        iid = str(it.get("id", ""))
        if not ID_DESEN.match(iid):
            hata.append("madde id gecersiz: %r" % iid)
        if iid in gorulen:
            hata.append("madde id tekrar: %s" % iid)
        gorulen.add(iid)
        if it.get("type") not in TURLER:
            hata.append("%s: type %r gecersiz (%s)" % (iid, it.get("type"), ", ".join(sorted(TURLER))))
        if it.get("priority") not in (1, 2, 3):
            hata.append("%s: priority 1, 2 ya da 3 olmali" % iid)
        if not str(it.get("title", "")).strip():
            hata.append("%s: title bos" % iid)
        secenek = it.get("options") or []
        if it.get("type") == "design":
            if not it.get("rec"):
                uyari.append("%s: design maddesinde 'rec' (oneri) yok" % iid)
            if secenek and not it.get("recv"):
                uyari.append("%s: secenekli design maddesinde 'recv' yok" % iid)
        vler = [o.get("v") for o in secenek]
        recv = it.get("recv")
        if recv and secenek and any(v not in vler for v in (recv if isinstance(recv, list) else [recv])):
            hata.append("%s: recv %r seceneklerde yok" % (iid, recv))
        if isinstance(recv, list) and not it.get("coklu"):
            hata.append("%s: recv liste ise madde coklu olmali" % iid)
        if len(secenek) > (10 if it.get("coklu") else 3):
            uyari.append("%s: %d secenek; en fazla %d" % (iid, len(secenek), 10 if it.get("coklu") else 3))
        if it.get("type") == "design" and len(secenek) > 1 and not any(o.get("d") for o in secenek):
            uyari.append("%s: seceneklerde 'd' yok; anlami ya da farki belirsiz sik varsa 'd' yaz (acikla dugmesi)" % iid)
        ter = it.get("terimler")
        if ter is not None:
            if not isinstance(ter, dict) or not all(isinstance(a, str) and isinstance(b, str) and a.strip() and b.strip() for a, b in ter.items()):
                hata.append("%s: terimler {\"terim\": \"tanim\"} olmali" % iid)
            else:
                if len(ter) > 6:
                    uyari.append("%s: %d terim; en fazla 6, gerisini sade yaz" % (iid, len(ter)))
                for a, b in ter.items():
                    if cumle_say(b) > 2:
                        uyari.append("%s: '%s' tanimi %d cumle; en fazla 2" % (iid, a, cumle_say(b)))
        if it.get("risk") not in (None, "dis", "icerik", "geri", "donulmez"):
            hata.append("%s: risk dis, icerik, geri ya da donulmez olmali" % iid)
        if it.get("yerine") is not None and not ID_DESEN.match(str(it.get("yerine"))):
            hata.append("%s: yerine eski maddenin id'si olmali" % iid)
        daci = it.get("daci")
        if daci is not None and not (isinstance(daci, dict) and set(daci) <= {"karar", "danis", "haber"}):
            hata.append("%s: daci {karar, danis, haber} olmali" % iid)
        if it.get("acildi") is not None and not re.match(r"^\d{4}-\d{2}-\d{2}", str(it.get("acildi"))):
            hata.append("%s: acildi tarih olmali (uretici kendisi yazar)" % iid)
        k = it.get("karsilastir")
        if k is not None and (not isinstance(k, list) or len(k) != 2):
            hata.append("%s: karsilastir tam iki gorsel olmali: [{url, ad}, {url, ad}]" % iid)
        why = it.get("why")
        if isinstance(why, str) and cumle_say(why) > 2:
            uyari.append("%s: why %d cumle; en fazla 2" % (iid, cumle_say(why)))
        if it.get("type") == "task" and not it.get("deliver"):
            uyari.append("%s: gorev maddesinde 'deliver' yok" % iid)
    # tekrar soru: yeni madde eskiden sorulmus bir seye benziyorsa ajan once eski karara bakar
    bugun = datetime.date.today().isoformat()
    eskiler = [(str(m.get("id")), kelimeler(m.get("title"))) for m in (veri.get("arsiv") or []) + [x for x in items if x.get("acildi") and str(x.get("acildi"))[:10] < bugun]]
    for it in items:
        if it.get("acildi") and str(it.get("acildi"))[:10] != bugun:
            continue
        k = kelimeler(it.get("title"))
        if len(k) < 3:
            continue
        for eid, ek in eskiler:
            if eid != str(it.get("id")) and len(ek) >= 3 and len(k & ek) / len(k | ek) >= 0.6:
                uyari.append("%s: basligi %s'e cok benziyor; daha once karara baglandiysa sorma, eski karari bildir" % (it.get("id"), eid))
                break
    return hata, uyari


def kelimeler(metin):
    return {w for w in re.findall(r"\w+", str(metin or "").lower()) if len(w) > 2}


def denetle(veri):
    """docs/sablonlar/YAZIM-KURALI.md denetimi; oldurmez, uyarir."""
    uyari = []
    for it in veri["items"]:
        for alan in ("why", "body", "rec", "deliver", "title"):
            metin = it.get(alan)
            if not isinstance(metin, str):
                continue
            for blok in re.split(r"\n\s*\n", metin):
                if blok.lstrip().startswith(("- ", "#### ", "|", "> ")) or re.match(r"^\d+[.)] ", blok.lstrip()):
                    continue
                if len(blok) > 420:
                    uyari.append("%s.%s: paragraf %d karakter; bol (kural 1, 9)" % (it["id"], alan, len(blok)))
                if re.search(r"[a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc.,] - [A-Z\u00c7\u011e\u0130\u00d6\u015e\u00dc*]", blok):
                    uyari.append("%s.%s: satir ici ' - ' ayirici; liste yap (kural 2, 8)" % (it["id"], alan))
                kalin = re.findall(r"\*\*(.+?)\*\*", blok)
                if len(kalin) > 2:
                    uyari.append("%s.%s: paragrafta %d kalin; en fazla 2 (kural 3)" % (it["id"], alan, len(kalin)))
                for k in kalin:
                    if len(k) > 60:
                        uyari.append("%s.%s: kalin parca %d karakter; yalniz terim kalin (kural 3)" % (it["id"], alan, len(k)))
    for u in uyari:
        print("  uyari: " + u)
    if uyari:
        print("  (%d uyari; docs/sablonlar/YAZIM-KURALI.md)" % len(uyari))


def oku(yol):
    return json.loads(io.open(yol, encoding="utf-8").read())


def yaz(yol, veri):
    io.open(yol, "w", encoding="utf-8").write(json.dumps(veri, ensure_ascii=False, indent=1) + "\n")


def ekle(veri_yolu, madde_yolu):
    veri = oku(veri_yolu)
    yeni = json.loads(sys.stdin.read() if madde_yolu == "-" else io.open(madde_yolu, encoding="utf-8").read())
    yeni = yeni if isinstance(yeni, list) else [yeni]
    ids = [str(m.get("id")) for m in yeni]
    veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in ids] + yeni
    yaz(veri_yolu, veri)
    print("eklendi: %s  (toplam %d madde)" % (", ".join(ids), len(veri["items"])))


def sil(veri_yolu, ids):
    veri = oku(veri_yolu)
    once = len(veri["items"])
    if veri.get("silinmez"):
        # silinmez defter (tez gibi): madde kaybolmaz, tarihle arşive geçer
        import datetime
        bugun = datetime.date.today().isoformat()
        giden = [dict(m, arsivAt=bugun) for m in veri["items"] if str(m.get("id")) in ids]
        veri["arsiv"] = (veri.get("arsiv") or []) + giden
        veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in ids]
        yaz(veri_yolu, veri)
        print("arşive alındı: %d madde  (kalan %d, arşivde %d)" % (len(giden), len(veri["items"]), len(veri["arsiv"])))
        return
    veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in ids]
    yaz(veri_yolu, veri)
    print("silindi: %d madde  (kalan %d)" % (once - len(veri["items"]), len(veri["items"])))


def liste(veri_yolu):
    veri = oku(veri_yolu)
    for m in veri["items"]:
        ek = len(m.get("ekler") or []) + len(m.get("gorseller") or [])
        print("%s | %s | %s | %s%s" % (m.get("id"), m.get("type"), m.get("priority"), m.get("title"), ("  [%d dosya]" % ek) if ek else ""))


def _merkez_klasoru(veri_yolu, did):
    return pathlib.Path(veri_yolu).resolve().parent / ".merkez" / str(did)


def _l(c):
    """karar kaydindaki sonuc: secim ve not birlikte (not kaybolmaz)."""
    p = [str(x) for x in (c.get("label"), c.get("note")) if x]
    if c.get("ret"):
        p.append("Hayir: " + str(c["ret"]))
    return _kisa(" · ".join(p) or "tamam", 200)


def _yanit_gerek(c):
    return bool(c.get("note") or c.get("notlar") or c.get("sorular") or c.get("ret") or c.get("sinif") in ("soru", "serbest", "ret"))


def kapanis_denetle(veri, veri_yolu, hata, uyari):
    """Son 'oku'da islenmemis gorunen cevaplar: maddeden cikan notlu cevabin karar kaydinda 'y' (ne yapildi) olmali."""
    yol = _merkez_klasoru(veri_yolu, veri.get("id")) / "bekleyen.json"
    if not yol.is_file():
        return
    try:
        bekleyen = json.loads(yol.read_text(encoding="utf-8"))
    except ValueError:
        return
    simdiki = {str(m.get("id")) for m in veri.get("items") or []}
    kk = {str(k.get("id")): k for k in veri.get("kararlar") or [] if isinstance(k, dict)}
    for iid, b in sorted(bekleyen.items()):
        if (kk.get(iid) or {}).get("y"):
            continue
        if iid.startswith("UG-"):
            uyari.append("%s (kullanicinin ekledigi madde) yanitlanmadi: isle, `kapat` ile ne yaptigini yaz" % iid)
        elif iid in simdiki:
            uyari.append("%s cevaplandi, hala acik: isle ve `kapat %s \"ne yaptin\"`" % (iid, iid))
        elif b.get("yanit_gerek"):
            hata.append("%s maddeden cikti ama notuna, sorusuna ya da retine ne yapildigi yazilmadi: `defter-yap.py kapat VERI.json %s \"ne yaptin\"`" % (iid, iid))


def kapat(veri_yolu, cift):
    if not cift or len(cift) % 2:
        sys.exit('kapat: VERI.json ID "ne yaptin" [ID "ne yaptin" ...]')
    veri = oku(veri_yolu)
    did = str(veri.get("id"))
    ky = _merkez_klasoru(veri_yolu, did) / "cevaplar.json"
    cevaplar = json.loads(ky.read_text(encoding="utf-8")) if ky.is_file() else {}
    kk = {str(k.get("id")): k for k in veri.get("kararlar") or [] if isinstance(k, dict) and k.get("id")}
    maddeler = {str(m.get("id")): m for m in veri["items"]}
    simdi = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    giden, db_sil = [], []
    for iid, y in zip(cift[::2], cift[1::2]):
        c = cevaplar.get(iid) or {}
        m = maddeler.get(iid) or {}
        k = dict(kk.get(iid) or {"id": iid})
        k["t"] = k.get("t") or _kisa(c.get("q") or c.get("title") or m.get("title") or iid, 100)
        if c and not k.get("l"):
            k["l"] = _l(c) if not iid.startswith("UG-") else _kisa(c.get("body") or c.get("title") or "", 200)
        k["at"] = k.get("at") or c.get("doneAt") or c.get("createdAt") or simdi
        k["y"] = _kisa(y, 300)
        kk[iid] = k
        if iid in maddeler:
            giden.append(iid)
        db_sil.append({"op": "delete", "collection": "defter" if iid.startswith("UG-") else "cevap", "doc_id": iid})
    veri["kararlar"] = sorted(kk.values(), key=lambda x: x.get("at", ""), reverse=True)
    if giden:
        if veri.get("silinmez"):
            bugun = datetime.date.today().isoformat()
            veri["arsiv"] = (veri.get("arsiv") or []) + [dict(m, arsivAt=bugun) for m in veri["items"] if str(m.get("id")) in giden]
        veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in giden]
    yaz(veri_yolu, veri)
    print("kapandi: %s  (kalan %d madde)" % (", ".join(cift[::2]), len(veri["items"])))
    print("yapilacak: defterde ArtifactData batch (islenen belgeler silinir):")
    print("  " + json.dumps(db_sil, ensure_ascii=False))


YAYINDA = False


def uret(veri_yolu, cikti_yolu, sablon=SABLON, tek=False):
    veri = json.loads(io.open(veri_yolu, encoding="utf-8").read())
    for alan in ("id", "title", "items"):
        if alan not in veri:
            sys.exit("eksik alan: " + alan)
    # bekleme olcumu: her madde ilk uretildigi gunu tasir (Merkez'de "3 gundur bekliyor")
    simdi = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    damga = [it for it in veri["items"] if not it.get("acildi")]
    for it in damga:
        it["acildi"] = simdi
    if damga:
        yaz(veri_yolu, veri)
    # kisisel ayar (docs/defterler/ayar.json: ad, merkez, eposta): Merkez baglantisi kaynakta yoksa oradan gelir; kaynaga yazilmaz
    if not veri.get("merkez"):
        for d in (pathlib.Path(veri_yolu).resolve().parent, pathlib.Path(veri_yolu).resolve().parent.parent):
            if (d / "ayar.json").is_file():
                try:
                    m = json.loads((d / "ayar.json").read_text(encoding="utf-8")).get("merkez")
                except ValueError:
                    m = None
                if m:
                    veri = dict(veri, merkez=m)
                break
    hata, yapi_uyari = yapisal(veri)
    kapanis_denetle(veri, veri_yolu, hata, yapi_uyari)
    if not veri.get("url"):
        yapi_uyari.append("kaynakta url yok: ilk yayindan sonra defterin baglantisini \"url\" olarak yaz (Merkez'le esitleme onunla tanir)")
    veri = {k: v for k, v in veri.items() if k not in ("arsiv", "kararlar")}  # arşiv ve karar kaydı kaynakta kalır, sayfaya gitmez
    gorunen = json.dumps(veri, ensure_ascii=False, indent=1)
    if "—" in gorunen:
        sys.exit("uzun tire (—) yasak; noktali virgul veya parantez kullan")
    m_hata, m_uyari, harita = medya_denetle(veri, cikti_yolu)
    hata += m_hata
    yapi_uyari += m_uyari
    for u in yapi_uyari:
        print("  uyari: " + u)
    if hata:
        for h_ in hata:
            print("  HATA: " + h_)
        sys.exit("%d yapisal hata; duzeltmeden uretilmez" % len(hata))
    # script etiketini kapatabilecek dizi ve HTML'i bozabilecek karakterler
    gorunen = gorunen.replace("</", "<\\/")

    denetle(veri)

    cikti = pathlib.Path(cikti_yolu)
    veri_dosyasi = cikti.with_name(cikti.stem + ".veri.json")
    cikti.parent.mkdir(parents=True, exist_ok=True)
    if not tek:
        # maddeler veri.json'dan yuklenir; sayfada da gomulu kopyasi durur (sablon 49): ajan veri.json'u
        # yayina vermeyi unutursa ya da eski bir veri.json kalirsa kullanici yine guncel maddeleri gorur.
        # damga: sayfa veri.json'u yalniz kendinden eski degilse kullanir; yoksa gomulu kopyayi gosterir
        veri = dict(veri, uretildi=datetime.datetime.now(datetime.timezone.utc).isoformat())
        io.open(veri_dosyasi, "w", encoding="utf-8").write(json.dumps(veri, ensure_ascii=False, indent=1))
        try:
            harita["veri.json"] = str(veri_dosyasi.resolve().relative_to(pathlib.Path.cwd().resolve()))
        except ValueError:
            harita["veri.json"] = str(veri_dosyasi.resolve())
        gorunen = json.dumps(dict(veri, veri="veri.json"), ensure_ascii=False).replace("</", "<\\/")
    h = io.open(sablon, encoding="utf-8").read()
    i = h.index(BAS)
    j = h.index(SON, i)
    h = h[: i + len(BAS)] + "\n" + gorunen + "\n" + h[j:]
    baslik = html.escape(veri["title"].split(";")[0].strip(), quote=False)
    h = re.sub(r"<title>.*?</title>", lambda m: "<title>" + baslik + "</title>", h, count=1)

    io.open(cikti_yolu, "w", encoding="utf-8").write(h)
    print("yazildi: %s  (%d madde, %d KB)" % (cikti_yolu, len(veri["items"]), len(h) // 1024))
    if harita:
        print("yayin icin Artifact files (aynen ver):")
        print(json.dumps(harita, ensure_ascii=False))


def _belgeler(klasor, koleksiyon="cevap"):
    """ArtifactData out_dir ciktisi: KLASOR/cevap/*.json ya da dogrudan KLASOR/*.json."""
    if not klasor:
        return {}
    k = pathlib.Path(klasor)
    if (k / koleksiyon).is_dir():
        k = k / koleksiyon
    return {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in sorted(k.glob("*.json"))}


def _kisa(metin, n):
    t = re.sub(r"\s+", " ", str(metin or "")).strip()
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def _cevap_metni(c):
    p = []
    if c.get("label") or c.get("choice"):
        p.append("secim: " + str(c.get("label") or c.get("choice")))
    if c.get("note"):
        p.append("not: " + c["note"])
    for k in ("sinif", "ret", "gerekce", "gereksiz", "kesin", "teyit", "bekledi"):
        if c.get(k):
            p.append("%s: %s" % (k, c[k]))
    for n in c.get("notlar") or []:
        p.append("%s: %s" % (n.get("ad"), n.get("not")))
    for q in c.get("sorular") or []:
        p.append("soru: " + str(q.get("q") if isinstance(q, dict) else q))
    if c.get("steps"):
        p.append("adimlar: %d/%d" % (sum(1 for x in c["steps"] if x), len(c["steps"])))
    return " | ".join(p) or "bos tamamlandi"


def oku_komutu(veri_yolu, url, cevap_k, merkez_k=None, durum=None, proje=None, butce=None, eski_k=None):
    """Defteri okur: degisen cevaplar, Merkez'den gelenler, Merkez satiri. Ajan yalniz bunu okur."""
    veri = oku(veri_yolu)
    did = str(veri.get("id"))
    aid = url.rstrip("/").split("/")[-1]
    cik = pathlib.Path(veri_yolu).resolve().parent / ".merkez" / did   # okunan.json: ayni oturumda yalniz degisen okunur
    (cik / "aktar").mkdir(parents=True, exist_ok=True)
    for f in (cik / "aktar").glob("*.json"):
        f.unlink()
    cevap = _belgeler(cevap_k)
    eski_k = eski_k or (cevap_k if (pathlib.Path(cevap_k) / "defter").is_dir() else None)
    merkez = {k.split("__", 1)[1]: v for k, v in _belgeler(merkez_k).items() if k.startswith(aid + "__")}
    maddeler = {str(m.get("id")): m for m in veri["items"]}
    tum = dict({str(m.get("id")): m for m in veri.get("arsiv") or []}, **maddeler)
    # eski sablon: cevap yalniz defter/<id> belgesinde (done:true); cevap belgesi yoksa oradan alinir
    sizden = {}
    for k, d in _belgeler(eski_k, "defter").items():
        if not isinstance(d, dict):
            continue
        if k.startswith("UG-") and d.get("title"):
            sizden[k] = d   # kullanicinin "Ajana madde ekle" ile ekledigi madde
            continue
        if k in maddeler and k not in cevap and not d.get("done") and (str(d.get("note") or "").strip() or d.get("choice")):
            # sablon 48 ve oncesi: tamamlanmamis maddedeki not yalniz burada (taslak)
            t = {"q": _kisa(d.get("q") or maddeler[k].get("title"), 100), "acik": True, "taslak": True}
            if str(d.get("note") or "").strip():
                t["note"] = d["note"]
            if d.get("choice"):
                t["choice"] = d["choice"]
                t["label"] = d.get("label") or str(d["choice"])
            cevap[k] = t
            continue
        if k in maddeler and k not in cevap and d.get("done"):
            c = {"q": _kisa(d.get("q") or maddeler[k].get("title"), 100), "doneAt": d.get("doneAt") or d.get("updatedAt") or ""}
            if d.get("choice") is not None:
                c["choice"] = d["choice"]
                c["label"] = d.get("label") or next((o.get("t") for o in maddeler[k].get("options") or [] if o.get("v") == d["choice"]), str(d["choice"]))
            if d.get("note"):
                c["note"] = d["note"]
            cevap[k] = c   # arşivdeki kararlar da Kararlar'a girer
    # 1) islenmemis cevaplar: maddesi kaynakta duran her cevap HER okumada tam basilir (kapatilana kadar).
    #    Eskiden "okundu" isareti basinca konuyordu; ajanin baglami kapanirsa cevap bir daha gorunmuyordu.
    on_yol = cik / "okunan.json"
    onceki = json.loads(on_yol.read_text(encoding="utf-8")) if on_yol.exists() else {}
    simdi = {k: json.dumps(v, sort_keys=True, ensure_ascii=False) for k, v in cevap.items()}
    kk_once = {str(k.get("id")): k for k in veri.get("kararlar") or [] if isinstance(k, dict)}
    islenmemis = [k for k in cevap if k in maddeler and not cevap[k].get("acik")]
    sorulu = [k for k in cevap if k in maddeler and cevap[k].get("acik") and cevap[k].get("sorular")
              and len(cevap[k]["sorular"]) > len(maddeler[k].get("yanitlar") or [])]
    taslak = [k for k in cevap if k in maddeler and cevap[k].get("taslak") and k not in sorulu]
    kapali = [k for k in cevap if k not in maddeler]
    print("== %s: %d islenmemis cevap, %d yanitsiz soru, %d taslak not, %d senin eklediğin madde; %d cevap zaten kapali"
          % (did, len(islenmemis), len(sorulu), len(taslak), len([k for k in sizden if not (kk_once.get(k) or {}).get("y")]), len(kapali)))
    baslik = lambda k: _kisa(cevap[k].get("q") or (maddeler.get(k) or {}).get("title"), 70)
    for k in sorted(islenmemis, key=lambda x: cevap[x].get("doneAt", "")):
        print("  %s %s %s -> %s" % ("YENI   " if onceki.get(k) != simdi[k] else "BEKLIYOR", k, baslik(k), _cevap_metni(cevap[k])))
    for k in sorulu:
        print("  SORU    %s %s -> %s" % (k, baslik(k), _cevap_metni(cevap[k])))
    for k in taslak:
        if onceki.get(k) != simdi[k]:
            print("  TASLAK  %s %s -> %s  (tamamlanmadi; notu oku, istek ya da soruysa yanitla; secimi Tamamla gelmeden uygulama)" % (k, baslik(k), _cevap_metni(cevap[k])))
        else:
            print("  TASLAK  %s degismedi: %s" % (k, _kisa(cevap[k].get("note") or cevap[k].get("label"), 80)))
    for k, d in sorted(sizden.items()):
        if not (kk_once.get(k) or {}).get("y"):
            print("  SENDEN  %s %s%s" % (k, d.get("title"), (" | " + d["body"]) if d.get("body") else ""))
    tum_id = set(tum) | set(kk_once)
    iki_hafta = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=14)).isoformat()[:19]
    for k in sorted(cevap):
        if k not in tum_id and str(cevap[k].get("doneAt", "")) >= iki_hafta:
            print("  UYARI   %s: bu cevabin maddesi kaynakta yok. Kaynak JSON canli defterden eski olabilir (baska oturum yayinlamis); "
                  "canli veri.json'u Artifact read ile al, karsilastir, sonra uret." % k)
    yapilacak = islenmemis + sorulu + [k for k in sizden if not (kk_once.get(k) or {}).get("y")]
    if yapilacak:
        print("  -> isle, sonra kapat: python3 defter-yap.py kapat %s %s" % (veri_yolu, " ".join('%s "ne yaptin"' % k for k in islenmemis + [k for k in sizden if not (kk_once.get(k) or {}).get("y")])))
        if sorulu:
            print("     soru(lar): maddeye \"yanitlar\" ekle, madde acik kalir: %s" % ", ".join(sorulu))
    # 2) Merkez'den gelen ve defterde henuz olmayan cevaplar: deftere yazilacak
    aktar, celiski = [], []
    for iid, c in sorted(merkez.items()):
        if iid in cevap and not cevap[iid].get("acik") and iid in maddeler:
            d0 = cevap[iid]
            if (d0.get("choice"), d0.get("note")) != (c.get("choice"), c.get("note")) and str(c.get("at", "")) > str(d0.get("doneAt", "")):
                print("  UYARI %s: defterde ve Merkez'de farkli cevap (defter: %s | Merkez, daha yeni: %s). Hangisi gecerli, tek satir teyit sor." % (iid, _cevap_metni(d0), _cevap_metni(c)))
                celiski.append({"id": iid, "defter": _kisa(d0.get("label") or d0.get("note") or "tamam", 80), "merkez": _kisa(c.get("label") or c.get("note") or "tamam", 80)})
        if (iid in cevap and not cevap[iid].get("acik")) or iid not in maddeler:
            continue
        d = {k: c[k] for k in ("q", "choice", "label", "note", "sinif", "ret") if c.get(k)}
        d.update({"doneAt": c.get("at") or datetime.datetime.utcnow().isoformat() + "Z", "kaynak": "merkez"})
        io.open(cik / "aktar" / (iid + ".json"), "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1))
        aktar.append(iid)
        cevap[iid] = d
        print("  %s (Merkez'den) -> %s" % (iid, _cevap_metni(d)))
    # 3) Merkez satiri: acik sorular ve son kararlar
    acik = [m for m in veri["items"] if not m.get("resolved") and (str(m.get("id")) not in cevap or cevap[str(m.get("id"))].get("acik"))]
    def satir(m):
        r = {"id": m["id"], "t": _kisa(m.get("title"), 140), "y": m.get("type"), "p": m.get("priority")}
        for a, b, n in (("why", "w", 320), ("rec", "r", 240)):
            if m.get(a):
                r[b] = _kisa(m[a], n)
        if m.get("body"):
            r["b"] = _kisa(m["body"], 260)
        if m.get("options"):
            r["o"] = [{k: o[k] for k in ("v", "t", "m", "d") if o.get(k)} for o in m["options"]]
            if m.get("recv"):
                r["rv"] = m["recv"]
            if m.get("coklu"):
                r["c"] = True
        if m.get("steps"):
            r["s"] = len(m["steps"])
        for a, b in (("due", "d"), ("risk", "k"), ("acildi", "a")):
            if m.get(a):
                r[b] = m[a]
        return r
    kararlar = sorted(({"id": k, "t": _kisa(v.get("q") or (tum.get(k) or {}).get("title"), 100),
                        "l": _l(v), "at": v.get("doneAt", "")}
                       for k, v in cevap.items() if k in tum and not v.get("acik")), key=lambda x: x["at"], reverse=True)
    # kararlar kaynakta birikir: ajan cevabi sildikten sonra da Merkez'in Kararlar sekmesinde kalir
    eski = {k["id"]: k for k in veri.get("kararlar") or [] if isinstance(k, dict) and k.get("id")}
    for k in kararlar:   # ajanin yazdigi "y" (ne yapildi) korunur
        eski[k["id"]] = dict(k, y=eski[k["id"]]["y"]) if (eski.get(k["id"]) or {}).get("y") else k
    kararlar = sorted(eski.values(), key=lambda x: x.get("at", ""), reverse=True)   # kaynakta sınırsız
    if kararlar != (veri.get("kararlar") or []):
        veri["kararlar"] = kararlar
        yaz(veri_yolu, veri)
    surum = None
    try:
        m_ = re.search(r"\u015fablon s\u00fcr\u00fcm\u00fc: (\d+)", SABLON.read_text(encoding="utf-8")[:6000])
        surum = int(m_.group(1)) if m_ else None
    except OSError:
        pass
    sat = {"ad": veri.get("title", did).split(";")[0].strip(), "url": url, "son": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
           "acik": len(acik), "acil": sum(1 for m in acik if m.get("priority") == 1), "maddeler": [satir(m) for m in acik], "kararlar": kararlar[:200]}
    if celiski:
        sat["celiski"] = celiski
    # haftalık sağlık: son 7 günde kapanan, ortalama bekleme, gereksiz bulunan
    yedi = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat()
    hafta = [v for v in cevap.values() if not v.get("acik") and str(v.get("doneAt", "")) >= yedi[:19]]
    bek = [v["bekledi"] for v in hafta if isinstance(v.get("bekledi"), (int, float))]
    sat["saglik"] = {"kapanan": len(hafta), "ortBekleme": round(sum(bek) / len(bek)) if bek else None,
                     "gereksiz": sum(1 for v in hafta if v.get("gereksiz")), "ret": sum(1 for v in hafta if v.get("ret"))}
    if surum:
        sat["surum"] = surum
    if proje:
        sat["proje"] = proje
    if durum:
        sat["durum"] = _kisa(durum, 160)
    if butce:
        sat["butce"] = _kisa(butce, 80)
    io.open(cik / "satir.json", "w", encoding="utf-8").write(json.dumps(sat, ensure_ascii=False, indent=1))
    io.open(on_yol, "w", encoding="utf-8").write(json.dumps(simdi, ensure_ascii=False))
    # kapat ve uret icin: islenmemis cevaplar ve butun cevaplar (karar kaydina secim, not, tarih buradan gider)
    bek = {k: {"yanit_gerek": _yanit_gerek(cevap[k])} for k in islenmemis}
    bek.update({k: {"yanit_gerek": True} for k in sizden if not (kk_once.get(k) or {}).get("y")})
    io.open(cik / "bekleyen.json", "w", encoding="utf-8").write(json.dumps(bek, ensure_ascii=False))
    io.open(cik / "cevaplar.json", "w", encoding="utf-8").write(json.dumps(dict(sizden, **cevap), ensure_ascii=False))
    print("\nMerkez satiri: %d acik soru, %d karar -> %s" % (len(acik), len(kararlar), cik / "satir.json"))
    print("yapilacak yazmalar:")
    if aktar:
        print("  1) defter (%s) ArtifactData batch, yeni belgeler:" % url)
        print("     " + json.dumps([{"op": "set", "collection": "cevap", "doc_id": i, "file_path": str(cik / "aktar" / (i + ".json"))} for i in aktar], ensure_ascii=False))
    print("  %d) Merkez satiri: ArtifactData update, collection defterler, doc_id %s, file_path %s (if_version: satirin son surumu; satir yoksa set)" % (2 if aktar else 1, aid, cik / "satir.json"))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["ekle"] and len(a) == 3:
        ekle(a[1], a[2])
    elif a[:1] == ["sil"] and len(a) >= 3:
        sil(a[1], a[2:])
    elif a[:1] == ["kapat"] and len(a) >= 4:
        kapat(a[1], a[2:])
    elif a[:1] == ["liste"] and len(a) == 2:
        liste(a[1])
    elif a[:1] == ["oku"] and len(a) >= 2:
        def sec(ad):
            return a[a.index(ad) + 1] if ad in a and a.index(ad) + 1 < len(a) else None
        if not sec("--url") or not sec("--cevap"):
            sys.exit("oku: --url DEFTER_URL ve --cevap KLASOR gerekli")
        oku_komutu(a[1], sec("--url"), sec("--cevap"), sec("--merkez"), sec("--durum"), sec("--proje"), sec("--butce"), sec("--eski"))
    elif len([x for x in a if not x.startswith("--")]) == 2:
        p = [x for x in a if not x.startswith("--")]
        YAYINDA = "--yayinda" in a
        uret(p[0], p[1], tek="--tek" in a)
    else:
        sys.exit(__doc__)
