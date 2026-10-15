#!/usr/bin/env python3
"""Karar defteri uretici.

Ajan yalniz JSON yazar; sablon HTML'i hic acmaz, hic kopyalamaz, uretilen sayfayi okumaz.

Uret:    python3 defter-yap.py VERI.json docs/defterler/AD.html
         -> AD.html (ince sayfa: maddeler icinde) + defter-<ozet>.css + defter-<ozet>.js (sablon 51)
         Yayinda sonda basilan "Artifact files" haritasini aynen ver; kod dosyasi degismedikce adi ayni kalir.
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
Goster:  python3 defter-yap.py goster VERI.json D31 [S4]          (tek maddeyi ya da senaryo sahnesini kisa basar)
Senaryo: python3 defter-yap.py sahne VERI.json S4 Alan "metin"      (sahne alani; Alan: ad, bagli, ya da Goruntu, Ses...; "-" siler)
         python3 defter-yap.py sahne-ekle VERI.json BOLUM S11 "Ad" [--sonra S10]
         python3 defter-yap.py surum VERI.json 0.3 "ne degisti"      (senaryo surumu ve degisiklik gunlugu)
         python3 defter-yap.py sahne VERI.json S4 sure 12 | kimler "A,B" | kare "ekler/x/s4.png|Baslangic" (kare: "-" hepsini siler)
         python3 defter-yap.py sahne-sira VERI.json "S1,S2|S4,S3"   (bolum bolum yeni sira; | bolum ayirir)
         python3 defter-yap.py uretim VERI.json S4 "arac" "prompt" DENEME "secim gerekcesi"   (uretim gunlugu kaydi)
Ice al:  python3 defter-yap.py ice-al SAYFA.html VERI.json            (yayindaki sayfanin icindeki maddeleri kaynak JSON'a cikarir)
Yanitla: python3 defter-yap.py yanitla VERI.json D31 "soru" "yanit"   (acik maddeye yanit; madde acik kalir)
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


def secenek_duzelt(veri):
    """Sik baska adla yazildiysa (text, label, ad; ya da duz metin) dogru alana tasir; oneri yalniz harfse sikkin adini yazar.
    Sayfada bos sik cikmasin (eski surumlerde ajan baska ad yazinca siklar bos gorunuyordu)."""
    notlar = []
    for it in veri.get("items") or []:
        if not isinstance(it.get("options"), list):
            continue
        yeni = []
        for i, o in enumerate(it["options"]):
            harf = chr(97 + i)
            if not isinstance(o, dict):
                yeni.append({"v": harf, "t": str(o or "")})
                notlar.append("%s: sik %d duz metin; {v, t} olarak yazildi" % (it.get("id"), i + 1))
                continue
            v = next((o[k] for k in ("v", "id", "value", "key", "deger") if o.get(k) not in (None, "")), harf)
            t = next((o[k] for k in ("t", "text", "label", "ad", "baslik", "title", "name", "secenek") if isinstance(o.get(k), str) and o[k].strip()), "")
            d = next((o[k] for k in ("d", "desc", "description", "aciklama") if isinstance(o.get(k), str) and o[k].strip()), None)
            if (o.get("t") or "") != t or o.get("v") != v:
                notlar.append("%s: sik %d alan adi \"t\"/\"v\" degil; duzeltildi" % (it.get("id"), i + 1))
            n = {k: x for k, x in o.items() if k not in ("id", "value", "key", "deger", "text", "label", "ad", "baslik", "title", "name", "secenek", "desc", "description", "aciklama")}
            n.update({"v": str(v), "t": t})
            if d:
                n["d"] = d
            yeni.append(n)
        it["options"] = yeni
        rec = str(it.get("rec") or "").strip().lower()
        sec = next((o for o in yeni if rec and rec == str(o["v"]).lower()), None)
        if sec and sec["t"]:
            it["rec"] = sec["t"]
            notlar.append("%s: rec yalniz sik harfiydi; onerinin cumlesini yaz" % it.get("id"))
    return notlar


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
        elif sf.get("durum") not in (None, "acik", "kapali"):
            hata.append("sayfalar %s: durum yalniz \"acik\" ya da \"kapali\"" % sf.get("id"))
        elif sf.get("durum") == "kapali" and not sf.get("kosul"):
            uyari.append("sayfalar %s: kapali sayfanin \"kosul\"u yok (ne zaman acilacagini yaz)" % sf.get("id"))
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
        if any(not str(o.get("t") or "").strip() for o in secenek if isinstance(o, dict)):
            hata.append("%s: bos sik var; her sikka \"t\" (gorunen metin) yaz" % iid)
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
    var = {str(m.get("id")): m for m in veri["items"]}
    birles, tam = [], []
    for m in yeni:
        eski = var.get(str(m.get("id")))
        if eski is not None and not m.get("title"):
            # kismi girdi (ornegin yalniz yanitlar): var olan maddeyle birlestirilir, madde silinmez
            eski.update(m)
            birles.append(str(m.get("id")))
        else:
            tam.append(m)
    tam_ids = [str(m.get("id")) for m in tam]
    veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in tam_ids] + tam
    hata = [str(m.get("id")) for m in tam if not (m.get("title") and m.get("type"))]
    if hata:
        sys.exit("ekle: yeni maddede title ve type sart: %s (var olan maddeyi guncellemek icin yalniz degisen alanlari ver)" % ", ".join(hata))
    yaz(veri_yolu, veri)
    print("eklendi: %s%s  (toplam %d madde)" % (", ".join(tam_ids) or "-", ("; birlestirildi: " + ", ".join(birles)) if birles else "", len(veri["items"])))


def goster(veri_yolu, ids):
    """Tek maddeyi kisa basar (kaynak JSON'u butun okumadan): baslik, neden, sik, oneri, govde basi, adimlar."""
    veri = oku(veri_yolu)
    mm = {str(m.get("id")): m for m in veri["items"]}
    for iid in ids:
        m = mm.get(iid)
        if not m:
            b, sh = _sahne_bul(veri.get("senaryo") or {}, iid)
            if sh is None:
                print("%s: yok" % iid)
                continue
            print("%s · %s  (%s)" % (iid, sh.get("ad", ""), b.get("ad", "")))
            for k, v in (sh.get("alanlar") or {}).items():
                print("  %s: %s" % (k, _kisa(v, 300)))
            if sh.get("bagli"):
                print("  bagli: " + ", ".join(sh["bagli"]))
            continue
        print("%s | %s | %s | %s" % (iid, m.get("type"), m.get("priority"), m.get("title")))
        if m.get("why"):
            print("  neden: " + _kisa(m["why"], 300))
        for o in m.get("options") or []:
            print("  %s) %s%s%s" % (o.get("v"), o.get("t"), " [onerin]" if o.get("v") == m.get("recv") or (isinstance(m.get("recv"), list) and o.get("v") in m["recv"]) else "", (" : " + _kisa(o["d"], 160)) if o.get("d") else ""))
        if m.get("rec"):
            print("  oneri: " + _kisa(m["rec"], 200))
        for s in m.get("steps") or []:
            print("  adim: " + (_kisa(" / ".join(str(s.get(k)) for k in ("go", "do", "see") if s.get(k)), 200) if isinstance(s, dict) else _kisa(s, 200)))
        if m.get("deliver"):
            print("  getirecegi: " + _kisa(m["deliver"], 160))
        if m.get("body"):
            print("  govde: " + _kisa(m["body"], 400))
        for y in m.get("yanitlar") or []:
            print("  yanit: %s -> %s" % (_kisa(y.get("q"), 80), _kisa(y.get("a"), 120)))
        if m.get("ekler"):
            print("  ekler: " + ", ".join(e.get("ad") or e.get("url") for e in m["ekler"]))


def yanitla(veri_yolu, iid, soru, cevap):
    """Acik maddeye (SORU ya da TASLAK) yanit ekler; madde acik kalir. Kaynak JSON'u okumadan."""
    veri = oku(veri_yolu)
    m = next((x for x in veri["items"] if str(x.get("id")) == iid), None)
    if m is None:
        sys.exit("yanitla: %s maddesi yok" % iid)
    m.setdefault("yanitlar", []).append({"q": soru, "a": cevap})
    yaz(veri_yolu, veri)
    print("yanitlandi: %s (%d yanit); uret ve yayinla" % (iid, len(m["yanitlar"])))


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


def _senaryo_md(s, maddeler):
    """Yapilandirilmis senaryodan okunur metin: baslik, bilgi tablosu, logline, bolumler, sahneler, acik sorular."""
    sat = ["# " + s.get("ad", "Senaryo"), "", "**Senaryo · sürüm %s%s**" % (s.get("surum", "0.1"), (" · " + s["tarih"]) if s.get("tarih") else ""), ""]
    if s.get("bilgi"):
        sat += ["| | |", "| --- | --- |"] + ["| %s | %s |" % (k, str(v).replace("|", "/")) for k, v in s["bilgi"].items()] + [""]
    for bas, alan in (("Logline", "logline"), ("Ana fikir", "ana_fikir")):
        if s.get(alan):
            sat += ["#### " + bas, "", s[alan], ""]
    acik = {}
    for b in s.get("bolumler") or []:
        sat += ["## " + b.get("ad", "") + ((" (" + b["zaman"] + ")") if b.get("zaman") else ""), ""]
        for sh in b.get("sahneler") or []:
            sat += ["#### %s · %s%s" % (sh.get("id"), sh.get("ad", ""), (" (%s sn)" % sh["sure"]) if sh.get("sure") else ""), ""]
            if sh.get("kimler"):
                sat.append("- **Kimler:** " + ", ".join(sh["kimler"]))
            for k, v in (sh.get("alanlar") or {}).items():
                sat.append("- **%s:** %s" % (k, v))
            bag = [x for x in sh.get("bagli") or [] if x in maddeler]
            if bag:
                sat.append("- **Bağlı karar:** " + ", ".join("[%s]" % x for x in bag))
                for x in bag:
                    acik.setdefault(x, []).append(sh.get("id"))
            sat.append("")
    if s.get("karakterler"):
        sat += ["## Karakterler", ""] + ["- **%s**%s%s" % (k.get("ad"), (", " + k["rol"]) if k.get("rol") else "", "".join("; %s: %s" % (a, k[x]) for x, a in (("gorunus", "görünüş"), ("motivasyon", "motivasyon"), ("ses", "ses"), ("not", "not")) if k.get(x))) for k in s["karakterler"]] + [""]
    if acik:
        sat += ["## Açık sorular", "", "| Madde | Soru | Sahne |", "| --- | --- | --- |"]
        sat += ["| [%s] | %s | %s |" % (x, re.sub(r"^[✎⚙ⓘ▤☐]\s*", "", str(maddeler[x].get("title", ""))).replace("|", "/"), ", ".join(v)) for x, v in acik.items()] + [""]
    return "\n".join(sat).strip() + "\n"


def senaryo_isle(veri, cikti_yolu):
    """senaryo alani varsa: Senaryo ve Degisiklikler sayfalarini uretir, md disa aktarimini ekler klasorune yazar.
    Ajan senaryonun tamamini hic yazmaz ya da okumaz; sahne komutlariyla tek alan degistirir."""
    s = veri.get("senaryo")
    if not isinstance(s, dict):
        return veri, {}
    maddeler = {str(m.get("id")): m for m in veri.get("items") or []}
    kok = pathlib.Path(cikti_yolu).resolve().parent
    sur = re.sub(r"[^\w.-]", "", str(s.get("surum", "0.1")))
    klasor = kok / "ekler" / str(veri["id"])
    klasor.mkdir(parents=True, exist_ok=True)
    harita, dosya = {}, {}
    def yaz_ek(ad, metin, anahtar):
        yol = klasor / ad
        io.open(yol, "w", encoding="utf-8").write(metin)
        goreli = "ekler/%s/%s" % (veri["id"], ad)
        try:
            rel = str(yol.relative_to(pathlib.Path.cwd().resolve()))
        except ValueError:
            rel = str(yol)
        # sunucu .fountain uzantisini tanimaz: duz metin olarak gider (indirilen ad yine .fountain)
        harita[goreli] = {"from": rel, "contentType": "text/plain"} if ad.endswith(".fountain") else rel
        dosya[anahtar] = goreli
    metin = _senaryo_md(s, maddeler)
    yaz_ek("senaryo-%s.md" % sur, metin, "md")
    yaz_ek("senaryo-%s.fountain" % sur, _senaryo_fountain(s), "fountain")
    yaz_ek("senaryo-%s-yazdir.html" % sur, _senaryo_yazdir(s, metin), "yazdir")
    # surum karsilastirma: her surumun sahneleri ayri kucuk dosyada (sayfa iki surumu yan yana koyar)
    yaz_ek("senaryo-%s.json" % sur, json.dumps({"surum": s.get("surum"), "bolumler": [{"ad": b.get("ad"), "sahneler": [{k: sh[k] for k in ("id", "ad", "alanlar", "sure", "kimler") if sh.get(k)} for sh in b.get("sahneler") or []]} for b in s.get("bolumler") or []]}, ensure_ascii=False), "json")
    for b in s.get("bolumler") or []:   # ajanin koydugu kareler (storyboard) yayina gider
        for sh in b.get("sahneler") or []:
            for k in sh.get("kareler") or []:
                u = str(k.get("url", ""))
                if u and not re.match(r"^(https?:|/|data:)", u):
                    if (kok / u).is_file():
                        try:
                            harita[u] = str((kok / u).relative_to(pathlib.Path.cwd().resolve()))
                        except ValueError:
                            harita[u] = str(kok / u)
                    elif not YAYINDA:
                        print("  uyari: %s karesi yok: %s" % (sh.get("id"), u))
    uretimler = [(sh, u) for b in s.get("bolumler") or [] for sh in b.get("sahneler") or [] for u in sh.get("uretim") or []]
    sayfalar = [x for x in veri.get("sayfalar") or [] if x.get("id") not in ("senaryo", "degisiklikler", "uretim")]
    sayfalar.insert(0, {"id": "senaryo", "ad": "Senaryo " + str(s.get("surum", "")), "tur": "senaryo", "body": "[Metni indir (md)](%s)" % dosya["md"]})
    if s.get("gunluk"):
        sayfalar.append({"id": "degisiklikler", "ad": "Değişiklikler", "durum": "kapali", "kosul": "Sürüm geçmişine bakmak istediğinde",
                         "body": "\n".join("- **%s** (%s): %s" % (g.get("surum", ""), g.get("tarih", ""), g.get("ne", "")) for g in reversed(s["gunluk"]))})
    if uretimler:
        ug = ["# Üretim günlüğü: " + str(s.get("ad", "")), "", "| Sahne | Araç | Prompt | Deneme | Seçim gerekçesi |", "| --- | --- | --- | --- | --- |"]
        ug += ["| %s | %s | %s | %s | %s |" % (sh.get("id"), str(u.get("arac", "")).replace("|", "/"), str(u.get("prompt", "")).replace("|", "/").replace("\n", " "), u.get("deneme", ""), str(u.get("secim", "")).replace("|", "/")) for sh, u in uretimler]
        yaz_ek("uretim-gunlugu.md", "\n".join(ug) + "\n", "uretim")
        sayfalar.append({"id": "uretim", "ad": "Üretim günlüğü", "durum": "kapali", "kosul": "Yöntem bölümü ya da yapay zekâ beyanı yazarken",
                         "body": "[Günlüğü indir (md)](%s)\n\n" % dosya["uretim"] + "\n".join(ug[2:])})
    # sayfaya yapilandirilmis senaryo gider; sayfa onu kendisi cizer (not, kare, sure, sira, okuma modu)
    sd = {k: s[k] for k in ("ad", "surum", "tarih", "bilgi", "logline", "ana_fikir", "bolumler", "karakterler", "hedef_sure", "gunluk") if s.get(k)}   # gunluk: baska oturum ice-al ile geri alabilsin
    sd["surumler"] = [str(g.get("surum")) for g in s.get("gunluk") or [] if g.get("surum")]
    sd["dosya"] = dosya
    veri = dict(veri, sayfalar=sayfalar, senaryo=sd)
    return veri, harita


def _senaryo_fountain(s):
    """Fountain: senaristlerin duz metin bicimi (Highland, Fade In, Final Draft ice alir)."""
    sat = ["Title: " + str(s.get("ad", "Senaryo")), "Credit: Senaryo", "Draft date: " + str(s.get("tarih", "")), "Notes: sürüm " + str(s.get("surum", "0.1")), ""]
    if s.get("logline"):
        sat += ["= " + str(s["logline"]).replace("\n", " "), ""]
    for b in s.get("bolumler") or []:
        sat += ["# " + str(b.get("ad", "")), ""]
        for sh in b.get("sahneler") or []:
            sat += [".%s · %s" % (sh.get("id"), str(sh.get("ad", "")).upper()), ""]
            for k, v in (sh.get("alanlar") or {}).items():
                v = str(v).strip()
                if re.search(r"prompt", k, re.I):
                    sat += ["[[%s: %s]]" % (k, v.replace("\n", " ")), ""]
                elif k.lower() in ("görüntü", "goruntu", "anlatı", "anlati", "aksiyon"):
                    sat += [v, ""]
                else:
                    sat += ["%s: %s" % (k.upper(), v), ""]
    return "\n".join(sat).rstrip() + "\n"


def _senaryo_yazdir(s, metin):
    """Yazdirilabilir sayfa: tarayicida acilir, Ctrl+P ile PDF olur."""
    govde = []
    for sat in metin.splitlines():
        t = html.escape(sat)
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
        if sat.startswith("# "):
            govde.append("<h1>%s</h1>" % t[2:])
        elif sat.startswith("## "):
            govde.append("<h2>%s</h2>" % t[3:])
        elif sat.startswith("#### "):
            govde.append("<h3>%s</h3>" % t[5:])
        elif sat.startswith("- "):
            govde.append("<p class='alan'>%s</p>" % t[2:])
        elif sat.startswith("|"):
            if not re.match(r"^\|[\s|:-]+\|$", sat):
                govde.append("<p class='tablo'>%s</p>" % " · ".join(x.strip() for x in t.strip("|").split("|") if x.strip()))
        elif sat.strip():
            govde.append("<p>%s</p>" % t)
    return ("<!doctype html><html lang='tr'><head><meta charset='utf-8'><title>%s</title><style>"
            "@page{margin:2.2cm}body{font:12pt/1.55 'Courier Prime',Courier,monospace;color:#111;max-width:42em;margin:2em auto;padding:0 1em}"
            "h1{font-size:18pt;text-align:center;margin:0 0 1em}h2{font-size:13pt;text-transform:uppercase;border-bottom:1px solid #999;margin:2em 0 .6em}"
            "h3{font-size:12pt;text-transform:uppercase;margin:1.6em 0 .4em;break-after:avoid}p{margin:.35em 0}p.alan{margin-left:2em}"
            "@media print{a{color:inherit}}</style></head><body>%s</body></html>") % (html.escape(str(s.get("ad", "Senaryo"))), "\n".join(govde))


def _sahne_bul(s, sid):
    for b in s.get("bolumler") or []:
        for sh in b.get("sahneler") or []:
            if str(sh.get("id")) == sid:
                return b, sh
    return None, None


def sahne(veri_yolu, sid, alan, metin):
    veri = oku(veri_yolu)
    s = veri.get("senaryo")
    if not isinstance(s, dict):
        sys.exit("sahne: kaynakta senaryo alani yok")
    b, sh = _sahne_bul(s, sid)
    if sh is None:
        sys.exit("sahne: %s yok (yeni sahne icin sahne-ekle)" % sid)
    if alan == "ad":
        sh["ad"] = metin
    elif alan == "bagli":
        sh["bagli"] = [x.strip() for x in metin.split(",") if x.strip()]
    elif alan == "sure":
        if metin == "-":
            sh.pop("sure", None)
        else:
            try:
                sh["sure"] = int(float(metin.replace(",", ".")))
            except ValueError:
                sys.exit("sahne: sure saniye olarak sayi olmali")
    elif alan == "kimler":
        sh["kimler"] = [x.strip() for x in metin.split(",") if x.strip()] if metin != "-" else []
        if not sh["kimler"]:
            sh.pop("kimler")
    elif alan == "kare":
        if metin == "-":
            sh.pop("kareler", None)
        else:
            url, _, ad = metin.partition("|")
            sh.setdefault("kareler", []).append(dict({"url": url.strip()}, **({"ad": ad.strip()} if ad.strip() else {})))
    elif metin == "-":
        (sh.get("alanlar") or {}).pop(alan, None)
    else:
        sh.setdefault("alanlar", {})[alan] = metin
    yaz(veri_yolu, veri)
    print("sahne %s: %s guncellendi" % (sid, alan))


def sahne_ekle(veri_yolu, bolum, sid, ad, sonra=None):
    veri = oku(veri_yolu)
    s = veri.setdefault("senaryo", {"ad": veri.get("title", "Senaryo").split(";")[0], "surum": "0.1", "bolumler": []})
    if _sahne_bul(s, sid)[1] is not None:
        sys.exit("sahne-ekle: %s zaten var" % sid)
    bl = s.setdefault("bolumler", [])
    i = int(bolum) - 1
    while len(bl) <= i:
        bl.append({"ad": "Bölüm %d" % (len(bl) + 1), "sahneler": []})
    sh = bl[i].setdefault("sahneler", [])
    yeni = {"id": sid, "ad": ad, "alanlar": {}}
    k = next((j + 1 for j, x in enumerate(sh) if str(x.get("id")) == sonra), len(sh)) if sonra else len(sh)
    sh.insert(k, yeni)
    yaz(veri_yolu, veri)
    print("sahne eklendi: %s (bolum %s, %d. sira)" % (sid, bolum, k + 1))


def sahne_sira(veri_yolu, dizi):
    """kullanıcının sayfada surukleyerek onerdigi sirayi uygular: "S1,S2|S4,S3" (| bolum ayirir)."""
    veri = oku(veri_yolu)
    s = veri.get("senaryo")
    if not isinstance(s, dict):
        sys.exit("sahne-sira: kaynakta senaryo alani yok")
    bl = s.get("bolumler") or []
    hepsi = {str(sh.get("id")): sh for b in bl for sh in b.get("sahneler") or []}
    yeni = [[x.strip() for x in parca.split(",") if x.strip()] for parca in dizi.split("|")]
    duz = [x for p in yeni for x in p]
    if sorted(duz) != sorted(hepsi) or len(set(duz)) != len(duz):
        sys.exit("sahne-sira: her sahne tam bir kez olmali (eksik: %s, fazla: %s)" % (", ".join(sorted(set(hepsi) - set(duz))) or "-", ", ".join(sorted(set(duz) - set(hepsi))) or "-"))
    if len(yeni) != len(bl):
        sys.exit("sahne-sira: %d bolum var, %d grup verildi" % (len(bl), len(yeni)))
    for b, p in zip(bl, yeni):
        b["sahneler"] = [hepsi[x] for x in p]
    yaz(veri_yolu, veri)
    print("sahne sirasi: " + " | ".join(",".join(p) for p in yeni))


def uretim(veri_yolu, sid, arac, prompt, deneme, secim):
    veri = oku(veri_yolu)
    s = veri.get("senaryo")
    _, sh = _sahne_bul(s or {}, sid)
    if sh is None:
        sys.exit("uretim: %s yok" % sid)
    k = {"arac": arac, "prompt": prompt, "secim": secim, "at": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")}
    if str(deneme).strip() and str(deneme) != "-":
        k["deneme"] = deneme
    sh.setdefault("uretim", []).append(k)
    yaz(veri_yolu, veri)
    print("uretim kaydi: %s (%d kayit)" % (sid, len(sh["uretim"])))


def surum(veri_yolu, no, ne):
    veri = oku(veri_yolu)
    s = veri.get("senaryo")
    if not isinstance(s, dict):
        sys.exit("surum: kaynakta senaryo alani yok")
    bugun = datetime.date.today().isoformat()
    s["surum"], s["tarih"] = str(no), bugun
    s.setdefault("gunluk", []).append({"surum": str(no), "tarih": bugun, "ne": _kisa(ne, 300)})
    yaz(veri_yolu, veri)
    print("senaryo surumu %s (%s)" % (no, bugun))


def ice_al(sayfa_yolu, veri_yolu):
    """Yayindaki sayfadan maddeleri kaynak JSON'a cikarir (sohbet ortaminda kaynak yoksa ya da eski defter yukseltilirken)."""
    t = io.open(sayfa_yolu, encoding="utf-8").read()
    m = re.search(r'<script type="application/json" id="defter">\s*(.*?)\s*</script>', t, re.S)
    if not m:
        sys.exit("ice-al: sayfada defter verisi yok")
    v = json.loads(m.group(1).replace("<\\/", "</"))
    if v.get("veri") and not v.get("items"):
        sys.exit("ice-al: bu sayfa maddeleri ayri dosyada tutuyor (%s); o dosyayi Artifact read ile al, kaynak olarak kullan" % v["veri"])
    for k in ("veri", "uretildi", "merkez", "repo", "dal"):
        v.pop(k, None)
    if isinstance(v.get("senaryo"), dict):   # sablon 55: sayfadaki senaryo uretilmis alanlar tasir; kaynaga yalniz yapi doner
        for k in ("surumler", "dosya"):
            v["senaryo"].pop(k, None)
        v["sayfalar"] = [x for x in v.get("sayfalar") or [] if x.get("id") not in ("senaryo", "degisiklikler", "uretim")]
        if not v["sayfalar"]:
            v.pop("sayfalar")
    if pathlib.Path(veri_yolu).exists():
        sys.exit("ice-al: %s zaten var; ustune yazmam" % veri_yolu)
    pathlib.Path(veri_yolu).parent.mkdir(parents=True, exist_ok=True)
    yaz(veri_yolu, v)
    print("ice alindi: %s (%d madde)" % (veri_yolu, len(v.get("items") or [])))


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
    giden = []
    for iid, y in zip(cift[::2], cift[1::2]):
        c = cevaplar.get(iid) or {}
        m = maddeler.get(iid) or {}
        k = dict(kk.get(iid) or {"id": iid})
        k["t"] = k.get("t") or _kisa(c.get("q") or c.get("title") or m.get("title") or iid, 100)
        if c and not k.get("l"):
            k["l"] = _l(c) if not iid.startswith("UG-") else _kisa(c.get("body") or c.get("title") or "", 200)
        k["at"] = (c.get("doneAt") or simdi) if iid.startswith("SN-") else (k.get("at") or c.get("doneAt") or c.get("createdAt") or simdi)
        k["y"] = _kisa(y, 300)
        kk[iid] = k
        if iid in maddeler:
            giden.append(iid)
    veri["kararlar"] = sorted(kk.values(), key=lambda x: x.get("at", ""), reverse=True)
    if giden:
        if veri.get("silinmez"):
            bugun = datetime.date.today().isoformat()
            veri["arsiv"] = (veri.get("arsiv") or []) + [dict(m, arsivAt=bugun) for m in veri["items"] if str(m.get("id")) in giden]
        veri["items"] = [m for m in veri["items"] if str(m.get("id")) not in giden]
    yaz(veri_yolu, veri)
    print("kapandi: %s  (kalan %d madde)" % (", ".join(cift[::2]), len(veri["items"])))
    # belgeler veritabaninda kalir: karar kaydindaki y, oku'nun onlari bir daha basmamasina yeter (silme gerekmez)


YAYINDA = False
BETIK = pathlib.Path(__file__).resolve()


def _ayar(veri_yolu):
    for d in (pathlib.Path(veri_yolu).resolve().parent, pathlib.Path(veri_yolu).resolve().parent.parent):
        if (d / "ayar.json").is_file():
            try:
                return json.loads((d / "ayar.json").read_text(encoding="utf-8"))
            except ValueError:
                return {}
    return {}


def _depo(veri_yolu):
    """ayar.json'daki repo ya da git uzak adresinden (owner/repo, varsayilan dal)."""
    import subprocess
    ay = _ayar(veri_yolu)
    if ay.get("repo"):
        return ay["repo"], ay.get("dal") or "main"
    kok = pathlib.Path(veri_yolu).resolve().parent
    try:
        u = subprocess.run(["git", "-C", str(kok), "config", "--get", "remote.origin.url"], capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        return None
    m = re.search(r"[:/]([\w.-]+)/([\w.-]+?)(?:\.git)?/?$", u)
    if not m:
        return None
    dal = "main"
    try:
        s = subprocess.run(["git", "-C", str(kok), "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], capture_output=True, text=True, timeout=5).stdout.strip()
        if s.startswith("origin/"):
            dal = s.split("/", 1)[1]
    except Exception:
        pass
    return "%s/%s" % (m.group(1), m.group(2)), dal


def _gitignore():
    """.merkez/ (okuma onbellegi) git'e girmesin: proje kokunde .gitignore'a eklenir."""
    kok = pathlib.Path.cwd()
    if not (kok / ".git").exists():
        return
    g = kok / ".gitignore"
    t = g.read_text(encoding="utf-8") if g.exists() else ""
    if ".merkez/" not in t.split():
        g.write_text(t + ("" if t.endswith("\n") or not t else "\n") + ".merkez/\n", encoding="utf-8")


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
    # sablon 52: metindeki yollar GitHub'a baglanir; depo ve varsayilan dal kendiliginden bulunur (ajan yazmaz)
    if not veri.get("repo"):
        dep = _depo(veri_yolu)
        if dep:
            veri = dict(veri, repo=dep[0], dal=dep[1])
    duzeltme = secenek_duzelt(veri)   # kaynakta da duzelir: ajan bir sonraki turda temiz veriyle calisir
    if duzeltme:   # kaynaga yalniz sik duzeltmesi yazilir (merkez, repo gibi uretimde eklenenler yazilmaz)
        kaynak = json.loads(io.open(veri_yolu, encoding="utf-8").read())
        secenek_duzelt(kaynak)
        yaz(veri_yolu, kaynak)
    veri, sen_harita = senaryo_isle(veri, cikti_yolu)
    hata, yapi_uyari = yapisal(veri)
    yapi_uyari += duzeltme
    kapanis_denetle(veri, veri_yolu, hata, yapi_uyari)
    if not veri.get("url") and pathlib.Path(cikti_yolu).exists():
        yapi_uyari.append("kaynakta url yok: ilk yayindan sonra defterin baglantisini \"url\" olarak yaz (Merkez'le esitleme onunla tanir)")
    veri = {k: v for k, v in veri.items() if k not in ("arsiv", "kararlar")}  # arşiv ve karar kaydı kaynakta kalır, sayfaya gitmez
    gorunen = json.dumps(veri, ensure_ascii=False, separators=(",", ":"))   # sayfada sikistirilmis: yeni oturumda ajana geri verilen metin kisa olur
    if "—" in gorunen:
        sys.exit("uzun tire (—) yasak; noktali virgul veya parantez kullan")
    m_hata, m_uyari, harita = medya_denetle(veri, cikti_yolu)
    harita.update(sen_harita)
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
    cikti.parent.mkdir(parents=True, exist_ok=True)
    eski_veri = cikti.with_name(cikti.stem + ".veri.json")
    if eski_veri.exists():
        eski_veri.unlink()   # sablon 51: maddeler sayfanin icinde; ayri veri.json yok
    h = io.open(sablon, encoding="utf-8").read()
    i = h.index(BAS)
    j = h.index(SON, i)
    h = h[: i + len(BAS)] + "\n" + gorunen + "\n" + h[j:]
    baslik = html.escape(veri["title"].split(";")[0].strip(), quote=False)
    h = re.sub(r"<title>.*?</title>", lambda m: "<title>" + baslik + "</title>", h, count=1)
    if not tek:
        # sablon 51: sayfa ince (baslik, maddeler, iki baglanti); stil ve kod adi icerik ozetli ayri dosyada.
        # Yeni oturumda platform yayindan once canli sayfayi ajana geri verir; ince sayfa bu bedeli ~60k'dan
        # maddelerin boyuna indirir. Kod dosyasi degismedikce yeniden gonderilmez (ret gelirse haritadan cikar).
        h, kod = incelt(h)
        for ad, icerik in kod.items():
            yol = cikti.parent / ad
            if not yol.exists():
                io.open(yol, "w", encoding="utf-8").write(icerik)
            try:
                harita[ad] = str(yol.resolve().relative_to(pathlib.Path.cwd().resolve()))
            except ValueError:
                harita[ad] = str(yol.resolve())

    io.open(cikti_yolu, "w", encoding="utf-8").write(h)
    print("yazildi: %s  (%d madde, sayfa %d KB)" % (cikti_yolu, len(veri["items"]), len(h) // 1024))
    if harita:
        print("yayin icin Artifact files (aynen ver; yeni oturumda bir dosya \"okumadin\" diye reddedilirse ve o dosyayi bu turda degistirmediysen haritadan cikar, yeniden gonder):")
        print(json.dumps(harita, ensure_ascii=False))


def incelt(h):
    """Tam sayfayi ince sayfa + stil + kod dosyasina boler. Dosya adlari icerigin ozetidir: kod degismedikce ad ayni."""
    import hashlib
    s0 = h.index("<style>")
    s1 = h.index("</style>", s0)
    css = h[s0 + len("<style>"):s1]
    d0 = h.index(BAS)
    d1 = h.index(SON, d0) + len(SON)
    k0 = h.index("\n<script>\n", d1)
    k1 = h.index("</script>", k0 + 9)
    js = h[k0 + len("\n<script>\n"):k1]
    kabuk = h[s1 + len("</style>"):d0] + h[d1:k0]
    js = "document.body.insertAdjacentHTML('afterbegin'," + json.dumps(kabuk, ensure_ascii=False).replace("</", "<\\/") + ");\n" + js
    ozet = lambda t: hashlib.sha256(t.encode("utf-8")).hexdigest()[:10]
    ad_css, ad_js = "defter-%s.css" % ozet(css), "defter-%s.js" % ozet(js)
    bas = h[:s0]
    m = re.search(r"<!-- karar-defteri (\u015fablon s\u00fcr\u00fcm\u00fc: \d+).*?-->", bas, re.S)
    if m:
        bas = bas.replace(m.group(0), "<!-- karar-defteri %s; stil ve kod: %s, %s -->" % (m.group(1), ad_css, ad_js))
    ince = bas + '<link rel="stylesheet" href="%s">\n' % ad_css + h[d0:d1] + '\n<script src="%s" defer></script>\n' % ad_js + h[k1 + len("</script>"):]
    return ince, {ad_css: css, ad_js: js}


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


def _oneri_iliskisi(c, m):
    """Secim onerinle ayni mi: ajan maddeyi acmadan karar verir (ayniysa hazir plani uygular)."""
    if not m or c.get("choice") in (None, "", []) or m.get("recv") in (None, "", []):
        return ""
    sec = sorted(c["choice"]) if isinstance(c["choice"], list) else c["choice"]
    rv = sorted(m["recv"]) if isinstance(m["recv"], list) else m["recv"]
    if sec == rv:
        return " (= onerin)"
    ad = {o.get("v"): o.get("t") for o in m.get("options") or []}
    rv_ad = ", ".join(str(ad.get(x, x)) for x in (rv if isinstance(rv, list) else [rv]))
    return " (onerin degil; onerin: %s)" % _kisa(rv_ad, 60)


def _cevap_metni(c, m=None):
    p = []
    if c.get("label") or c.get("choice"):
        p.append("secim: " + str(c.get("label") or c.get("choice")) + _oneri_iliskisi(c, m))
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
    for o in c.get("ortak") or []:   # ortak defter: sahibin sozu gecer, arkadasin notu bilgi
        p.append("ortak %s: %s" % (o.get("kim", "?"), " · ".join(str(x) for x in (o.get("label"), o.get("note")) if x) or ("tamamladi" if o.get("done") else "-")))
    metin = " | ".join(p) or "bos tamamlandi"
    for x in c.get("ciktilar") or []:   # komutun altina yapistirilan cikti: son satirlar
        m = str(x.get("m") or "").rstrip()
        metin += "\n      cikti%s:\n        %s" % ((" [" + _kisa(x.get("k"), 60) + "]") if x.get("k") else "", "\n        ".join(m.splitlines()[-40:]))
    return metin


def _senaryo_oku(veri, veri_yolu, sahne_d, sira_d, kk_once):
    """Senaryo sayfasindan gelenler: sahne notu, kareler, sure, kimler, uretim kaydi, onerilen sira. Kapatilmasi gereken SN- listesini dondurur."""
    s = veri.get("senaryo")
    if not isinstance(s, dict):
        return []
    bekleyen, degisti = [], False
    for k in sorted(sahne_d):
        d, sid = sahne_d[k], k[3:]
        _, sh = _sahne_bul(s, sid)
        if sh is None:
            continue
        # uretim kaydi: kaynaga kendiliginden islenir (token yok)
        var = {u.get("at") for u in sh.get("uretim") or []}
        yeni_u = [{x: u[x] for x in ("arac", "prompt", "deneme", "secim", "at") if u.get(x) not in (None, "")} for u in d.get("uretim") or [] if isinstance(u, dict) and u.get("at") not in var]
        if yeni_u:
            sh.setdefault("uretim", []).extend(yeni_u)
            degisti = True
        p = []
        if str(d.get("not") or "").strip():
            p.append("not: " + str(d["not"]).strip())
        if d.get("sure") not in (None, "") and str(d.get("sure")) != str(sh.get("sure", "")):
            p.append("sure: %s sn (kaynakta %s) -> sahne %s sure %s" % (d["sure"], sh.get("sure", "yok"), sid, d["sure"]))
        if isinstance(d.get("kimler"), list) and sorted(d["kimler"]) != sorted(sh.get("kimler") or []):
            p.append("kimler: %s (kaynakta %s) -> sahne %s kimler \"%s\"" % (", ".join(d["kimler"]) or "-", ", ".join(sh.get("kimler") or []) or "yok", sid, ",".join(d["kimler"]) or "-"))
        for g in d.get("gorseller") or []:
            if not isinstance(g, dict):
                continue
            ek = "%s [asset %s]" % (g.get("ad") or "kare", g.get("id") or g.get("url", "")[:40])
            notlar = [str(g.get("not") or "").strip()] + ["igne %d: %s" % (i + 1, str(x.get("not") or "").strip()) for i, x in enumerate(g.get("igneler") or []) if isinstance(x, dict) and str(x.get("not") or "").strip()]
            p.append("kare " + ek + "".join(" | " + n for n in notlar if n))
        if yeni_u:
            p.append("uretim: %d kayit kaynaga islendi" % len(yeni_u))
        kk = kk_once.get(k) or {}
        if not p or (kk.get("y") and str(kk.get("at", "")) >= str(d.get("updatedAt", ""))):
            continue
        if any(x.startswith(("not:", "kare ", "sure:", "kimler:")) for x in p):
            bekleyen.append(k)
        print("  SAHNE   %s %s -> %s" % (sid, _kisa(sh.get("ad"), 40), " | ".join(p)))
    if isinstance(sira_d, dict) and isinstance(sira_d.get("bolumler"), list):
        simdi = [[str(sh.get("id")) for sh in b.get("sahneler") or []] for b in s.get("bolumler") or []]
        oner = [[str(x) for x in b] for b in sira_d["bolumler"] if isinstance(b, list)]
        if oner and oner != simdi:
            dz = "|".join(",".join(b) for b in oner)
            print("  SIRA    onerilen sahne sirasi: %s -> uygun ise: python3 %s sahne-sira %s \"%s\"" % (dz.replace("|", " | "), BETIK, veri_yolu, dz))
    if degisti:
        yaz(veri_yolu, veri)
    return bekleyen


def oku_komutu(veri_yolu, url, cevap_k, merkez_k=None, durum=None, proje=None, butce=None, eski_k=None):
    """Defteri okur: degisen cevaplar, Merkez'den gelenler, Merkez satiri. Ajan yalniz bunu okur."""
    veri = oku(veri_yolu)
    _gitignore()
    did = str(veri.get("id"))
    aid = url.rstrip("/").split("/")[-1]
    cik = pathlib.Path(veri_yolu).resolve().parent / ".merkez" / did   # okunan.json: ayni oturumda yalniz degisen okunur
    (cik / "aktar").mkdir(parents=True, exist_ok=True)
    for f in (cik / "aktar").glob("*.json"):
        f.unlink()
    cevap = _belgeler(cevap_k)
    eski_k = eski_k or (cevap_k if cevap_k and (pathlib.Path(cevap_k) / "defter").is_dir() else None)
    merkez = {k.split("__", 1)[1]: v for k, v in _belgeler(merkez_k).items() if k.startswith(aid + "__")}
    maddeler = {str(m.get("id")): m for m in veri["items"]}
    tum = dict({str(m.get("id")): m for m in veri.get("arsiv") or []}, **maddeler)
    # eski sablon: cevap yalniz defter/<id> belgesinde (done:true); cevap belgesi yoksa oradan alinir
    sizden, kendin, sahne_d, sira_d = {}, [], {}, None
    for k, d in _belgeler(eski_k, "defter").items():
        if not isinstance(d, dict):
            continue
        if k.startswith("SN-"):
            sahne_d[k] = d   # senaryo sayfasinda sahneye not, kare, sure, kimler, uretim kaydi (sablon 55)
            continue
        if k == "_senaryo_sira":
            sira_d = d
            continue
        if k == "_kendin":
            kendin = [str(x) for x in d.get("turler") or [] if str(x).strip()]
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
    if kendin:
        print("  KENDIN  bu turleri sorma; kendin karar ver, ⚙ bildir: " + "; ".join(kendin))
    baslik = lambda k: _kisa(cevap[k].get("q") or (maddeler.get(k) or {}).get("title"), 70)
    for k in sorted(islenmemis, key=lambda x: cevap[x].get("doneAt", "")):
        print("  %s %s %s -> %s" % ("YENI   " if onceki.get(k) != simdi[k] else "BEKLIYOR", k, baslik(k), _cevap_metni(cevap[k], maddeler.get(k))))
    for k in sorulu:
        print("  SORU    %s %s -> %s" % (k, baslik(k), _cevap_metni(cevap[k])))
    for k in taslak:
        if onceki.get(k) != simdi[k]:
            print("  TASLAK  %s %s -> %s  (tamamlanmadi; notu oku, istek ya da soruysa yanitla; secimi Tamamla gelmeden uygulama)" % (k, baslik(k), _cevap_metni(cevap[k], maddeler.get(k))))
        else:
            print("  TASLAK  %s degismedi: %s" % (k, _kisa(cevap[k].get("note") or cevap[k].get("label"), 80)))
    for k, d in sorted(sizden.items()):
        if not (kk_once.get(k) or {}).get("y"):
            print("  SENDEN  %s %s%s" % (k, d.get("title"), (" | " + d["body"]) if d.get("body") else ""))
    sahne_bekleyen = _senaryo_oku(veri, veri_yolu, sahne_d, sira_d, kk_once)
    tum_id = set(tum) | set(kk_once)
    iki_hafta = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=14)).isoformat()[:19]
    for k in sorted(cevap):
        if k not in tum_id and str(cevap[k].get("doneAt", "")) >= iki_hafta:
            print("  UYARI   %s: bu cevabin maddesi kaynakta yok. Kaynak JSON canli defterden eski olabilir (baska oturum yayinlamis); "
                  "canli sayfayi Artifact read ile al, kaynaga isle, sonra uret." % k)
    yapilacak = islenmemis + sorulu + [k for k in sizden if not (kk_once.get(k) or {}).get("y")] + sahne_bekleyen
    if yapilacak:
        print("  -> isle, sonra kapat: python3 %s kapat %s %s" % (BETIK, veri_yolu, " ".join('%s "ne yaptin"' % k for k in islenmemis + [k for k in sizden if not (kk_once.get(k) or {}).get("y")] + sahne_bekleyen)))
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
    sn_c = {k: {"q": "Sahne " + k[3:], "doneAt": d.get("updatedAt", ""), "note": d.get("not", "")} for k, d in sahne_d.items()}
    io.open(cik / "cevaplar.json", "w", encoding="utf-8").write(json.dumps(dict(sn_c, **dict(sizden, **cevap)), ensure_ascii=False))
    print("\nMerkez satiri: %d acik soru, %d karar -> %s" % (len(acik), len(kararlar), cik / "satir.json"))
    # artimli okuma: bir sonraki turda yalniz degisen belgeler (her iki koleksiyon da updatedAt tasiyorsa)
    hint = []
    for kol, kk_ in (("cevap", cevap_k), ("defter", eski_k)):
        bel = [d for k_, d in _belgeler(kk_, kol).items() if isinstance(d, dict) and not k_.startswith("_")] if kk_ else []
        if bel and all(d.get("updatedAt") for d in bel):
            hint.append("%s: query where [[\"updatedAt\", \">=\", \"%s\"]]" % (kol, max(d["updatedAt"] for d in bel)))
        elif bel:
            hint.append("%s: list" % kol)
    if hint:
        print("sonraki okumada (ayni out_dir): " + "; ".join(hint))
    merkez_url = veri.get("merkez") or _ayar(veri_yolu).get("merkez")
    yazma = []
    # ajan rozeti: sayfanin basliginda "Ajan: ... · 5 dk once · sirada senin 2 cevabin" (sablon 54)
    io.open(cik / "ajan.json", "w", encoding="utf-8").write(json.dumps({"son": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z", "durum": _kisa(durum or "cevaplari okudu", 60)}, ensure_ascii=False))
    ops = [{"op": "set", "collection": "cevap", "doc_id": i, "file_path": str(cik / "aktar" / (i + ".json"))} for i in aktar]
    ops.append({"op": "set", "collection": "defter", "doc_id": "_ajan", "file_path": str(cik / "ajan.json")})
    yazma.append("defter (%s) ArtifactData batch%s: %s" % (url, " (Merkez'den gelen cevaplar ve ajan rozeti)" if aktar else " (ajan rozeti)", json.dumps(ops, ensure_ascii=False)))
    if merkez_url:
        yazma.append("Merkez satiri: ArtifactData, url %s, collection defterler, doc_id %s, file_path %s. Satir varsa: once get, sonra update (if_version = get'in verdigi version); yoksa set" % (merkez_url, aid, cik / "satir.json"))
    print("yapilacak yazmalar:" + ("" if merkez_url else " (Merkez kurulu degil; Merkez satiri yok)"))
    for i, y in enumerate(yazma, 1):
        print("  %d) %s" % (i, y))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["ekle"] and len(a) == 3:
        ekle(a[1], a[2])
    elif a[:1] == ["sil"] and len(a) >= 3:
        sil(a[1], a[2:])
    elif a[:1] == ["sahne"] and len(a) == 5:
        sahne(a[1], a[2], a[3], a[4])
    elif a[:1] == ["sahne-ekle"] and len(a) >= 5:
        sahne_ekle(a[1], a[2], a[3], a[4], a[a.index("--sonra") + 1] if "--sonra" in a else None)
    elif a[:1] == ["surum"] and len(a) == 4:
        surum(a[1], a[2], a[3])
    elif a[:1] == ["sahne-sira"] and len(a) == 3:
        sahne_sira(a[1], a[2])
    elif a[:1] == ["uretim"] and len(a) == 7:
        uretim(a[1], a[2], a[3], a[4], a[5], a[6])
    elif a[:1] == ["ice-al"] and len(a) == 3:
        ice_al(a[1], a[2])
    elif a[:1] == ["goster"] and len(a) >= 3:
        goster(a[1], a[2:])
    elif a[:1] == ["yanitla"] and len(a) == 5:
        yanitla(a[1], a[2], a[3], a[4])
    elif a[:1] == ["kapat"] and len(a) >= 4:
        kapat(a[1], a[2:])
    elif a[:1] == ["liste"] and len(a) == 2:
        liste(a[1])
    elif a[:1] == ["oku"] and len(a) >= 2:
        def sec(ad):
            return a[a.index(ad) + 1] if ad in a and a.index(ad) + 1 < len(a) else None
        if not sec("--url"):
            sys.exit("oku: --url DEFTER_URL gerekli (--cevap KLASOR cevap varsa)")
        oku_komutu(a[1], sec("--url"), sec("--cevap"), sec("--merkez"), sec("--durum"), sec("--proje"), sec("--butce"), sec("--eski"))
    elif len([x for x in a if not x.startswith("--")]) == 2:
        p = [x for x in a if not x.startswith("--")]
        YAYINDA = "--yayinda" in a
        uret(p[0], p[1], tek="--tek" in a)
    else:
        sys.exit(__doc__)
