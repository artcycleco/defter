(async function(){
  // maddeler veri.json'dan; sayfada gömülü kopya da var (uretildi damgalı). veri.json yayına gitmediyse ya da
  // sayfadan eskiyse gömülü kopya gösterilir: ajan dosyayı unutsa da kullanıcı eski listeyi görmez
  const D=await (async()=>{const ic=JSON.parse(document.getElementById('defter').textContent);if(!ic.veri)return ic;
    const gomulu=Array.isArray(ic.items)&&!!ic.uretildi;
    try{const r=await fetch(ic.veri+(ic.veri.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(r.ok){const d=await r.json();if(d&&Array.isArray(d.items)&&(!gomulu||String(d.uretildi||'')>=ic.uretildi))return Object.assign({},d,{id:ic.id||d.id})}}catch(e){}
    if(gomulu)return ic;
    return Object.assign({items:[]},ic,{_veriYok:true})})();
  // şık başka adla yazılmışsa (text, label, ad; ya da düz metin) yine görünsün; öneri yalnız harfse şıkkın adı yazılsın
  const harfV=i=>String.fromCharCode(97+i);
  (Array.isArray(D.items)?D.items:[]).forEach(it=>{if(!it||!Array.isArray(it.options))return;
    it.options=it.options.map((o,i)=>{if(o===null||o===undefined)return {v:harfV(i),t:''};if(typeof o!=='object')return {v:harfV(i),t:String(o)};
      const v=[o.v,o.id,o.value,o.key,o.deger].find(x=>x!==undefined&&x!==null&&x!=='');const t=[o.t,o.text,o.label,o.ad,o.baslik,o.title,o.name,o.secenek].find(x=>typeof x==='string'&&x.trim());
      const d=[o.d,o.desc,o.description,o.aciklama].find(x=>typeof x==='string'&&x.trim());
      return Object.assign({},o,{v:v!==undefined?String(v):harfV(i),t:t||''},d?{d}:{})});
    const sec=it.options.find(o=>String(it.rec||'').trim().toLowerCase()===String(o.v).toLowerCase());if(sec&&sec.t)it.rec=sec.t});
  const P={1:'Acil',2:'Önemli',3:'Sonra'}, T={design:'✎ kararın',tech:'⚙ teknik',info:'ⓘ bilgi',report:'▤ rapor',task:'☐ görev'};
  const oncelikAd=k=>P[k], turEtiket=k=>T[k]||k, baslikKisa=()=>D.title.split(';')[0];   // şablon metninde büyük harfle başlayan yer tutucu yok: Dizin tarayıcısı onu ortam değişkeni sanıyor
  const FT={all:['Hepsi','Bütün maddeler'],design:['✎ Kararın','Senin vereceğin kararlar: tasarım, marka, para, hukuk, kullanıcıya görünen metin'],tech:['⚙ Teknik','Ajanın verdiği teknik kararlar; itiraz kutusu, boş bırakırsan kabul'],info:['ⓘ Bilgi','Şunu bil maddeleri; okuyup Tamamla'],report:['▤ Rapor','Araştırma bulguları ve metinler; oku, sorunu yaz, Okudum'],task:['☐ Görev','Senin dışarıda yapacağın işler: adım adım, ne getireceğin yazılı']};
  const state={}; let lastOpen=[]; let prevOpen=[]; let db=null, filter='all', onlyUrgent=false; const timers=new Map(); const pins={};
  const $=id=>document.getElementById(id);
  // ── tema
  let skin=null; try{skin=localStorage.getItem('kd-skin')}catch(e){}
  if(!skin) skin=(document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches))?'kulis':'atolye';
  function applySkin(){document.body.dataset.skin=skin;$('swBtn').setAttribute('aria-pressed',skin==='kulis')}
  applySkin();
  const FS=[15,17,19];let fs=15;try{fs=+localStorage.getItem('kd-fs')||15}catch(e){}
  const applyFs=()=>{document.body.style.setProperty('--fs',fs+'px');$('fsBtn').textContent='Aa '+fs};applyFs();
  $('fsBtn').addEventListener('click',()=>{fs=FS[(FS.indexOf(fs)+1)%FS.length];try{localStorage.setItem('kd-fs',fs)}catch(e){};applyFs()});
  $('swBtn').addEventListener('click',()=>{skin=skin==='kulis'?'atolye':'kulis';try{localStorage.setItem('kd-skin',skin)}catch(_){};applySkin()});
  // ── başlık
  document.title=D.title; $('brandAd').textContent=D.title.split(/[—;]/)[0].trim(); $('brand-sub').textContent=D.agent;
  $('title').textContent=D.title; $('purpose').textContent=D.purpose; $('agent').textContent='Ajan: '+D.agent; $('date').textContent=D.date;
  // ── süzgeç
  $('filters').innerHTML=Object.entries(FT).map(([v,[t,d]])=>`<button class="chip" data-f="${v}" title="${d}" aria-pressed="${v==='all'}">${t}</button>`).join('');
  $('onlyUrgent').title='Yalnız iş durduran maddeleri göster';
  $('filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;[...$('filters').children].forEach(c=>c.setAttribute('aria-pressed',c.dataset.f===filter));render()});
  $('onlyUrgent').addEventListener('click',()=>{onlyUrgent=!onlyUrgent;$('onlyUrgent').setAttribute('aria-pressed',onlyUrgent);render()});
  // ── kayıt
  const key='kd-'+D.id;
  function loadLocal(){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
  function saveLocal(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch(e){return false}}
  let uyariSonu=0;
  let durumSaat=null;
  function setStatus(t,c){if(t==='kaydediliyor…'||t==='kaydedildi')return; // her kayıtta bildirim çıkmaz; kartta "kaydedildi" yazar
    const sabit=t==='bağlı · otomatik kayıt'||t==='tarayıcı hafızası'||t==='…';const s=$('status');
    if(sabit){const b=$('baglanti');if(b){b.dataset.durum=t==='bağlı · otomatik kayıt'?'bagli':'yerel';b.title=t==='bağlı · otomatik kayıt'?'Bağlı; cevaplar otomatik kaydediliyor':'Bu görünümde cevaplar tarayıcıda'}return}
    const sure=c==='uyari'?6000:3200;if(c==='uyari'){uyariSonu=Date.now()+6000;c=''}
    s.textContent=t;s.className='status goster '+(c||'');clearTimeout(durumSaat);durumSaat=setTimeout(()=>s.classList.remove('goster'),sure)}
  const cizimOnbellek=new Map();
  async function cevapYaz(id,d){
    // ajanın okuduğu ince belge: yalnız tamamlanmış maddeler, yalnız gereken alanlar
    const ref=db.doc('cevap/'+id);const sor=Array.isArray(d.sorular)?d.sorular:[];
    // açık maddedeki soru da ajana gider (acik:true); ajan cevaplar, madde açık kalır
    // tamamlanmamış maddeye yazılan not, seçim ya da dosya notu da gider (taslak:true): Kullanıcı yazdıysa ajan görür
    const ck=ciktiListe(d),ok=ortakListe(d);
    if(!d.done){const nl=dosyaNotlari(id,d),sec=Array.isArray(d.choice)?d.choice.length>0:!!d.choice,not=String(d.note||'').trim();
      if(!sor.length&&!not&&!sec&&!nl.length&&!ck.length){try{await ref.delete()}catch(e){}return}
      const c={q:d.q||'',acik:true,updatedAt:d.updatedAt||new Date().toISOString()};if(sor.length)c.sorular=sor;
      if(not||sec||nl.length||ck.length){c.taslak=true;if(not)c.note=d.note;if(sec){c.choice=d.choice;c.label=d.label||d.choice}if(nl.length)c.notlar=nl;if(ck.length)c.ciktilar=ck;if(ok.length)c.ortak=ok}
      await ref.set(c);return}
    const c={q:d.q||'',doneAt:d.doneAt||'',updatedAt:d.updatedAt||new Date().toISOString()};   // updatedAt: ajan yalniz degisenleri sorgular
    ['sinif','ret','gerekce','kaynak','kesin','teyit'].forEach(k=>{if(d[k])c[k]=d[k]});if(d.gereksiz)c.gereksiz=true;if(sor.length)c.sorular=sor;
    {const it=D.items.find(x=>x.id===id);if(it&&it.acildi&&d.doneAt){const h=Math.round((new Date(d.doneAt)-acildiT(it))/36e5);if(h>=0)c.bekledi=h}}
    if(d.choice){c.choice=d.choice;c.label=d.label||d.choice}
    if(d.note)c.note=d.note;
    if(Array.isArray(d.steps)&&d.steps.some(Boolean))c.steps=d.steps.map(x=>!!x);
    if(Array.isArray(d.gorseller)&&d.gorseller.length)c.gorsel=d.gorseller.length;const nl=dosyaNotlari(id,d);if(nl.length)c.notlar=nl;
    if(ck.length)c.ciktilar=ck;if(ok.length)c.ortak=ok;
    await ref.set(c);
  }
  // komut çıktısı: son 40 satır, en çok 3000 karakter (ajana birkaç yüz token)
  function ciktiListe(d){return Object.keys(d.ciktilar||{}).sort().map(n=>d.ciktilar[n]).filter(v=>v&&String(v.m||'').trim()).map(v=>{const m=String(v.m).replace(/\s+$/,'').split('\n').slice(-40).join('\n').slice(-3000);return v.k?{k:v.k,m}:{m}})}
  // ortak defter: birden çok kişi yazdıysa her birinin son sözü (ad değil, sahip ya da arkadaş)
  function ortakListe(d){const y=Object.entries(d.yazanlar||{});if(y.length<2)return [];
    return y.sort((a,b)=>String(a[1].at).localeCompare(String(b[1].at))).map(([k,v])=>Object.assign({kim:v.sahip?'sahip':'arkadas'},v.label?{label:v.label}:{},v.note?{note:v.note}:{},v.done?{done:true}:{}))}
  let ozetSaat=null;
  function ozetYaz(){clearTimeout(ozetSaat);ozetSaat=setTimeout(()=>{if(!db)return;
    const acik=D.items.filter(it=>!it.resolved&&!(state[it.id]||{}).done).length;
    const bitti=D.items.filter(it=>!it.resolved&&(state[it.id]||{}).done).length;
    const senden=Object.keys(state).filter(k=>k.startsWith('UG-')).length;
    const taslak=D.items.filter(it=>{const s=state[it.id]||{};return !it.resolved&&!s.done&&String(s.note||'').trim()}).length;
    db.doc('defter/_ozet').set({acik,bitti,senden,taslak,son:new Date().toISOString()}).catch(()=>{})},1500)}
  function zenginlestir(id){
    if(id.startsWith('_')||id.startsWith('UG-'))return;
    const it=D.items.find(x=>x.id===id),s=state[id];if(!it||!s)return;
    s.q=String(it.title).replace(/^[✎⚙ⓘ▤☐]\s*/,'').slice(0,90);
    if(s.choice&&secimEtiket(it,s.choice))s.label=secimEtiket(it,s.choice); else delete s.label;
    // notu kelimelerden sınıfla: ajan onay ve reti tek satır okur, gerisini tam okur
    const n=(s.note||'').trim().toLocaleLowerCase('tr');
    const sf=!n?'':(/\?|ne demek|anlamadım|nedir/.test(n)?'soru':(/^(hayır|hayir|yok|olmasın|olmasin|yapma|istemiyorum)\b/.test(n)?'ret':(/^(tamam|okey|ok|evet|olur|onay|uygun|güzel|süper)\b/.test(n)&&n.length<40?'onay':'serbest')));
    const sf2=s.gereksiz?'gereksiz':(s.ret?'ret':sf);
    if(sf2)s.sinif=sf2;else delete s.sinif;
  }
  async function persist(id){
    zenginlestir(id);
    if(benimId&&!/^(_|UG-|SN-)/.test(id)&&state[id]){const s0=state[id],y=Object.assign({},s0.yazanlar),g={at:new Date().toISOString()};
      if(s0.label)g.label=s0.label;else if(s0.choice!==undefined&&s0.choice!==null&&s0.choice!=='')g.label=String(s0.choice);if(s0.note)g.note=s0.note;if(s0.done)g.done=true;if(benSahip)g.sahip=true;
      y[benimId]=g;state[id]=Object.assign({},s0,{yazanlar:y,kim:benimId})}
    const d=Object.assign({},state[id],{updatedAt:new Date().toISOString()});state[id]=d;
    const yerelOk=saveLocal();
    const el=document.querySelector(`[data-saved="${id}"]`);
    if(db){setStatus('kaydediliyor…');try{
        const yaz=Object.assign({},d);
        if(Array.isArray(yaz.gorseller)){
          // çizgiler ayrı koleksiyona: madde belgesi ince kalır, ajan okurken görmez
          yaz.gorseller=yaz.gorseller.map((g,i)=>{const {cizgiler,...kalan}=g;
            if(!id.startsWith('_')){const k='cizim/'+id+'-'+i,v=JSON.stringify(cizgiler||[]);
              if(cizimOnbellek.get(k)!==v){cizimOnbellek.set(k,v);db.doc(k).set({cizgiler:cizgiler||[]}).catch(()=>{})}}
            return kalan});
        }
        await db.doc('defter/'+id).set(yaz);
        if(!/^(_|UG-|SN-)/.test(id))await cevapYaz(id,d);
        ozetYaz();
        if(bekleyenYaz.delete(id))bekleyenKaydet();
        if(!id.startsWith('_'))kopruPlanla();
        setStatus('kaydedildi','ok');if(el)el.textContent='kaydedildi'}catch(e){bekleyenYaz.add(id);bekleyenKaydet();setStatus('bağlantı yok; '+bekleyenYaz.size+' cevap bekliyor, bağlanınca gider','uyari');if(el)el.textContent='bekliyor'}}
    else if(!yerelOk){setStatus('tarayıcıya sığmadı; görselleri azalt ya da kararları kopyala','');if(el)el.textContent='kaydedilemedi'}
    else{setStatus('tarayıcıya kaydedildi','ok');if(el)el.textContent='kaydedildi'}
    if(!$('tuval').hidden&&tv.id===id)$('tuvalKayit').textContent='kaydedildi';
  }
  // çevrimdışı: yazılamayan cevap tarayıcıda bekler, bağlantı gelince gider
  const bekleyenYaz=new Set((()=>{try{return JSON.parse(localStorage.getItem('kd-bekleyen-'+D.id)||'[]')}catch(e){return []}})());
  function bekleyenKaydet(){try{localStorage.setItem('kd-bekleyen-'+D.id,JSON.stringify([...bekleyenYaz]))}catch(e){}const b=$('baglanti');if(b&&bekleyenYaz.size){b.dataset.durum='yerel';b.title=bekleyenYaz.size+' cevap gönderilmeyi bekliyor'}}
  function bekleyenGonder(){if(!db||!bekleyenYaz.size||navigator.onLine===false)return;[...bekleyenYaz].forEach(id=>persist(id))}
  window.addEventListener('online',bekleyenGonder);setInterval(()=>{if(bekleyenYaz.size&&!document.hidden)bekleyenGonder()},20000);
  const sched=id=>{clearTimeout(timers.get(id));timers.set(id,setTimeout(()=>{timers.delete(id);persist(id)},700))};
  function bosalt(){[...timers.keys()].forEach(id=>{clearTimeout(timers.get(id));timers.delete(id);persist(id)})}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')bosalt()});
  window.addEventListener('pagehide',bosalt);
  // ── yardımcılar
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const kopyaSvg='<button type="button" class="kopyala" data-kopyala title="Kopyala" aria-label="Kopyala"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/><path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2"/></svg></button>';
  async function kopyala(b){const h=b.previousElementSibling;const t=h?h.textContent:'';let ok=false;
    try{await navigator.clipboard.writeText(t);ok=true}catch(e){try{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(_){}}
    b.classList.toggle('tamam',ok);setStatus(ok?'kopyalandı: '+(t.length>40?t.slice(0,40)+'…':t):'kopyalanamadı; elle seç','ok');setTimeout(()=>b.classList.remove('tamam'),1600)}
  // ```mesaj Site ajanına  -> gönderilecek mesaj kutusu (düz yazı, satır kaydırır, kopyala); ``` -> kod bloğu
  function kodBlok(satirlar,k){const ic=esc(satirlar.join('\n'));
    if(k&&k.tur==='mesaj')return '<div class="mesaj-bas">→ '+(k.hedef?inlTek(k.hedef):'Gönderilecek mesaj')+'</div><div class="kod-sar"><pre class="mesaj">'+ic+'</pre>'+kopyaSvg+'</div>';
    const etiket=k&&k.tur&&k.tur!=='kod'?k.tur:(KOMUT_RE.test(satirlar[0]||'')?'Komut':'Kod');
    return '<div class="komut-kutu"><div class="komut-bas"><span>'+esc(etiket)+'</span><button type="button" class="kopyala-yazi" data-kopyala-kutu title="Kopyala"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/><path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2"/></svg>Kopyala</button></div><pre><code>'+ic+'</code></pre></div>'}
  // 52: komut ve yol tanıma: ajan özel sözdizimi yazmaz, sayfa kendisi tanır (token harcamaz)
  const KOMUT_ADLAR=['python3?','py','git','gh','claude','npm','npx','pnpm','yarn','node','pip3?','cd','ls','dir','mkdir','cp','mv','rm','code','docker','start','explorer'];   // indirme ve kabuk araçları bilerek yok: Dizin denetimi onları "indir ve çalıştır" sayıyor; o satırlar yine kutuda, "Kod" etiketiyle
  const KOMUT_RE0=new RegExp('^\\s*(\\$\\s*)?('+KOMUT_ADLAR.join('|')+')\\b','i'),KOMUT_PS=/^\s*\$[A-Za-z_]\w*\s*=|^\s*[A-Z][a-z]+-[A-Z][A-Za-z]+(\s|$)/,KOMUT_RE={test:s=>KOMUT_RE0.test(s)||KOMUT_PS.test(s)};   // PowerShell: $degisken = ..., Fiil-Ad
  // yol: sürücü harfiyle (C:\...) ya da ./ ~/ / ile başlar, / ile biter, uzantılı dosyayla biter ya da en az iki ayraç taşır ("ve/veya" yol sayılmaz)
  function yolMu(k){k=String(k).trim();if(!k||/^[a-z][a-z0-9+.-]*:\/\//i.test(k)||/[<>|*?"`]/.test(k))return false;
    if(/^[A-Za-z]:[\\\/]/.test(k))return true;
    if(/\s/.test(k)||!/[\/\\]/.test(k))return false;
    if(!/^(~[\/\\]|\.{1,2}[\/\\]|[\/\\])?[\w.\-@\u00c0-\u024f]+([\/\\][\w.\-@\u00c0-\u024f]*)+$/.test(k))return false;
    return /^(~|\.{1,2})?[\/\\]/.test(k)||/[\/\\]$/.test(k)||/\.[A-Za-z0-9]{1,6}$/.test(k)||(k.match(/[\/\\]/g)||[]).length>=2}
  const kokAnahtar=()=>'kd-yerel-kok-'+(D.repo||D.id);
  const yerelKok=()=>{try{return localStorage.getItem(kokAnahtar())||''}catch(e){return ''}};
  function winYol(k){if(/^[A-Za-z]:[\\\/]/.test(k))return k.replace(/\//g,'\\');const g=yolGoreli(k);
    if(/^(~|\/)/.test(g))return null;const kok=yerelKok().replace(/[\\\/]+$/,'');return kok?kok+'\\'+g.replace(/\//g,'\\').replace(/\\$/,''):''}
  async function metinKopyala(t,el){let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){try{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(_){}}
    if(el){el.classList.toggle('tamam',ok);setTimeout(()=>el.classList.remove('tamam'),1600)}setStatus(ok?'kopyalandı: '+(t.length>40?t.slice(0,40)+'…':t):'kopyalanamadı; elle seç','ok');return ok}
  document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
    const kk=t.closest('[data-kopyala-kutu]');if(kk){e.preventDefault();const pre=kk.closest('.komut-kutu').querySelector('pre');metinKopyala(pre?pre.textContent:'',kk);return}
    const mr=t.closest('[data-madde-git]');if(mr){e.preventDefault();maddeyeGit(mr.dataset.maddeGit);return}
    const ki=t.closest('[data-kopyala-ic]');if(ki){e.preventDefault();metinKopyala(ki.textContent,ki);return}
    const ya=t.closest('[data-yol-ac]');if(ya){e.preventDefault();const m=ya.nextElementSibling,ac=m.hidden;yolKapat();m.hidden=!ac;ya.setAttribute('aria-expanded',ac);ya.closest('.yol').classList.toggle('acik',ac);if(ac){m.style.left='0';m.style.right='auto';const rc=m.getBoundingClientRect();if(rc.right>innerWidth-8){m.style.left='auto';m.style.right='0'}}return}
    const yi=t.closest('[data-yol-is]');if(yi){e.preventDefault();const d=yi.closest('.yol'),y=d.dataset.yol;yolKapat();
      if(yi.dataset.yolIs==='kopyala'){metinKopyala(y);yolKapat();return}
      const w=winYol(y);
      if(w===null){metinKopyala(y);setStatus('Bu yol ajanın sunucusunda; senin bilgisayarında yok. Yol kopyalandı.','uyari');yolKapat();return}
      if(!w){setStatus('Önce Ayarlar > Bilgisayar: bu projenin klasörünü yaz','uyari');yolKapat();setTimeout(()=>{ayarAc(true);setTimeout(()=>{const i=$('yerelKok');if(i)i.focus()},120)},60);return}
      metinKopyala(w);let acti=false;try{const a=document.createElement('a');a.href='defter-ac:'+encodeURIComponent(w);a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();acti=true}catch(_){}
      setStatus(acti?'Gezgin açılıyor; açılmazsa köprü kurulu değil (yol kopyalandı)':'Yol kopyalandı; Gezgin köprüsü kurulu değil','ok');yolKapat();return}
    if(!t.closest('.yol'))yolKapat()});
  function yolKapat(){document.querySelectorAll('.yol.acik').forEach(x=>{x.classList.remove('acik');const m=x.querySelector('.yol-menu');if(m)m.hidden=true;const b=x.querySelector('[data-yol-ac]');if(b)b.setAttribute('aria-expanded','false')})}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.yol.acik'))yolKapat()});
  setTimeout(()=>{const i=$('yerelKok');if(!i)return;i.value=yerelKok();i.addEventListener('change',()=>{try{localStorage.setItem(kokAnahtar(),i.value.trim())}catch(e){}setStatus('bilgisayar klasörü kaydedildi','ok')})},0);
  function yolGoreli(k){let y=k.replace(/\\/g,'/');const rp=String(D.repo||'').split('/')[1];
    if(rp){const i=y.indexOf('/'+rp+'/');if(/^\//.test(y)&&i>=0)y=y.slice(i+rp.length+2)}
    return y.replace(/^\.\//,'')}
  const yolSvg='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5a1 1 0 0 1 1-1h3.6l1.4 1.6h6a1 1 0 0 1 1 1v6.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/></svg>';
  const dosyaSvg='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13"/></svg>';
  function yolHtml(k){const g=yolGoreli(k),win=/^[A-Za-z]:\\/.test(k),dosya=/\.[A-Za-z0-9]{1,6}$/.test(k);
    return '<span class="yol" data-yol="'+esc(k)+'"><button type="button" class="yol-cip" data-yol-ac aria-haspopup="menu" aria-expanded="false" title="Yol: tıkla, kopyala ya da aç">'+(dosya?dosyaSvg:yolSvg)+esc(k)+'</button><span class="yol-menu" role="menu" hidden>'
      +'<button type="button" role="menuitem" data-yol-is="kopyala">Yolu kopyala</button>'
      +(D.repo&&!win&&!/^(~|\/)/.test(g)?'<a role="menuitem" target="_blank" rel="noopener" href="https://github.com/'+esc(D.repo)+'/tree/'+esc(D.dal||'main')+'/'+g.split('/').map(encodeURIComponent).join('/')+'">GitHub\'da aç<small>'+esc(D.repo)+'</small></a>':'')
      +'<button type="button" role="menuitem" data-yol-is="gezgin">Gezgin\'de aç<small>Bilgisayarındaki klasörde</small></button></span></span>'}
  const inlTek=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  function md(t){ // hoşgörülü biçimleyici: paragraf, başlık (#..####), - * 1. listeler (iç içe), | tablo |, > alıntı, ---, **kalın**, *italik*, `kod`, [bağlantı](https://)
    const out=[];let p=[],liste=null,tablo=null,alinti=[],kod=null,kodTur={};
    const kapaP=()=>{if(p.length){out.push('<p>'+p.map(inl).join('<br>')+'</p>');p=[]}};
    const kapaL=()=>{if(liste){out.push(listeHtml(liste));liste=null}};
    const kapaT=()=>{if(tablo){out.push(tabloHtml(tablo));tablo=null}};
    const kapaA=()=>{if(alinti.length){out.push('<blockquote>'+alinti.map(inl).join('<br>')+'</blockquote>');alinti=[]}};
    const kapaHepsi=()=>{kapaP();kapaL();kapaT();kapaA()};
    String(t).replace(/\r/g,'').split('\n').forEach(ham=>{
      if(kod!==null){if(/^\s*```\s*$/.test(ham)){out.push(kodBlok(kod,kodTur));kod=null}else kod.push(ham);return}
      {const m=/^\s*```\s*(\S*)\s*(.*)$/.exec(ham);if(m){kapaHepsi();kod=[];kodTur={tur:m[1].toLowerCase(),hedef:m[2]};return}}
      const l=ham.replace(/\s+$/,'');
      if(!l.trim()){kapaHepsi();return}
      let m;
      if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)){kapaHepsi();out.push('<hr>');return}
      if((m=l.match(/^\s*(#{1,6})\s+(.*)$/))){kapaHepsi();out.push((m[1].length<=2?'<h4>':'<h5>')+inl(m[2].replace(/\s*#+\s*$/,''))+(m[1].length<=2?'</h4>':'</h5>'));return}
      if(/^\s*\|/.test(l)){kapaP();kapaL();kapaA();(tablo=tablo||[]).push(l);return}
      if((m=l.match(/^\s*>\s?(.*)$/))){kapaP();kapaL();kapaT();alinti.push(m[1]);return}
      if((m=l.match(/^(\s*)([-*+•]|\d+[.)])\s+(.*)$/))){kapaP();kapaT();kapaA();
        const derin=m[1].replace(/\t/g,'  ').length>=2?1:0,tur=/^[-*+•]$/.test(m[2])?'ul':'ol';
        if(liste&&!derin&&liste.tur!==tur)kapaL(); // madde türü değişti: yeni liste
        if(!liste)liste={tur,ic:[]};
        liste.ic.push({derin,tur,metin:m[3]});return}
      if(liste&&/^\s{2,}\S/.test(l)){liste.ic[liste.ic.length-1].metin+=' '+l.trim();return} // liste maddesinin devam satırı
      kapaL();kapaT();kapaA();p.push(l.trim());
    });
    kapaHepsi();if(kod!==null)out.push(kodBlok(kod,kodTur));
    return out.join('');
    function listeHtml(lst){
      let h='<'+lst.tur+'>',acik=null;
      lst.ic.forEach((x,k)=>{
        if(x.derin&&!acik){acik=x.tur;h=h.replace(/<\/li>$/,'')+'<'+acik+'>'}
        if(!x.derin&&acik){h+='</'+acik+'></li>';acik=null}
        h+='<li>'+inl(x.metin)+(x.derin||(lst.ic[k+1]&&lst.ic[k+1].derin)?'':'</li>');
        if(x.derin)h+='</li>';
      });
      if(acik)h+='</'+acik+'></li>';
      return h+'</'+lst.tur+'>';
    }
    function tabloHtml(lines){
      const sat=lines.map(l=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim()));
      const ayrac=r=>r.length&&r.every(c=>/^:?-{2,}:?$/.test(c));
      let bas=null,govde=sat;
      if(sat.length>1&&ayrac(sat[1])){bas=sat[0];govde=sat.slice(2)}
      const tr=(r,et)=>'<tr>'+r.map(c=>'<'+et+'>'+inl(c)+'</'+et+'>').join('')+'</tr>';
      return '<div class="tablo-sar"><table>'+(bas?'<thead>'+tr(bas,'th')+'</thead>':'')+'<tbody>'+govde.map(r=>tr(r,'td')).join('')+'</tbody></table></div>';
    }
    function inl(x){const kodlar=[];
      // kodun içi biçimlenmez (alt çizgi, yıldız olduğu gibi kalır); 6 karakterden uzun koda kopyala düğmesi
      return esc(x).replace(/`([^`]+)`/g,(m,k)=>{kodlar.push(k);return '\u0000'+(kodlar.length-1)+'\u0000'})
      .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g,(m,a,u)=>/^(https?:\/\/|[\w.\/-]+\.(png|jpe?g|webp|gif|svg)$)/i.test(u)?'<img class="md-gorsel" src="'+u+'" alt="'+a+'" loading="lazy">':m)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\[([^\]]+)\]\(((?:ekler|ornek)\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" download>$1</a>')
      .replace(/\[([A-Z]{1,3}\d{1,3})\]/g,(m,id)=>D.items.some(x=>x.id===id)?'<a href="#'+id+'" class="madde-ref" data-madde-git="'+id+'" title="Maddeye git">'+id+'</a>':m)
      .replace(/(^|[\s(])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|co|org|net|io|ai|app|dev|tr|edu|gov)(?:\/[^\s<)]*)?)(?=[\s.,;:!?)]|$)/gi,(m,o,u)=>o+'<a href="'+(/^https?:/i.test(u)?u:'https://'+u)+'" target="_blank" rel="noopener">'+u+'</a>')
      .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
      .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s.,;:!?)]|$)/g,'$1<em>$2</em>')
      .replace(/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s.,;:!?)]|$)/g,'$1<em>$2</em>')
      .replace(/\u0000(\d+)\u0000/g,(m,i)=>{const k=kodlar[+i],ham=k.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
        if(KOMUT_RE.test(ham))return '<code class="komut-ic" data-kopyala-ic title="Tıkla, kopyala">'+k+'</code>';
        if(yolMu(ham))return yolHtml(ham);
        return '<code>'+k+'</code>'+(k.length>=6?kopyaSvg:'')})}
  }
  const mdSatir=t=>md(t).replace(/^<p>([\s\S]*)<\/p>$/,'$1'); // tek paragraflık alanlar için sarmalayıcısız
  function editing(){const a=document.activeElement;if(!a)return false;if(a.isContentEditable||a.tagName==='TEXTAREA')return true;
    if(a.tagName==='INPUT')return !['radio','checkbox','button','file','submit'].includes(a.type);return false}
  let pendingRender=false;
  function renderSafe(){if(editing()||!$('tuval').hidden){pendingRender=true;return}pendingRender=false;render()}
  document.addEventListener('focusout',()=>{if(pendingRender)setTimeout(()=>{if(!editing()&&pendingRender)renderSafe()},50)});
  const sig=()=>JSON.stringify([((state._sira||{}).ids)||[],D.items.map(it=>{const s=state[it.id]||{};return [it.id,!!s.done,!!s.later,!!s.collapsed,s.updatedAt||'']})]);
  let ilkeDon=false, odak=-1, korumaSonu=0, varliklar=null, bekleyenId=null, kabulSaat=null, sonIslem=null, seritSaat=null, hedefId=null;
  const acikRapor=new Set();
  // dene ayarları: JSON'daki varsayılan + kullanıcının seçtiği (state._ayar)
  const AYAR_VARSAYILAN={onerimAcik:true,ustSeritTek:true,tamamlaGit:'siradaki',raporKatla:true,sonaAt:true,dikte:true,takvim:true,kaydir:true,sessiz:false}; // kullanıcı kararı D23-D28, 2026-09-18
  let ayar=Object.assign({},AYAR_VARSAYILAN);
  function ayarYukle(){ayar=Object.assign({},AYAR_VARSAYILAN,D.ayarlar||{},(state._ayar||{}).degerler||{});
    document.body.dataset.serit=ayar.ustSeritTek?'tek':'cok';document.body.dataset.sesYaz=ayar.dikte===false?'0':'1';document.body.dataset.takvimDugme=ayar.takvim===false?'0':'1';ayarPanelGuncelle()}
  function ayarPanelGuncelle(){document.querySelectorAll('#ayarPanel [data-ayar]').forEach(x=>{const k=x.dataset.ayar,v=ayar[k];x.checked=x.dataset.acik?v===x.dataset.acik:v!==false});if(typeof ayarEkCiz==='function')try{ayarEkCiz()}catch(_){}}
  function ayarDegis(k,v){const yeni=Object.assign({},(state._ayar||{}).degerler||{},{[k]:v});state._ayar=Object.assign({},state._ayar,{degerler:yeni});persist('_ayar');ayarYukle();render()}
  function ayarUygula(it,secim){
    if(!it.dene||!it.dene.ayar)return;
    const deger=(it.dene.deger||{})[secim];if(deger===undefined)return;
    const yeni=Object.assign({},(state._ayar||{}).degerler||{},{[it.dene.ayar]:deger});
    state._ayar=Object.assign({},state._ayar,{degerler:yeni});persist('_ayar');ayarYukle();render();
  }
  function ornekTohumla(){D.items.forEach(it=>{if(Array.isArray(it.gorseller)&&it.gorseller.length&&(state[it.id]||{}).gorseller===undefined){
    state[it.id]=Object.assign({},state[it.id],{gorseller:it.gorseller.map(g=>Object.assign({url:g.url,alt:g.alt||'',ornek:true,ham:{url:g.url},cizgiler:[]},g.tur?{tur:g.tur}:{},g.ad?{ad:g.ad}:{}))})}})}
  const cerceveModu=()=>document.documentElement.scrollHeight<=window.innerHeight+2;
  function geriSeritCiz(){
    const el=$('geriSerit');if(!sonIslem||Date.now()-sonIslem.t>6000){el.hidden=true;return}
    el.hidden=false;el.innerHTML=`<span><b>${esc(sonIslem.id)}</b> ${esc(sonIslem.ne)}</span><button class="btn ghost" data-geri-al>Geri al</button>`;
    clearTimeout(seritSaat);seritSaat=setTimeout(()=>{sonIslem=null;el.hidden=true},6000);
  }
  function vurgula(id){requestAnimationFrame(()=>{const el=document.querySelector(`#open .card[data-id="${id}"]`);if(!el)return;
    document.querySelectorAll('.card.kfocus').forEach(c=>c.classList.remove('kfocus'));el.classList.add('kfocus');
    korumaSonu=Date.now()+1200;el.scrollIntoView({block:'start',behavior:yumusak()})})}
  function ustOlc(){const t=document.querySelector('.top');if(t)document.documentElement.style.setProperty('--ust',Math.round(t.getBoundingClientRect().height)+'px');
    document.body.dataset.cerceve=cerceveModu()?'1':'0'}
  const yigin=[];
  function kaydet_geri(aciklama, ids){
    const anlik=ids.map(id=>[id, state[id]?JSON.parse(JSON.stringify(state[id])):null]);
    yigin.push({aciklama, anlik});
    if(yigin.length>25)yigin.shift();
  }
  function geriAl(){
    const a=yigin.pop();
    if(!a){setStatus('geri alınacak işlem yok','');return}
    a.anlik.forEach(([id,veri])=>{
      if(veri===null){delete state[id];saveLocal();if(db){try{db.doc('defter/'+id).delete();db.doc('cevap/'+id).delete()}catch(e){}}}
      else{state[id]=veri;persist(id)}
    });
    render();
    setStatus('geri alındı: '+a.aciklama,'ok');
  }
  const yumusak=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  function ilkeGit(){
    const el=document.querySelector('#open .card')||document.querySelector('#open .empty')||document.querySelector('#panelOpen');
    if(!el)return;
    korumaSonu=Date.now()+1500;
    try{el.scrollIntoView({block:'start',behavior:yumusak()})}catch(e){el.scrollIntoView(true)}
  }
  const isDone=it=>(state[it.id]||{}).done;
  const mine=()=>Object.entries(state).filter(([k,v])=>k.startsWith('UG-')&&v&&v.title).map(([k,v])=>({id:k,priority:2,type:'design',title:v.title,why:v.body||'',_mine:true}));
  const fmtDue=d=>{const t=new Date(d);if(isNaN(t))return d;const days=Math.ceil((t-Date.now())/864e5);return t.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+(days<0?' · geçti':days<=3?' · '+days+' gün':'')};
  const isText=it=>!!it.body;
  const secimEtiket=(it,ch)=>(Array.isArray(ch)?ch:[ch]).filter(v=>v!==undefined&&v!==null&&v!=='').map(v=>(((it.options||[]).find(o=>o.v===v)||{}).t)||v).join(' · ');
  // ── çizim
  function stepHtml(it,st,i,checked){
    const box=`<input type="checkbox" data-step="${it.id}" data-i="${i}" aria-label="Adım ${i+1}" ${checked?'checked':''}>`;
    if(typeof st==='string')return `<li>${box}<span class="plain">${mdSatir(st)}</span></li>`;
    const lst=[['go','Git'],['do','Yap'],['see','Bak'],['keep','Kaydet']].filter(([k])=>st[k]).map(([k,l])=>`<div class="sl ${k}"><b>${l}</b><span>${mdSatir(st[k])}</span></div>`).join('');
    return `<li>${box}${lst}</li>`;
  }
  const riskAd={dis:['dışa dönük','Yayın, e-posta, ödeme gibi dışarıya giden iş; dikkat'],icerik:['içerik','Görünen metin ya da görsel'],geri:['geri alınır','Kolayca geri alınabilir'],donulmez:['geri dönülmez','Geri alması zor: baskı, sözleşme, yayın; önce buna bak']};
  const baslik=t=>String(t||'').replace(/^[✎⚙ⓘ▤☐]\s*/,'');
  const acildiT=it=>new Date(/T/.test(String(it.acildi))?it.acildi:it.acildi+'T00:00:00');
  const bekledi=it=>{if(!it.acildi)return 0;const g=(Date.now()-acildiT(it))/864e5;return g>=1?Math.floor(g):0};
  const sessizMi=()=>{if(!ayar.sessiz)return false;const h=new Date().getHours();return h>=22||h<8};
  const yerineGecen=id=>D.items.find(x=>x.yerine===id&&x.id!==id);
  const riskli=it=>!!it&&(it.risk==='dis'||it.risk==='donulmez');
  const secimSart=it=>!!it&&(it.priority===1||riskli(it))&&(it.options||[]).length>0;
  const ikonEk='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 12.5l5.8-5.8a3 3 0 0 1 4.2 4.2l-7.4 7.4a4.6 4.6 0 0 1-6.5-6.5l6.9-6.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const gorAnahtar='kd-gor-'+D.id;let gor={};try{gor=JSON.parse(localStorage.getItem(gorAnahtar)||'{}')}catch(_){}
  const ilkZiyaret=!Object.keys(gor).length;const gor0=Object.assign({},gor);
  // son açılıştaki metin: değişen cümle ve şık sarıyla işaretlenir (ajan "ne değişti" yazmak zorunda kalmaz)
  const gorMAnahtar=gorAnahtar+'-m';let gorM={};try{gorM=JSON.parse(localStorage.getItem(gorMAnahtar)||'{}')}catch(_){}const gorM0=Object.assign({},gorM);
  const normC=x=>String(x||'').replace(/[*_`>#|\[\]()]/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr');
  const cumleler=t=>String(t||'').split(/\n|(?<=[.!?…:;])\s+/).map(normC).filter(x=>x.length>3);
  const maddeMetni=it=>({m:[it.why,it.body,it.rec].filter(Boolean).join('\n').slice(0,30000),o:(it.options||[]).map(o=>String(o.t||''))});
  const eskiSet=new Map();
  function eskiCumleler(it){if(!it||yeniMi(it)!=='degisti')return null;const g=gorM0[it.id];if(!g||typeof g!=='object')return null;let e=eskiSet.get(it.id);
    if(!e){e=new Set(cumleler(g.m).concat((g.o||[]).map(normC)));eskiSet.set(it.id,e)}return e}
  function degisenSik(it,o){const e=eskiCumleler(it);return !!e&&!e.has(normC(o.t))}
  function degisenIsaretle(it,t){const e=eskiCumleler(it);if(!e||!t)return t;let kod=false;
    const dengeli=x=>((x.match(/\*\*/g)||[]).length%2===0)&&((x.match(/`/g)||[]).length%2===0)&&((x.match(/\[/g)||[]).length===(x.match(/\]/g)||[]).length)&&!/https?:|[\\\/]/.test(x);
    const sar=x=>{const n=normC(x);return n.length>3&&!e.has(n)&&dengeli(x)?'\u0001'+x+'\u0002':x};
    return String(t).split('\n').map(l=>{
      if(/^\s*```/.test(l)){kod=!kod;return l}
      if(kod||!l.trim()||/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l))return l;
      if(/^\s*\|/.test(l)){if(/^[\s|:-]+$/.test(l))return l;return l.replace(/[^|]+/g,c=>{const m=/^(\s*)(.*?)(\s*)$/.exec(c);return m[2]?m[1]+sar(m[2])+m[3]:c})}
      const m=/^(\s*(?:(?:[-*+•]|\d+[.)])\s+|>\s?|#{1,6}\s+)?)(.*)$/.exec(l);const on=m[1],govde=m[2];
      const parca=govde.split(/(?<=[.!?…])\s+/);
      if(parca.length>1&&parca.every(dengeli))return on+parca.map(sar).join(' ');
      return on+sar(govde)}).join('\n')}
  const isaretAc=h=>String(h).replace(/\u0001/g,'<mark class="degisen">').replace(/\u0002/g,'</mark>');
  const maddeOzet=it=>{const t=JSON.stringify([it.title,it.why,it.body,it.options,it.steps,it.degisti,it.yanitlar]);let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h};
  function yeniMi(it){if(ilkZiyaret||it._mine)return '';const g=gor0[it.id];if(g===undefined)return 'yeni';return g!==maddeOzet(it)?'degisti':''}
  function gorduIsaretle(id){const it=maddeBul(id);if(!it||(gor[id]===maddeOzet(it)&&gorM[id]))return;gor[id]=maddeOzet(it);gorM[id]=maddeMetni(it);try{localStorage.setItem(gorAnahtar,JSON.stringify(gor))}catch(_){}
    try{localStorage.setItem(gorMAnahtar,JSON.stringify(gorM))}catch(_){try{const az={};D.items.forEach(x=>{if(gorM[x.id])az[x.id]=gorM[x.id]});gorM=az;localStorage.setItem(gorMAnahtar,JSON.stringify(gorM))}catch(__){}}}
  function hizliHtml(it){return `<div class="hizli" data-hizli="${it.id}"><button type="button" class="hz" data-hz="hayir">✕ Hayır</button><button type="button" class="hz soru-btn" data-hz="soru" title="Bu maddeyle ilgili soru sor; ajan bir sonraki turda altına cevaplar">? Soru sor</button>
    <span class="ret-neden" hidden>${ ['Pahalı','Beğenmedim','Erken','Başka öner','Başka'].map(x=>`<button type="button" class="hz kucuk" data-ret="${x}" ${x==='Başka öner'?'title="Ajan bu soruyu iki yeni şıkla yeniden sorar"':''}>${x}</button>`).join('')}</span></div>`}
  function soruKutuHtml(it){return `<div class="soru-kutu" hidden><textarea data-soru-gir="${it.id}" rows="2" placeholder="Sorun; ajan bir sonraki turda bu maddenin altına cevaplar"></textarea><button type="button" class="btn" data-soru-kaydet="${it.id}">Soruyu bırak</button></div>`}
  function soruHtml(it,s){const y=it.yanitlar||[],q=(s.sorular||[]);if(!y.length&&!q.length)return '';
    const cevapli=new Set(y.map(x=>String(x.q).trim()));
    return `<div class="sorular">${y.map(x=>`<div class="soru-satir"><b>Sorun:</b> ${esc(x.q)}<div class="yanit"><b>Ajan:</b> ${mdSatir(String(x.a||''))}</div></div>`).join('')}${q.filter(x=>!cevapli.has(String(x.q).trim())).map(x=>`<div class="soru-satir bekliyor"><b>Sorun:</b> ${esc(x.q)} <span class="bekle">cevap bekliyor</span></div>`).join('')}</div>`}
  function card(it,done){
    const s=state[it.id]||{};
    const secili=v=>Array.isArray(s.choice)?s.choice.includes(v):s.choice===v,onerilen=v=>Array.isArray(it.recv)?it.recv.includes(v):it.recv===v;
    const opts=(it.options||[]).map((o,oi)=>`<label data-n="${oi<9?oi+1:''}" class="${degisenSik(it,o)?'degisen':''}"><input type="${it.coklu?'checkbox':'radio'}" name="${it.id}" ${it.coklu?`data-coklu="${it.id}"`:''} value="${esc(o.v)}" ${secili(o.v)?'checked':''}><span class="ot">${esc(o.t)}${ayar.onerimAcik&&onerilen(o.v)?'<span class="oneri-rozet">önerilen</span>':''}</span>${o.m?`<span class="maliyet m${ ({yok:0,'düşük':1,orta:2,'yüksek':3})[String(o.m).split(/[\s·,]/)[0].toLocaleLowerCase('tr')]??1}" title="Ajana maliyeti">${esc(o.m)}</span>`:''}${o.d?`<button type="button" class="oac" data-oac aria-expanded="false" title="Ne demek, ötekinden farkı ne">açıkla</button><span class="odesc">${mdSatir(o.d)}</span>`:''}</label>`).join('');
    const steps=(it.steps||[]).map((st,i)=>stepHtml(it,st,i,(s.steps||[])[i])).join('');
    const kararSatir=(s.choice&&secimEtiket(it,s.choice)?`<b>${esc(secimEtiket(it,s.choice))}</b>`:'')+(s.note?(s.choice?' · ':'')+`<span>${esc(s.note)}</span>`:'');
    const ans=done?`<div class="answer"><div class="karar-kart">${kararSatir?`<div><span class="kk-e">Karar</span> ${kararSatir}</div>`:''}${it.sonuc?`<div><span class="kk-e">Sonuç</span> ${mdSatir(it.sonuc)}</div>`:''}${s.gerekce?`<div><span class="kk-e">Gerekçe</span> ${esc(s.gerekce)}</div>`:''}</div>${dosyaNotlari(it.id,s).length?`<div class="ek-notlar"><b>Dosya notları</b><ul>${dosyaNotlari(it.id,s).map(n=>`<li>${esc(n.ad)}: ${esc(n.not)}</li>`).join('')}</ul></div>`:''}${ !secimEtiket(it,s.choice||'')&&!s.note?'<i>'+(isText(it)?'okundu':(it.type==='tech'?'kabul edildi, itiraz yok':'cevapsız tamamlandı'))+'</i>':''}</div>`:'';
    const saat=done&&s.doneAt?(Date.now()-new Date(s.doneAt))/36e5:99,taslak=done&&!s.kesin&&saat<24,yg=done&&yerineGecen(it.id);
    const durumPill=!done?'':(yg?`<span class="pill durum-yerine" title="${esc(yg.id)} bunun yerine geçti">yerine geçti · ${esc(yg.id)}</span>`:(taslak?`<span class="pill durum-taslak" title="24 saat taslak: fikrin değişirse Geri aç; sonra kesinleşir">taslak · ${window.Math.max(1,Math.ceil(24-saat))} sa</span>`:'<span class="pill durum-kesin">kesin</span>'))+(s.kaynak==='merkez'?'<span class="pill merkezden" title="Defter Merkezi\'nden cevaplandı">Merkez\'den</span>':'');
    const oneriyle=!done&&it.recv&&!it.coklu&&!s.choice&&!s.note&&(it.options||[]).length&&!secimSart(it);
    const text=isText(it); const pinned=pins[it.id]!==undefined?pins[it.id]:text;
    const doneLabel=text?'Okudum':'Tamamla';
    const dahaHtml=done?'':`<details class="daha"><summary aria-label="Daha fazla" title="Daha fazla">⋯</summary><div class="daha-menu" role="menu"><button type="button" role="menuitem" data-later="${it.id}">Sona at<small>listenin sonuna gider</small></button><button type="button" role="menuitem" data-gorsel-ekle="${it.id}">Dosya ekle<small>görsel, video, PDF</small></button><button type="button" role="menuitem" data-gerekce-ac="${it.id}">Gerekçe yaz<small>neden böyle karar verdim</small></button>${text?`<button type="button" role="menuitem" data-pin="${it.id}" aria-pressed="${pinned}">Notu sabitle<small>okurken not kutusu altta dursun</small></button>`:''}${text&&window.speechSynthesis?`<button type="button" role="menuitem" class="dinle" data-dinle="${it.id}">Dinle</button>`:''}${it.due?`<a role="menuitem" href="${takvimUrl(it)}" target="_blank" rel="noopener">📅 Takvime ekle</a>`:''}${ornek&&!it._mine?`<button type="button" role="menuitem" data-acikla="${it.id}">Bunu açıkla<small>Claude sayfada hemen cevaplar; ajan uyanmaz</small></button>`:''}${it._mine?'':`<button type="button" role="menuitem" data-gereksiz="${it.id}">Bu soru gereksizdi<small>ajan bu türü bir daha sormaz, kendisi karar verir</small></button>`}<button type="button" role="menuitem" data-bag="${it.id}">Bağlantıyı kopyala<small>bu maddeye doğrudan açılır</small></button>${ !db&&!it._mine?`<button type="button" role="menuitem" data-gonder="${it.id}">Claude'a gönder<small>cevabı kopyalar</small></button>`:''}</div></details>`;
    const ph=it.type==='tech'?'Tamam / itiraz':(it.type==='task'?'Sonuç: dosya yolu, bağlantı, takıldığın yer':(text?'Metne dair soruların, notların':'Not'));
    return `<article class="card ${it.priority===1&&!done?'urgent':''} ${done?'done':''} ${done&&s.teyit?'teyitli':''} ${pinned&&!done?'pin':''} ${it._mine?'mine':''} ${s.collapsed&&!done?'min':''}" data-id="${it.id}">
      <div class="head">${done?'':`<span class="ctl"><button class="min-btn" data-min="${it.id}" title="${s.collapsed?'Aç':'Küçült (devam ediyor)'}" aria-expanded="${ !s.collapsed}">${s.collapsed?'▸':'▾'}</button><span class="drag" data-drag="${it.id}" title="Sürükleyip sırala">≡</span></span>`}${ !done?`<input type="checkbox" class="toplu-sec" data-toplu="${it.id}" aria-label="${it.id} seç" ${topluSecili.has(it.id)?'checked':''}>`:''}<span class="id">${it.id}</span><h3 class="title">${esc(baslik(it.title))}</h3>${durumPill}${ !done&&bekledi(it)?`<span class="pill bekleme" title="Bu madde ${bekledi(it)} gündür cevap bekliyor">${bekledi(it)} gündür</span>`:''}${ !done&&yeniMi(it)?`<span class="pill yeni">${yeniMi(it)==='yeni'?'yeni':'değişti'}</span>`:''}${it.risk&&riskAd[it.risk]?`<span class="pill risk r-${it.risk}" title="${riskAd[it.risk][1]}">${riskAd[it.risk][0]}</span>`:''}<span class="pill p${it.priority}">${oncelikAd(it.priority)}</span>${it._mine?'<span class="pill design">senden</span>':`<span class="pill ${it.type==='design'?'design':(it.type==='task'?'task':'')}" title="${esc((FT[it.type]||['',''])[1])}">${turEtiket(it.type)}</span>`}${s.collapsed&&!done?'<span class="pill going">devam ediyor</span>':''}${s.later&&!done?'<span class="pill sonra" title="Listenin sonuna atıldı">sonraya atıldı</span>':''}${it.due&&!done?`<span class="pill due" title="Termin">⏱ ${esc(fmtDue(it.due))}</span>`:''}${dahaHtml}</div>${ortakHtml(it,s)}
      ${it.daci?`<p class="daci">${ [['karar','Karar veren'],['danis','Danışılan'],['haber','Haber verilen']].filter(([k])=>it.daci[k]).map(([k,l])=>`${l}: <b>${esc(it.daci[k])}</b>`).join(' · ')}</p>`:''}${it.yerine?`<p class="zincir">Bu madde <b>${esc(it.yerine)}</b> kararının yerine geçer.</p>`:''}
      ${done&&(it.ekler||[]).length?`<div class="gorseller">${ekSerit(it)}</div>`:''}
      ${ (it.docs||[]).length?`<div class="docs">${it.docs.map(d=>`<span class="doc">${esc(d)}</span>`).join('')}</div>`:''}
      ${done?ans+((s.history||[]).length?`<div class="hist">Önceki cevap: ${esc((s.history.at(-1).choice?((it.options||[]).find(o=>o.v===s.history.at(-1).choice)?.t||s.history.at(-1).choice)+' ':'')+(s.history.at(-1).note||''))}</div>`:''):`
      ${ayar.onerimAcik&&it.rec&&!done?`<div class="rec acik${window.String(it.rec).length>240?' uzun':''}" ${window.String(it.rec).length>240?'title="Devamı için dokun"':''}><b>Önerim:</b> ${isaretAc(mdSatir(degisenIsaretle(it,it.rec)))}</div>`:''}
      ${it.why?`<details class="why"><summary>Neden soruyorum</summary><div class="why-in">${isaretAc(md(degisenIsaretle(it,it.why)))}</div>${it.rec&&!ayar.onerimAcik?`<div class="rec"><b>Önerim:</b> ${mdSatir(it.rec)}</div>`:''}</details>`:(it.rec&&!ayar.onerimAcik?`<div class="rec"><b>Önerim:</b> ${mdSatir(it.rec)}</div>`:'')}
      ${it.dene&&!done?`<div class="dene"><span class="rozet">dene</span><span>Seçeneği işaretle; sayfa hemen o hâle geçer, sonra Tamamla.</span></div>`:''}
      ${text?`<div class="body ${ayar.raporKatla&&!acikRapor.has(it.id)&&!done?'katla':''}">${isaretAc(md(done?it.body:degisenIsaretle(it,it.body)))}</div>${ayar.raporKatla&&!done?`<button class="devam" data-devam="${it.id}">${acikRapor.has(it.id)?'Daralt':'Devamını oku'}</button>`:''}`:''}
      ${ !done&&it.degisti&&yeniMi(it)==='degisti'?`<div class="degisti-satir"><b>Değişti:</b> ${mdSatir(it.degisti)}</div>`:''}
      ${window.Array.isArray(it.karsilastir)&&it.karsilastir.length===2?karsiHtml(it.karsilastir):''}
      ${steps?`<ol class="steps">${steps}</ol>`:''}${it.deliver?`<div class="deliver"><b>Bana getireceğin:</b> ${mdSatir(it.deliver)}</div>`:''}
      ${opts?`<div class="opts" role="radiogroup" aria-label="${esc(it.title)}">${opts}</div>`:''}
      ${soruHtml(it,s)}${aciklama.has(it.id)?aciklaHtml(it):''}
      <div class="notewrap"><div class="not-sar"><textarea id="note-${it.id}" data-note="${it.id}" rows="1" aria-label="Not: ${esc(it.title)}" placeholder="${ph}">${esc(s.note||'')}</textarea><button type="button" class="ek-btn" data-gorsel-ekle="${it.id}" title="Dosya ekle: görsel, video, PDF (kartın üstüne sürükleyip de bırakabilirsin; ekran görüntüsünü yapıştırabilirsin)" aria-label="Dosya ekle">${ikonEk}</button><button type="button" class="dikte" data-dikte="note-${it.id}" title="Sesle yaz" aria-label="Sesle yaz">🎙</button></div>${hazirHtml(it)}
      <div class="gerekce-sar" ${s.gerekce?'':'hidden'}><input data-gerekce="${it.id}" value="${esc(s.gerekce||'')}" placeholder="Neden böyle karar verdim (isteğe bağlı; aylar sonra tez ya da ekip için kalır)" aria-label="Gerekçe"></div>
      <div class="gorseller">${ekSerit(it)}${ (s.gorseller||[]).map((g,i)=>`<span class="gorsel-sar">${gorselKutu(it.id,g,i)}<button type="button" class="gorsel-sil" data-gorsel-sil="${it.id}" data-i="${i}" title="Kaldır" aria-label="Kaldır">✕</button></span>`).join('')}</div>`}
      ${done&&it.onay?`<div class="teyit-satir ${s.teyit?'tamam':''}"><span>${s.teyit?'Teyit edildi':'Teyit bekliyor'}: <b>${esc(it.onay)}</b>${s.teyit?' · '+esc(String(s.teyit).slice(0,10)):''}</span><button type="button" class="hz kucuk" data-teyit="${it.id}">${s.teyit?'Geri al':'Teyit edildi'}</button></div>`:''}
      <div class="foot">${done?(it.resolved?'':`<button class="btn ghost" data-reopen="${it.id}">Geri aç</button>${taslak?`<button class="btn ghost" data-kesin="${it.id}" title="Taslak beklemeden kesinleşsin">Kesinleştir</button>`:''}`):`<button class="btn" data-done="${it.id}" ${oneriyle?'data-oneriyle="1" title="Seçim yapmadın: ajanın önerisiyle tamamlanır"':''}>${oneriyle?'Öneriyle tamamla':doneLabel}</button>${hizliHtml(it)}`}<span class="saved" data-saved="${it.id}">${s.updatedAt?'kaydedildi':''}</span></div>${done?'':soruKutuHtml(it)+'</div>'}
    </article>`;
  }
  // ── ekler ve medya listesi
  const medyaTuru=u=>{if(/^https?:\/\//i.test(String(u||'')))return'baglanti';const x=String(u||'').split(/[?#]/)[0].toLowerCase();if(/\.pdf$/.test(x))return'pdf';if(/\.html?$/.test(x))return'html';if(/\.(md|markdown|txt)$/.test(x))return'metin';if(/\.(mp4|webm|mov|m4v|ogv)$/.test(x))return'video';if(/\.(jpe?g|png|gif|webp|avif|svg|bmp)$/.test(x)||!/\.[a-z0-9]{2,5}$/.test(x))return'resim';return'dosya'};
  const turu=g=>(g&&g.tur)||medyaTuru(g&&g.url);
  const turAd={pdf:'PDF',html:'Sayfa',video:'Video',resim:'Görsel',metin:'Metin',baglanti:'Bağlantı',dosya:'Dosya',paket:'Paket'};
  const gorselAdi=(g,i)=>g.ad||g.alt||((turu(g)==='video'?'Video ':(turu(g)==='resim'?'Görsel ':turAd[turu(g)]+' '))+(i+1));
  const ekNotu=(id,j)=>(((state[id]||{}).ekNot)||{})[j]||'';
  const kapakAni=u=>{let h=0;for(const c of String(u))h=(h*31+c.charCodeAt(0))>>>0;return .15+(h%1000)/1000*.7};
  const dosyaAdi=u=>{try{return decodeURIComponent(String(u).split(/[?#]/)[0].split('/').pop())}catch(e){return String(u)}};
  function ekSerit(it){return (it.ekler||[]).map((e,j)=>{const tr=turu(e),ad=e.ad||dosyaAdi(e.url),nt=ekNotu(it.id,j)?' notlu':'';
    if(tr==='baglanti')return `<button type="button" class="gorsel ek${nt}" data-ek-ac="${it.id}" data-j="${j}" title="${esc(ad)}" aria-label="Bağlantı: ${esc(ad)}, aç"><b>${turAd[tr]}</b><span>${esc(ad)}</span></button>`;
    if(tr==='resim')return `<button type="button" class="gorsel${nt}" data-ek-ac="${it.id}" data-j="${j}" title="${esc(ad)}" aria-label="${esc(ad)}, aç"><img src="${esc(e.url)}" alt=""></button>`;
    if(tr==='video')return `<button type="button" class="gorsel${nt}" data-ek-ac="${it.id}" data-j="${j}" title="${esc(ad)}" aria-label="Video: ${esc(ad)}, aç"><video src="${esc(e.url)}" data-kapak muted preload="metadata" playsinline></video><span class="oynat">▶</span></button>`;
    return `<button type="button" class="gorsel ek${nt}" data-ek-ac="${it.id}" data-j="${j}" title="${esc(ad)}" aria-label="${turAd[tr]}: ${esc(ad)}, aç"><b>${turAd[tr]}</b><span>${esc(ad)}</span></button>`}).join('')}
  function gorselKutu(id,g,i){const tr=turu(g),ad=gorselAdi(g,i),nt=g.not?' notlu':'';
    if(tr==='video')return `<button type="button" class="gorsel${nt}" data-gorsel-ac="${id}" data-i="${i}" title="${esc(ad)}" aria-label="${esc(ad)}, aç"><video src="${esc(g.url)}" data-kapak muted preload="metadata" playsinline></video><span class="oynat">▶</span>${g.ornek?'<span class="im" style="background:var(--going);color:var(--going-ink)">örnek</span>':''}</button>`;
    if(tr==='pdf'||tr==='html'||tr==='metin'||tr==='dosya')return `<button type="button" class="gorsel ek${nt}" data-gorsel-ac="${id}" data-i="${i}" title="${esc(ad)}" aria-label="${esc(ad)}, aç"><b>${turAd[tr]}</b><span>${esc(ad)}</span></button>`;
    return `<button type="button" class="gorsel${nt}" data-gorsel-ac="${id}" data-i="${i}" title="${esc(ad)}: büyüt ve üzerine çiz" aria-label="${esc(ad)}, büyüt ve üzerine çiz"><img src="${esc(g.url)}" alt="">${g.cizili?'<span class="im">çizili</span>':(g.ornek?'<span class="im" style="background:var(--going);color:var(--going-ink)">örnek</span>':'')}</button>`}
  function dosyaNotlari(id,d){const it=maddeBul(id)||{};d=d||state[id]||{};const l=[];
    (it.ekler||[]).forEach((e,j)=>{const n=((d.ekNot||{})[j]||'').trim();if(n)l.push({ad:e.ad||dosyaAdi(e.url),tur:turu(e),not:n})});
    (Array.isArray(it.karsilastir)?it.karsilastir:[]).forEach((x,j)=>{const n=((d.karsiNot||{})[j]||'').trim();if(n)l.push({ad:'Karşılaştırma · '+(x.ad||(j?'Sonra':'Önce')),tur:'gorsel',not:n})});
    (d.gorseller||[]).forEach((g,i)=>{const n=(g.not||'').trim();if(n)l.push({ad:gorselAdi(g,i),tur:turu(g),not:n});
      (g.igneler||[]).forEach((p,k)=>{const t=(p.not||'').trim();if(t)l.push({ad:gorselAdi(g,i)+' · iğne '+(k+1),tur:'igne',not:t})})});return l}
  function maddeBul(id){return D.items.find(x=>x.id===id)||mine().find(x=>x.id===id)||(String(id).startsWith('SN-')&&D.senaryo?snMadde(String(id).slice(3)):null)}
  function medya(id){const it=maddeBul(id)||{};
    const ek=(it.ekler||[]).map((e,j)=>({k:'ek',j,url:e.url,ad:e.ad||dosyaAdi(e.url),tur:turu(e),not:ekNotu(id,j),dosyalar:e.dosyalar,klasor:e.klasor,zipAdi:e.zipAdi}));
    const g=((state[id]||{}).gorseller||[]).map((x,i)=>({k:'g',i,url:x.url,ad:gorselAdi(x,i),tur:turu(x),not:x.not||''}));
    const kg=(Array.isArray(it.karsilastir)&&it.karsilastir.length===2?it.karsilastir:[]).map((x,j)=>({k:'k',j,url:x.url,ad:x.ad||(j?'Sonra':'Önce'),tur:'resim',not:((state[id]||{}).karsiNot||{})[j]||''}));
    return ek.concat(g,kg)}
  function karsiHtml(k){const [a,b]=k;return `<div class="karsi-sar"><div class="karsi"><img src="${esc(b.url)}" alt="${esc(b.ad||'Sonra')}" decoding="async" loading="lazy"><div class="karsi-ust"><img src="${esc(a.url)}" alt="${esc(a.ad||'Önce')}" decoding="async" loading="lazy"></div><span class="karsi-cizgi"></span><span class="karsi-etiket sol">${esc(a.ad||'Önce')}</span><span class="karsi-etiket sag">${esc(b.ad||'Sonra')}</span><input type="range" class="karsi-sur" min="0" max="100" value="50" aria-label="${esc((a.ad||'Önce')+' / '+(b.ad||'Sonra'))}"></div></div>`}
  function takvimUrl(it){const g=String(it.due).replace(/-/g,'').slice(0,8),d=new Date;d.setDate(d.getDate()+1);
    const g2=d.toISOString().slice(0,10).replace(/-/g,'');const t=String(it.title).replace(/^[✎⚙ⓘ▤☐]\s*/,'');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(t)+'&dates='+g+'/'+g2+'&details='+encodeURIComponent('Karar Defteri: '+D.title+' ('+it.id+')')}
  let sekme=(()=>{try{return localStorage.getItem('kd-sekme-'+D.id)||'open'}catch(e){return 'open'}})();
  function setSekme(v){if(v!=='open'&&v!=='done'&&!document.getElementById('panel-'+v))v='open';sekme=v;try{localStorage.setItem('kd-sekme-'+D.id,v)}catch(e){}
    $('panelOpen').hidden=v!=='open';$('panelDone').hidden=v!=='done';
    $('tabOpen').setAttribute('aria-selected',v==='open');$('tabDone').setAttribute('aria-selected',v==='done');
    document.querySelectorAll('.sayfa-panel').forEach(x=>{x.hidden=x.id!=='panel-'+v});const kapaliP=!!(document.getElementById('panel-'+v)||{dataset:{}}).dataset.kapali;document.querySelectorAll('.tab[data-sayfa]').forEach(x=>x.setAttribute('aria-selected',x.dataset.sekme===v||(kapaliP&&x.dataset.sekme==='s-_diger')));
    document.querySelector('.addbox')&&(document.querySelector('.addbox').hidden=v!=='open')}
  function render(){
    const items=D.items.filter(it=>!it.resolved).concat(mine()).map((it,i)=>Object.assign({_i:i},it));
    const vis=it=>(filter==='all'||it.type===filter)&&(!onlyUrgent||it.priority===1);
    const manual=(state._sira&&state._sira.ids)||[];
    const rank=id=>{const i=manual.indexOf(id);return i<0?Infinity:i};
    const open=items.filter(it=>!isDone(it)).sort((a,b)=>rank(a.id)-rank(b.id)||((state[a.id]||{}).later?1:0)-((state[b.id]||{}).later?1:0)||a.priority-b.priority||a._i-b._i);
    open.forEach((it,i)=>{it._first=i===0;it._last=i===open.length-1});
    lastOpen=open.map(it=>it.id);
    const prevIdx=new Map(prevOpen.map((id,i)=>[id,i]));
    const y=window.scrollY;
    const done=items.filter(isDone).sort((a,b)=>((state[b.id]||{}).doneAt||'').localeCompare((state[a.id]||{}).doneAt||''));
    const minis=open.filter(it=>(state[it.id]||{}).collapsed);const shown=open.filter(it=>!(state[it.id]||{}).collapsed);
    $('strip').hidden=!minis.length;
    $('strip').innerHTML=minis.map((it,i)=>`<div class="row" data-id="${it.id}"><button class="min-btn" data-min="${it.id}" title="Aç" aria-expanded="false">▸</button><span class="n">${i+1}</span><span class="id">${it.id}</span><span class="t">${esc(it.title)}</span><span class="pill going">devam ediyor</span></div>`).join('');
    const sinirN=+D.sinir||20;
    $('open').innerHTML=(open.length>sinirN&&!state._boyUyari?`<div class="boy-uyari"><span>Defter <b>${open.length}</b> açık maddeyle şişti; her okuma pahalılaşır.</span><button class="btn ghost" type="button" data-boy>Ajana eskileri arşivlemesini söyle</button></div>`:'')+shown.filter(vis).map(it=>card(it,false)).join('')||'<div class="empty">Cevaplanacak madde kalmadı. Ajan bir sonraki turda buradan okur. <button class="btn ghost" data-sekme="done" style="margin-left:10px">Bitti sekmesine geç</button></div>';
    const nowIds=shown.filter(vis).map(it=>it.id);
    if(prevOpen.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){nowIds.forEach((id,i)=>{const pi=prevIdx.get(id);if(pi===undefined||pi>i){const el=document.querySelector(`#open .card[data-id="${id}"]`);if(el){el.classList.add('enter');if(i===0)el.classList.add('first')}}})}
    prevOpen=nowIds;
    odakUygula(nowIds);topluCiz();ciktiKutulari();kisiAdlari();rozetCiz();if(D.senaryo)senaryoCiz();
    requestAnimationFrame(()=>{
      if(ilkeDon){ilkeDon=false;const h=hedefId&&document.querySelector(`#open .card[data-id="${hedefId}"]`);hedefId=null;if(h){korumaSonu=Date.now()+1500;h.scrollIntoView({block:'start',behavior:yumusak()})}else ilkeGit()}
      else if(Date.now()>korumaSonu&&window.scrollY!==y&&document.documentElement.scrollHeight>window.innerHeight+2)window.scrollTo(0,y);
    });
    const ara=(($('bittiAra')||{}).value||'').trim().toLocaleLowerCase('tr');
    const bul=it=>{if(!ara)return true;const st=state[it.id]||{};return [it.id,it.title,it.why,it.body,st.note,st.label].join(' ').toLocaleLowerCase('tr').includes(ara)};
    $('done').innerHTML=done.filter(vis).filter(bul).map(it=>card(it,true)).join('')||'<div class="empty">Henüz tamamlanan yok.</div>';
    const gor=shown.filter(vis).length+minis.length;$('openCount').textContent=(gor!==open.length?gor+' / ':'')+open.length+' madde'; $('doneCount').textContent=done.length+' madde';
    const n=done.length,tot=items.length; $('count').textContent=n+' / '+tot;
    $('mOpen').textContent=open.length;$('mDone').textContent=done.length;{const na=open.filter(x=>x.priority===1).length,sz=sessizMi();$('mAcil').textContent=na;document.title=(na&&!sz?'('+na+') ':'')+D.title;$('mAcilNokta').hidden=!na||sz;$('menuBtn').dataset.nokta=na&&!sz?'1':''} $('barfill').style.width=Math.round(100*n/Math.max(1,tot))+'%';
    $('quick').innerHTML=bugunHtml(open);
    geriSeritCiz();
  }
  function hepsiBitti(){const acik=D.items.filter(it=>!it.resolved&&!(state[it.id]||{}).done).length;if(!acik&&!sessizMi()&&!$('haberBtn').hidden&&!$('haberBtn').disabled){$('haberBtn').classList.add('nabiz');setStatus('hepsi tamam; "Ajana haber ver"e basabilirsin','ok')}}
  function complete(id){setTimeout(hepsiBitti,300);kaydet_geri('tamamlama',[id]);sonIslem={id,ne:'Bitti sekmesine geçti',t:Date.now()};
    if(ayar.tamamlaGit==='siradaki'){const sira=[...document.querySelectorAll('#open .card')].map(c=>c.dataset.id);const i=sira.indexOf(id);hedefId=sira[i+1]||sira[i-1]||null}clearTimeout(timers.get(id));timers.delete(id);state[id]=Object.assign({},state[id],{done:true,doneAt:new Date().toISOString(),later:false});persist(id);ilkeDon=ayar.tamamlaGit!=='yerinde';render()}
  document.addEventListener('input',e=>{const t=e.target;
    if(t.dataset&&t.dataset.sahneNot){const id='SN-'+t.dataset.sahneNot;state[id]=Object.assign({},state[id],{not:t.value.trim()});sched(id);return}
    if(t.dataset&&t.dataset.sahneSure){const id='SN-'+t.dataset.sahneSure,v=t.value.trim();state[id]=Object.assign({},state[id]);if(v==='')delete state[id].sure;else state[id].sure=window.Math.max(0,window.Math.round(+v));sched(id);snZamanCiz();return}
    if(t.dataset&&t.dataset.cikti){const id=t.dataset.cikti,n=t.dataset.n;const kk=t.closest('.cikti')&&t.closest('.cikti').previousElementSibling;const pre=kk&&kk.querySelector('pre');
      state[id]=Object.assign({},state[id]);const c=Object.assign({},state[id].ciktilar);if(t.value.trim())c[n]={k:pre?pre.textContent.split('\n')[0].slice(0,80):'',m:t.value.slice(-8000)};else delete c[n];state[id].ciktilar=c;sched(id);return}
    if(t.dataset&&t.dataset.tuvalnot){if(!tv.id)return;const id=tv.id;const m=medya(id)[tv.n];if(!m)return;
      state[id]=Object.assign({},state[id]);const v=t.value.trim();
      if(m.k==='g'){const l=(state[id].gorseller||[]).slice();if(l[m.i])l[m.i]=Object.assign({},l[m.i],{not:v});state[id].gorseller=l}
      else if(m.k==='k')state[id].karsiNot=Object.assign({},state[id].karsiNot,{[m.j]:v});
      else state[id].ekNot=Object.assign({},state[id].ekNot,{[m.j]:v});
      $('tuvalKayit').textContent='yazılıyor…';sched(id);return}
    if(t.dataset.gerekce){const id=t.dataset.gerekce;state[id]=Object.assign({},state[id],{gerekce:t.value.trim()});sched(id);return}
    if(t.dataset.note&&!CSS.supports('field-sizing','content')){t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,innerHeight*.4)+'px'}
    if(t.dataset.step){const id=t.dataset.step;state[id]=state[id]||{};const a=(state[id].steps||[]).slice();a[+t.dataset.i]=t.checked;state[id].steps=a;sched(id);return}
    const id=t.dataset.note||t.name;if(!id)return;state[id]=state[id]||{};if(t.dataset.note)state[id].note=t.value.trim();if(t.dataset.coklu){state[id].choice=[...document.querySelectorAll(`input[data-coklu="${window.CSS.escape(id)}"]:checked`)].map(x=>x.value);sched(id);return}if(t.type==='radio'){state[id].choice=t.value;const it=D.items.find(x=>x.id===id);if(it&&it.dene){sched(id);ayarUygula(it,t.value);return}}const s=document.querySelector(`[data-saved="${id}"]`);if(s)s.textContent='';sched(id)});
  const notlar=()=>[...document.querySelectorAll('#panelOpen textarea[data-note]')];
  const kartlar=()=>[...document.querySelectorAll('#panelOpen .card')];
  function odakla(i){const k=kartlar();if(!k.length)return;odak=Math.max(0,Math.min(k.length-1,i));document.body.classList.add('klavye');
    k.forEach(c=>c.classList.remove('kfocus'));const c=k[odak];c.classList.add('kfocus');
    korumaSonu=Date.now()+1200;c.scrollIntoView({block:'start',behavior:yumusak()})}
  const keysAc=g=>{$('keys').hidden=g===undefined?!$('keys').hidden:!g};
  document.addEventListener('keydown',e=>{
    const t=e.target;
    if(t.dataset&&t.dataset.note){
      if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();state[t.dataset.note]=Object.assign({},state[t.dataset.note],{note:t.value.trim()});complete(t.dataset.note);return}
      if(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){const l=notlar(),i=l.indexOf(t),n=l[i+(e.key==='ArrowUp'?-1:1)];
        if(i>=0&&n){e.preventDefault();n.focus();korumaSonu=Date.now()+1200;n.closest('.card').scrollIntoView({block:'start',behavior:yumusak()})}}
      return;
    }
    if(!$('tuval').hidden&&(e.ctrlKey||e.metaKey)&&!e.altKey){
      if(e.key==='+'||e.key==='='||e.code==='NumpadAdd'){e.preventDefault();yakinlas(1.25);return}
      if(e.key==='-'||e.code==='NumpadSubtract'){e.preventDefault();yakinlas(1/1.25);return}
      if(e.key==='0'||e.code==='Numpad0'){e.preventDefault();yakinlas(0);return}}
    if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')&&!e.shiftKey){
      if(!$('tuval').hidden){e.preventDefault();
        if($('tuval').dataset.kip==='resim')cizgiGeriAl();
        return}
      if(t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&!['radio','checkbox'].includes(t.type)))return;
      e.preventDefault();geriAl();return}
    if(e.key==='Escape'){keysAc(false);if(!$('tuval').hidden)tuvalKapatSor();return}
    if(!$('tuval').hidden&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
      if(t.tagName==='TEXTAREA'||t.tagName==='INPUT')return;
      e.preventDefault();medyaGec(e.key==='ArrowRight'?1:-1);return}
    if(t.dataset&&t.dataset.aciklaSoru){if(e.key==='Enter'){e.preventDefault();aciklaSor(t.dataset.aciklaSoru)}return}
    if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&t.tagName!=='BUTTON'&&t.tagName!=='A'&&t.tagName!=='SUMMARY'&&t.tagName!=='TEXTAREA'&&!(t.tagName==='INPUT'&&t.type==='checkbox')){
      const kart=t.closest&&t.closest('#panelOpen .card');
      if(kart){e.preventDefault();const b=kart.querySelector('[data-done]');if(b)b.click();else complete(kart.dataset.id);return}
    }
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='k'||e.key==='K')){e.preventDefault();paletAc();return}
    if(editing()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='?'){e.preventDefault();keysAc();return}
    if(e.key==='/'){e.preventDefault();paletAc();return}
    if(e.key==='f'&&sekme==='open'){e.preventDefault();odakKur(!odakKip);return}
    if(odakKip&&(e.key==='ArrowRight'||e.key==='ArrowLeft')&&$('tuval').hidden){e.preventDefault();odakGec(e.key==='ArrowRight'?1:-1);return}
    const k=kartlar();if(!k.length)return;
    if(e.key==='j'||e.key==='ArrowDown'&&e.shiftKey){e.preventDefault();odakla(odak+1);return}
    if(e.key==='k'||e.key==='ArrowUp'&&e.shiftKey){e.preventDefault();odakla(odak-1);return}
    if(e.key==='Enter'&&/^(BUTTON|A|SUMMARY|INPUT|SELECT|TEXTAREA|LABEL)$/.test(t.tagName))return; // düğmede Enter düğmenindir
    if(odak<0||!k[odak]){if(e.key==='Enter'||/^[1-9]$/.test(e.key)){odakla(0)}else return}
    const kart=k[odak];if(!kart)return;const id=kart.dataset.id;
    if(e.key==='n'){e.preventDefault();const n=kart.querySelector('textarea[data-note]');if(n)n.focus();return}
    if(e.key==='c'){e.preventDefault();const mb=kart.querySelector('.min-btn');if(mb)mb.click();return}
    if(e.key==='Enter'){e.preventDefault();const b=kart.querySelector('[data-done]');if(b)b.click();else complete(id);setTimeout(()=>odakla(odak),60);return}
    if(/^[1-9]$/.test(e.key)){const r=kart.querySelectorAll('.opts input')[+e.key-1];
      if(r){e.preventDefault();r.checked=r.type==='checkbox'?!r.checked:true;r.dispatchEvent(new Event('input',{bubbles:true}))}}
  });
  document.addEventListener('click',e=>{
    const kp=e.target.closest('[data-kopyala]');if(kp){e.preventDefault();e.stopPropagation();kopyala(kp);return}
    const kl=e.target.closest('a[href="#kilavuz"]');if(kl){$('kilavuz').open=true}
    const satir=e.target.closest('#strip .row');
    if(satir&&!e.target.closest('button')){const id=satir.dataset.id;kaydet_geri('açma',[id]);state[id]=Object.assign({},state[id],{collapsed:false});persist(id);render();vurgula(id);return}
    const ekAc=e.target.closest('[data-ek-ac]');
    if(ekAc){medyaAc(ekAc.dataset.ekAc,+ekAc.dataset.j);return}
    const ac=e.target.closest('[data-gorsel-ac]');
    if(ac&&!e.target.closest('.gorsel-sil')){const id=ac.dataset.gorselAc;medyaAc(id,((maddeBul(id)||{}).ekler||[]).length+(+ac.dataset.i));return}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.min){const id=b.dataset.min;kaydet_geri('küçültme',[id]);const kapaniyor=!(state[id]||{}).collapsed;state[id]=Object.assign({},state[id],{collapsed:kapaniyor});persist(id);ilkeDon=kapaniyor;render();return}
    if(b.dataset.done){const id=b.dataset.done;const k=document.querySelector(`textarea[data-note="${id}"]`);if(k)state[id]=Object.assign({},state[id],{note:k.value.trim()});
      if(b.dataset.oneriyle){const it=maddeBul(id);if(it&&it.recv&&!state[id].choice&&!state[id].note)state[id]=Object.assign({},state[id],{choice:it.recv,note:'Tamam'})}
      {const it=maddeBul(id),st=state[id]||{};const bos=!st.choice||(Array.isArray(st.choice)&&!st.choice.length);if(secimSart(it)&&bos&&!st.note){setStatus(id+': '+(riskli(it)?'geri alınması zor bir iş':'acil madde')+'; önce bir şık seç ya da not yaz','uyari');return}}
      complete(id);return}
    if(b.dataset.kesin){const id=b.dataset.kesin;state[id]=Object.assign({},state[id],{kesin:new Date().toISOString()});persist(id);render();setStatus(id+' kesinleşti','ok');return}
    if(b.dataset.gerekceAc){const id=b.dataset.gerekceAc;const c=b.closest('.card');b.closest('details').open=false;const g=c.querySelector('.gerekce-sar');g.hidden=false;g.querySelector('input').focus();return}
    if(b.dataset.gereksiz){const id=b.dataset.gereksiz;b.closest('details').open=false;state[id]=Object.assign({},state[id],{gereksiz:true,note:'Bu soru gereksizdi; bu türde sen karar ver, ⚙ olarak bildir'});complete(id);setStatus(id+' gereksiz işaretlendi; ajan bu türü kendisi karar verir','ok');return}
    if(b.dataset.bag){const id=b.dataset.bag;b.closest('details').open=false;let u=D.url||'';if(!u)try{u=(window.top===window?location.href:document.referrer||location.href).split('#')[0]}catch(e){u=location.href.split('#')[0]}
      navigator.clipboard.writeText(u+'#'+id).then(()=>setStatus('bağlantı kopyalandı: '+id,'ok'),()=>setStatus('kopyalanamadı','uyari'));return}
    if(b.dataset.reopen){const id=b.dataset.reopen;kaydet_geri('geri açma',[id]);const cur=state[id]||{};const h=(cur.history||[]).concat([{choice:cur.choice,note:cur.note,doneAt:cur.doneAt}]).slice(-5);state[id]=Object.assign({},cur,{done:false,history:h});persist(id);setSekme('open');render();vurgula(id);setStatus(id+' tekrar açıldı','ok')}
    if(b.id==='acceptAll'){menuAc(false);
      const items=D.items.filter(it=>!it.resolved&&!isDone(it)&&it.priority>1&&(it.rec||it.recv));
      if(!items.length){setStatus('kabul edilecek öneri yok; acil maddeler tek tek cevaplanır','');return}
      if(kabulSaat===null){
        b.dataset.eski=b.dataset.eski||b.textContent;
        b.textContent=items.length+' maddeyi kabul et: tekrar bas';
        b.classList.add('onay');
        const senin=items.filter(it=>(state[it.id]||{}).choice).length;
        setStatus(items.length+' madde tamamlanacak (acil hariç)'+(senin?'; '+senin+' maddede senin seçimin var, korunacak':'')+'; onaylamak için tekrar bas','');
        kabulSaat=setTimeout(()=>{kabulSaat=null;b.textContent=b.dataset.eski;b.classList.remove('onay');setStatus('vazgeçildi','')},6000);
        return;
      }
      clearTimeout(kabulSaat);kabulSaat=null;b.textContent=b.dataset.eski;b.classList.remove('onay');
      kaydet_geri('önerileri kabul',items.map(it=>it.id));
      items.forEach(it=>{const rv=it.recv||((it.options||[])[0]||{}).v;
        const secim=(state[it.id]||{}).choice||(it.options?rv:null);
        state[it.id]=Object.assign({},state[it.id],secim?{choice:secim}:{},{note:(state[it.id]||{}).note||'önerildiği gibi',done:true,doneAt:new Date().toISOString(),later:false});
        persist(it.id)});
      ilkeDon=true;render();
      setStatus(items.length+' madde kabul edildi; Ctrl+Z geri alır','ok');
      return;
    }
    if(b.dataset.geriAl!==undefined){sonIslem=null;geriAl();return}
    if(b.dataset.devam){const id=b.dataset.devam;if(acikRapor.has(id))acikRapor.delete(id);else acikRapor.add(id);render();if(!acikRapor.has(id))vurgula(id);return}
    if(b.id==='suzBtn'){const t=document.querySelector('.tools');t.classList.toggle('acik');b.setAttribute('aria-expanded',t.classList.contains('acik'));return}
    if(b.dataset.gorselEkle){bekleyenId=b.dataset.gorselEkle;$('dosya').click();return}
    if(b.dataset.gorselSil){const id=b.dataset.gorselSil,i=+b.dataset.i;
      const liste=((state[id]||{}).gorseller||[]).slice();if(!liste[i])return;
      kaydet_geri('görsel silme',[id]);liste.splice(i,1);
      state[id]=Object.assign({},state[id],{gorseller:liste});persist(id);render();setStatus('görsel kaldırıldı (Ctrl+Z geri alır)','ok');return}
    if(b.dataset.sekme){setSekme(b.dataset.sekme);return}
    if(b.dataset.move){const id=b.dataset.move,yon=+b.dataset.yon;
      const ids=[...document.querySelectorAll('#open .card')].map(c=>c.dataset.id);
      const i=ids.indexOf(id),j=i+yon;if(i<0||j<0||j>=ids.length)return;
      kaydet_geri('sıra değişikliği',['_sira']);ids.splice(j,0,ids.splice(i,1)[0]);state._sira={ids};persist('_sira');render();
      requestAnimationFrame(()=>{const el=document.querySelector(`#open .card[data-id="${id}"]`);if(el){el.classList.add('kfocus');korumaSonu=Date.now()+1200;el.scrollIntoView({block:'center',behavior:yumusak()})}});
      return}
    if(b.dataset.later){const id=b.dataset.later;kaydet_geri('sonraya atma',[id]);state[id]=Object.assign({},state[id],{later:true});persist(id);render();setStatus(id+' listenin sonuna atıldı; Ctrl+Z geri alır','ok')}
    if(b.dataset.pin){const id=b.dataset.pin;pins[id]=!(pins[id]!==undefined?pins[id]:true);const c=b.closest('.card');c.classList.toggle('pin',pins[id]);b.setAttribute('aria-pressed',pins[id])}
  });
  // ── sürükle-bırak sıralama (pointer: fare + dokunma)
  let drag=null, dragOnce=null;
  document.addEventListener('pointerdown',e=>{const h=e.target.closest('.drag');if(!h)return;if(filter!=='all'||onlyUrgent){setStatus('sıralamak için süzgeci kapat','');return}
    const card=h.closest('.card');drag={id:h.dataset.drag,card};dragOnce=[...document.querySelectorAll('#open .card')].map(c=>c.dataset.id);card.classList.add('dragging');h.setPointerCapture(e.pointerId);e.preventDefault()});
  document.addEventListener('pointermove',e=>{if(!drag)return;if(!cerceveModu()){if(e.clientY<90)window.scrollBy(0,-14);else if(e.clientY>window.innerHeight-90)window.scrollBy(0,14)}
    const el=document.elementFromPoint(e.clientX,e.clientY);const over=el&&el.closest('#open .card');
    document.querySelectorAll('#open .card').forEach(c=>c.classList.remove('drop-before','drop-after'));
    if(!over||over===drag.card)return;const r=over.getBoundingClientRect();const before=e.clientY<r.top+r.height/2;
    over.classList.add(before?'drop-before':'drop-after');over.parentNode.insertBefore(drag.card,before?over:over.nextSibling)});
  const endDrag=()=>{if(!drag)return;drag.card.classList.remove('dragging');document.querySelectorAll('#open .card').forEach(c=>c.classList.remove('drop-before','drop-after'));
    const ids=[...document.querySelectorAll('#open .card')].map(c=>c.dataset.id);drag=null;
    if(JSON.stringify(ids)===JSON.stringify(dragOnce))return;kaydet_geri('sıra değişikliği',['_sira']);state._sira={ids};persist('_sira');render()};
  document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
  $('addBtn').addEventListener('click',()=>{const t=$('addTitle').value.trim();if(!t){$('addTitle').focus();return}const id='UG-'+Date.now().toString(36);state[id]={title:t,body:$('addNote').value.trim(),from:'kullanici',createdAt:new Date().toISOString()};$('addTitle').value='';$('addNote').value='';persist(id);render();vurgula(id);setStatus('eklendi: '+id+'; ajan bir sonraki turda okur','ok')});
  function kararMetni(){
    const ad=o=>o?o.t:'';
    const sat=D.items.filter(it=>!it.resolved).map(it=>{
      const st=state[it.id]||{};
      if(!st.done&&!st.choice&&!st.note&&!dosyaNotlari(it.id).length)return null;
      const taslak=st.done?'':' (taslak, tamamlanmadı)';
      const sec=st.choice&&secimEtiket(it,st.choice)?secimEtiket(it,st.choice):(st.done?'tamamlandı':'');
      return it.id+' '+it.title+' → '+sec+taslak+(st.note?'\n   not: '+st.note.replace(/\n/g,' '):'')+dosyaNotlari(it.id).map(n=>'\n   '+n.ad+': '+n.not.replace(/\n/g,' ')).join('');
    }).filter(Boolean);
    const bos=D.items.filter(it=>!it.resolved&&!(state[it.id]||{}).done).map(it=>it.id);
    return [D.title+' ('+D.id+')',''].concat(sat).concat(bos.length?['','Cevapsız: '+bos.join(', ')]:[]).join('\n');
  }
  $('keysBtn').addEventListener('click',e=>{e.stopPropagation();keysAc()});
  document.addEventListener('click',e=>{if($('keys').hidden)return;if(e.target.closest('[data-keys-kapat]')||!e.target.closest('#keys'))keysAc(false)});
  $('copy').addEventListener('click',async()=>{const txt=kararMetni();try{await navigator.clipboard.writeText(txt);setStatus('kararlar kopyalandı','ok')}catch(e){const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();setStatus('kararlar kopyalandı','ok')}});
  // ── en üste çık
  const kendiKayar=()=>document.documentElement.scrollHeight>window.innerHeight+2;
  function tepeGoster(){$('tepeBtn').hidden = kendiKayar() ? window.scrollY<400 : false}
  $('tepeBtn').addEventListener('click',()=>{korumaSonu=Date.now()+1200;$('tepe').scrollIntoView({block:'start',behavior:yumusak()})});
  window.addEventListener('scroll',tepeGoster,{passive:true});
  window.addEventListener('resize',tepeGoster);
  setTimeout(tepeGoster,400);

  // ── görseller
  function kucult(dosya){
    return new Promise((coz,hata)=>{
      const fr=new FileReader();
      fr.onload=()=>{const im=new Image();
        im.onload=()=>{const en=1600,o=Math.min(1,en/Math.max(im.width,im.height));
          const c=document.createElement('canvas');c.width=Math.round(im.width*o);c.height=Math.round(im.height*o);
          c.getContext('2d').drawImage(im,0,0,c.width,c.height);
          c.toBlob(b=>b?coz({blob:b,veri:c.toDataURL('image/jpeg',.86),w:c.width,h:c.height}):hata(new Error('görsel dönüştürülemedi')),'image/jpeg',.86)};
        im.onerror=()=>hata(new Error('görsel okunamadı'));im.src=fr.result};
      fr.onerror=()=>hata(new Error('dosya okunamadı'));fr.readAsDataURL(dosya);
    });
  }
  const AZAMI_MB=20;
  async function gorselEkle(id,dosyalar){
    const tumu=[...dosyalar].filter(Boolean);
    const liste=tumu.filter(f=>f.type&&(f.type.startsWith('image/')||f.type.startsWith('video/')||f.type==='application/pdf'));
    if(!liste.length){if(tumu.length)setStatus('bu dosya türü eklenmez; görsel, video ya da PDF','uyari');return}
    setStatus('yükleniyor…');
    const eski=(state[id]&&state[id].gorseller)?state[id].gorseller.slice():[];
    for(const f of liste){
      try{
        let kayit;
        if(f.type.startsWith('image/')&&f.type!=='image/gif'){
          const k=await kucult(f);
          if(varliklar){const v=await varliklar.upload(k.blob);kayit={id:v.id,url:v.url,w:k.w,h:k.h}}
          else kayit={url:k.veri,w:k.w,h:k.h,yerel:true};
          kayit.ad=(f.name&&!/^image\.(png|jpe?g|webp)$/i.test(f.name))?f.name.replace(/\.[^.]+$/,''):'Ekran görüntüsü '+(eski.length+1);
        } else {
          const tr=f.type==='application/pdf'?'pdf':(f.type.startsWith('video/')?'video':'resim');
          if(f.size>AZAMI_MB*1048576){setStatus(f.name+' '+Math.round(f.size/1048576)+' MB; sınır '+AZAMI_MB+' MB, kısaltıp ya da sıkıştırıp ekle','uyari');continue}
          if(!varliklar){setStatus(turAd[tr]+' yalnız bağlantılı defterde eklenir; bu tarayıcıda yalnız görsel','uyari');continue}
          const v=await varliklar.upload(f);kayit={id:v.id,url:v.url,tur:tr,ad:(f.name||turAd[tr]).replace(/\.[^.]+$/,'')};
        }
        eski.push(kayit);
      }catch(e){setStatus('eklenemedi: '+(e&&(e.code||e.message)||''),'uyari');return}
    }
    if(eski.length===((state[id]&&state[id].gorseller)||[]).length)return;
    kaydet_geri('görsel ekleme',[id]);
    state[id]=Object.assign({},state[id],{gorseller:eski});
    await persist(id);render();
    setStatus(varliklar?'eklendi':'eklendi (yalnız bu tarayıcıda)','ok');
  }
  $('dosya').addEventListener('change',e=>{const id=bekleyenId;bekleyenId=null;if(id&&e.target.files.length)gorselEkle(id,e.target.files);e.target.value=''});
  document.addEventListener('paste',e=>{
    const t=e.target;if(!t.dataset||!t.dataset.note)return;
    const d=[...(e.clipboardData&&e.clipboardData.items||[])].filter(i=>i.kind==='file'&&(i.type.startsWith('image/')||i.type.startsWith('video/')||i.type==='application/pdf')).map(i=>i.getAsFile());
    if(d.length){e.preventDefault();gorselEkle(t.dataset.note,d)}
  });

  // karta dosya sürükle bırak
  let birakKart=null;
  const dosyaVar=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
  document.addEventListener('dragover',e=>{if(!dosyaVar(e))return;const k=e.target.closest&&e.target.closest('#panelOpen .card');
    if(birakKart&&birakKart!==k){birakKart.classList.remove('birak');birakKart=null}
    if(k){e.preventDefault();e.dataTransfer.dropEffect='copy';k.classList.add('birak');birakKart=k}});
  document.addEventListener('dragleave',e=>{if(birakKart&&!birakKart.contains(e.relatedTarget)){birakKart.classList.remove('birak');birakKart=null}});
  document.addEventListener('drop',e=>{if(!dosyaVar(e))return;const k=e.target.closest&&e.target.closest('#panelOpen .card');
    if(birakKart){birakKart.classList.remove('birak');birakKart=null}
    if(!k)return;e.preventDefault();gorselEkle(k.dataset.id,e.dataTransfer.files)});

  // ── tam ekran görsel ve çizim
  // Çizgiler veri olarak saklanır; ham görsel hiç bozulmaz, kayıtta ham + çizgiler birleştirilir.
  let tv={id:null,i:-1,im:null,cizgiler:[],renk:'#E23E2C',kalin:5,aktif:null};
  const KALINLIK=[{ad:'ince',v:3},{ad:'orta',v:5},{ad:'kalın',v:9}];let kalinIdx=1;
  let cizimZaman=null, cizimKaydediyor=false;

  function gorselYukle(url){
    return new Promise((coz,hata)=>{
      (async()=>{
        let src=url;
        if(!/^data:/.test(url)){
          // aynı kaynaktan blob olarak al: tuval kirlenmez, kayıt engellenmez
          const r=await fetch(url,{credentials:'same-origin'});
          if(!r.ok)throw new Error('görsel indirilemedi ('+r.status+')');
          src=URL.createObjectURL(await r.blob());
        }
        const im=new Image();
        im.onload=()=>{if(src!==url)URL.revokeObjectURL(src);coz(im)};
        im.onerror=()=>hata(new Error('görsel açılamadı'));
        im.src=src;
      })().catch(hata);
    });
  }
  function cizgileriCiz(x,gen,yuk,olcek){
    x.lineCap='round';x.lineJoin='round';
    tv.cizgiler.forEach(c=>{
      x.strokeStyle=c.renk;x.lineWidth=Math.max(1.5,c.kalin*olcek);
      x.beginPath();
      c.n.forEach((n,i)=>i?x.lineTo(n[0]*gen,n[1]*yuk):x.moveTo(n[0]*gen,n[1]*yuk));
      if(c.n.length===1)x.lineTo(c.n[0][0]*gen+.1,c.n[0][1]*yuk);
      x.stroke();
    });
  }
  function igneleriCiz(x,gen,yuk,olcek){(tv.igneler||[]).forEach((g,k)=>{const r=Math.max(10,15*olcek*(gen/1200));
    x.beginPath();x.arc(g.x*gen,g.y*yuk,r,0,Math.PI*2);x.fillStyle='#E23E2C';x.fill();x.lineWidth=Math.max(2,r/6);x.strokeStyle='#fff';x.stroke();
    x.fillStyle='#fff';x.font='700 '+Math.round(r*1.1)+'px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(k+1),g.x*gen,g.y*yuk+1)})}
  function tuvalCiz(){
    if(!tv.im)return;
    const c=$('tuvalKanvas'),x=c.getContext('2d');
    x.clearRect(0,0,c.width,c.height);x.drawImage(tv.im,0,0,c.width,c.height);
    cizgileriCiz(x,c.width,c.height,c.width/tv.im.naturalWidth);
    igneleriCiz(x,c.width,c.height,1);
  }
  function igneListesi(){const l=$('igneListe');const ig=tv.igneler||[];const goster=$('tuval').dataset.kip==='resim'&&ig.length;
    l.hidden=!goster;if(!goster){l.innerHTML='';return}
    l.innerHTML=ig.map((g,k)=>`<div class="igne-satir"><span class="igne-no">${k+1}</span><input data-igne="${k}" value="${esc(g.not||'')}" placeholder="${k+1} numaralı noktaya not" aria-label="İğne ${k+1} notu"><button type="button" class="igne-sil" data-igne-sil="${k}" aria-label="İğneyi kaldır">✕</button></div>`).join('')}
  function igneKaydet(){const id=tv.id,i=tv.i;const l=((state[id]||{}).gorseller||[]).slice();if(!l[i])return;
    l[i]=Object.assign({},l[i],{igneler:(tv.igneler||[]).map(g=>({x:+g.x.toFixed(4),y:+g.y.toFixed(4),not:g.not||''}))});
    state[id]=Object.assign({},state[id],{gorseller:l});sched(id)}
  $('igneListe').addEventListener('input',e=>{const k=e.target.dataset.igne;if(k===undefined)return;tv.igneler[+k].not=e.target.value;igneKaydet()});
  $('igneListe').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.igne!==undefined){e.preventDefault();e.target.blur()}});
  $('igneListe').addEventListener('click',e=>{const k=e.target.dataset.igneSil;if(k===undefined)return;tv.igneler.splice(+k,1);igneKaydet();tuvalCiz();igneListesi();cizimPlanla()});
  // ── tam ekran görüntüleyici: aynı maddenin ekleri ve görselleri arasında ← →
  let gosterimNo=0;
  function tuvalBaslik(id){
    const m=medya(id)[tv.n]||{};
    $('tuvalSoru').textContent='Not · '+(m.ad||'dosya');
    $('tuvalNot').value=m.not||'';
    $('tuvalKayit').textContent='';
  }
  function tuvalGoster(id,kip){
    const t=$('tuval'),ilk=t.hidden;t.dataset.kip=kip;tuvalBaslik(id);zoomUygula();
    if(ilk){
      if(cerceveModu()){const kart=document.querySelector(`.card[data-id="${id}"] .gorseller`);if(kart){t.classList.add('yerinde');kart.insertAdjacentElement('afterend',t)}}}
    const l=medya(id),n=tv.n;
    $('medyaSayac').textContent=l.length>1?(n+1)+' / '+l.length:'';
    const adOz=l[n]&&l[n].k==='g';const gir=$('medyaAdGir');gir.hidden=!adOz;if(adOz)gir.value=l[n].ad;
    $('medyaAd').textContent=adOz?(l[n].tur!=='resim'?turAd[l[n].tur]+':':''):((l[n]&&l[n].tur!=='resim'?turAd[l[n].tur]+': ':'')+((l[n]&&l[n].ad)||''));
    document.querySelectorAll('.medya-ok').forEach(b=>b.hidden=l.length<2);
    const m=l[n]||{};
    $('kareBtn').hidden=!(kip==='video'||kip==='pdf'||kip==='gorsel');
    $('kareBtn').textContent=kip==='pdf'?'Bu sayfaya çiz':(kip==='video'?'Bu kareyi çiz':'Kopyasına çiz');
    const ayri=$('medyaAyri');ayri.hidden=kip==='resim';if(!ayri.hidden){try{ayri.href=new URL(m.url,location.href).href}catch(e){ayri.removeAttribute('href')}}
    $('tuvalIpucu').textContent=(l.length>1?'← → geçer · ':'')+'Esc kapatır';
    t.hidden=false;if(!t.classList.contains('yerinde'))document.documentElement.classList.add('tuval-acik');
    if(ilk||(document.activeElement&&document.activeElement.tagName==='IFRAME'))try{t.focus({preventScroll:true})}catch(_){}
    if(ilk&&t.classList.contains('yerinde')){korumaSonu=Date.now()+1200;t.scrollIntoView({block:'start',behavior:yumusak()})}
  }
  function medyaTemizle(){const k=$('medyaKutu');k.querySelectorAll('video').forEach(v=>{try{v.pause();v.removeAttribute('src');v.load()}catch(e){}});
    if(tv.pdf){try{tv.pdf.destroy()}catch(e){}tv.pdf=null}k.innerHTML=''}
  const zHafiza=new Map();const zAnahtar=(id,m)=>id+'|'+(m.k==='k'?'karsilastir':m.url);
  function zKaydet(){const m=medya(tv.id)[tv.n],kap=kaydirKap();if(!m)return;if((tv.z||1)===1||!kap){zHafiza.delete(zAnahtar(tv.id,m));return}
    zHafiza.set(zAnahtar(tv.id,m),{z:tv.z,fx:(kap.scrollLeft+kap.clientWidth/2)/Math.max(1,kap.scrollWidth),fy:(kap.scrollTop+kap.clientHeight/2)/Math.max(1,kap.scrollHeight)})}
  async function zYukle(){const m=medya(tv.id)[tv.n];if(!m)return;const h=zHafiza.get(zAnahtar(tv.id,m));if(!h)return;
    const im=$('medyaKutu').querySelector('img');if(im&&!im.complete)await new Promise(r=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',r,{once:true})});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));yakinlas(h.z/(tv.z||1));const kap=kaydirKap();
    if(kap){kap.scrollLeft=h.fx*kap.scrollWidth-kap.clientWidth/2;kap.scrollTop=h.fy*kap.scrollHeight-kap.clientHeight/2}}
  async function medyaGec(yon){const l=medya(tv.id);if(l.length<2)return;const notta=document.activeElement===$('tuvalNot');
    zKaydet();await medyaAc(tv.id,(tv.n+yon+l.length)%l.length);await zYukle();
    if(notta)$('tuvalNot').focus({preventScroll:true});else if(!$('tuval').contains(document.activeElement))try{$('tuval').focus({preventScroll:true})}catch(_){}}
  async function medyaAc(id,n){
    const l=medya(id);if(!l.length)return;n=((n%l.length)+l.length)%l.length;const m=l[n];
    if(!$('tuval').hidden){clearTimeout(cizimZaman);if(bekleyenCizim)await cizimKaydet()}
    const no=++gosterimNo;medyaTemizle();if(!$('tuval').hidden)$('tuvalKayit').textContent='';
    tv=Object.assign({},tv,{id,n,im:null,aktif:null,z:1,el:false,taban:null,igneler:[]});zoomUygula();igneListesi();
    if(m.tur==='resim'&&m.k==='g')return tuvalAc(id,m.i,no);
    const k=$('medyaKutu');
    if(m.tur==='resim'){const im=new Image();im.alt=m.ad||'';im.src=m.url;k.appendChild(im);tuvalGoster(id,'gorsel');setStatus(m.ad||'görsel','ok');return}
    if(m.tur==='dosya'||m.tur==='paket'){const d=document.createElement('div');d.className='dosya-kart';d.innerHTML='<p><b>'+esc(m.ad)+'</b></p><p>'+(m.tur==='paket'?esc((m.dosyalar||[]).length+' dosya; İndir deyince tek zip olarak gelir.'):'Bu dosya defterde gösterilemez; bilgisayarına indir.')+'</p><p><button type="button" class="btn" data-ciz="indir">İndir</button></p><p class="small">İndirme açılmazsa üstteki "Ayrı sekmede aç".</p>';k.appendChild(d);tuvalGoster(id,'dosya');setStatus('dosya','ok');return}
    if(m.tur==='baglanti'){const d=document.createElement('div');d.className='baglanti-kart';d.innerHTML='<p><b>'+esc(m.ad)+'</b></p><p>Bu ek bir bağlantı; defterin içinde açılmaz.</p><p><a class="btn" href="'+esc(m.url)+'" target="_blank" rel="noopener">Bağlantıyı aç</a></p><p class="small"><a href="'+esc(m.url)+'" target="_blank" rel="noopener">'+esc(m.url)+'</a></p><p class="small">Notunu aşağıya yaz; bu bağlantıya kaydedilir.</p>';k.appendChild(d);tuvalGoster(id,'baglanti');setStatus('bağlantı','ok');return}
    if(m.tur==='video'){const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='metadata';v.src=m.url;k.appendChild(v);tuvalGoster(id,'video');setStatus('video','ok');return}
    if(m.tur==='html'){tuvalGoster(id,'html');setStatus('sayfa açılıyor…');
      try{const r=await fetch(m.url,{credentials:'same-origin'});if(!r.ok)throw new Error(r.status);let h=await r.text();if(no!==gosterimNo)return;
        const taban=new URL(m.url,location.href).href.replace(/[^/]*$/,'');
        const bas='<base href="'+taban+'">'+KOPRU;
        h=/<head[^>]*>/i.test(h)?h.replace(/<head[^>]*>/i,x=>x+bas):bas+h;
        const sahne=document.createElement('div');sahne.className='html-sahne';const boy=document.createElement('div');boy.className='html-boy';
        const f=document.createElement('iframe');f.setAttribute('sandbox','allow-scripts allow-popups allow-forms allow-modals');f.title=m.ad||'sayfa';f.srcdoc=h;
        const kapak=document.createElement('div');kapak.className='el-kapak';boy.appendChild(f);boy.appendChild(kapak);sahne.appendChild(boy);k.appendChild(sahne);htmlBoyutla();setStatus('sayfa açıldı','ok')}
      catch(e){if(no===gosterimNo){k.innerHTML='<p class="medya-not">Sayfa burada açılamadı. "Ayrı sekmede aç" ile dene.</p>';setStatus('sayfa açılamadı','')}}
      return}
    if(m.tur==='metin'){tuvalGoster(id,'metin');setStatus('metin açılıyor…');
      try{const r=await fetch(m.url,{credentials:'same-origin'});if(!r.ok)throw new Error(r.status);const x=await r.text();if(no!==gosterimNo)return;
        const d=document.createElement('div');d.className='md-okuma body';d.innerHTML=/\.txt$/i.test(m.url.split(/[?#]/)[0])?'<pre>'+esc(x)+'</pre>':md(x);k.appendChild(d);setStatus('metin açıldı','ok')}
      catch(e){if(no===gosterimNo){k.innerHTML='<p class="medya-not">Metin burada açılamadı. "Ayrı sekmede aç" ile dene.</p>';setStatus('metin açılamadı','')}}
      return}
    if(m.tur==='pdf'){tuvalGoster(id,'pdf');setStatus('PDF açılıyor…');
      try{await pdfGoster(m.url,k,no)}catch(e){if(no===gosterimNo){k.innerHTML='<p class="medya-not">PDF burada açılamadı ('+esc(e&&e.message||'')+'). "Ayrı sekmede aç" ile dene.</p>';setStatus('PDF açılamadı','')}}
      return}
  }
  let pdfjsSoz=null;
  function pdfjs(){const kok='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
    if(!pdfjsSoz)pdfjsSoz=import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc=kok+'pdf.worker.min.mjs';return m}).catch(e=>{pdfjsSoz=null;throw e});
    return pdfjsSoz}
  const PDF_AZAMI=40;
  async function pdfGoster(url,k,no){
    const lib=await pdfjs();
    const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw new Error('indirilemedi '+r.status);
    const veri=new Uint8Array(await r.arrayBuffer());if(no!==gosterimNo)return;
    const doc=await lib.getDocument({data:veri,isEvalSupported:false}).promise;
    if(no!==gosterimNo){doc.destroy();return}
    tv.pdf=doc;tv.pdfSayfa=[];
    const kap=document.createElement('div');kap.className='pdf-sayfalar';k.appendChild(kap);
    const gen=Math.max(320,Math.min(1100,(k.clientWidth||900)-24)),dpr=Math.min(2,window.devicePixelRatio||1);
    const say=Math.min(doc.numPages,PDF_AZAMI);
    $('medyaAd').textContent='PDF: '+((medya(tv.id)[tv.n]||{}).ad||'')+' · '+doc.numPages+' sayfa';
    for(let p=1;p<=say;p++){
      const sayfa=await doc.getPage(p);if(no!==gosterimNo)return;
      const v1=sayfa.getViewport({scale:1}),vp=sayfa.getViewport({scale:gen/v1.width*dpr});
      const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);c.dataset.taban=Math.round(vp.width/dpr);c.style.width=Math.round(vp.width/dpr*(tv.z||1))+'px';c.dataset.sayfa=p;c.setAttribute('aria-label','Sayfa '+p);
      kap.appendChild(c);tv.pdfSayfa.push({sayfa,c,w1:v1.width,olcek:vp.width/v1.width});await sayfa.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      if(p===1)setStatus('PDF açıldı','ok');
    }
    if(doc.numPages>say){const n=document.createElement('p');n.className='medya-not';n.textContent='İlk '+say+' sayfa gösterildi; tamamı için "Ayrı sekmede aç".';kap.appendChild(n)}
  }
  // PDF sayfasını, video karesini ya da ek görseli maddenin görsellerine kopyala ve çizime aç
  function gorunenPdfSayfasi(){const c=[...document.querySelectorAll('#medyaKutu .pdf-sayfalar canvas')];if(!c.length)return null;
    const alan=document.querySelector('#medyaKutu .pdf-sayfalar').getBoundingClientRect();let en=c[0],enA=-1;
    c.forEach(x=>{const r=x.getBoundingClientRect();const a=Math.max(0,Math.min(r.bottom,alan.bottom)-Math.max(r.top,alan.top));if(a>enA){enA=a;en=x}});return en}
  function kanvasBlob(c){return new Promise((coz,hata)=>{try{c.toBlob(b=>b?coz(b):hata(new Error('kare alınamadı')),'image/jpeg',.92)}catch(e){hata(e)}})}
  async function videoKaresi(v,url){
    const ciz=vv=>{const c=document.createElement('canvas');c.width=vv.videoWidth;c.height=vv.videoHeight;c.getContext('2d').drawImage(vv,0,0);return c};
    try{return await kanvasBlob(ciz(v))}catch(e){
      // kaynak başka adresteyse kirlenir: dosyayı blob olarak alıp aynı anı yeniden çiz
      const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw new Error('video indirilemedi');
      const u=URL.createObjectURL(await r.blob()),w=document.createElement('video');w.muted=true;w.preload='auto';w.src=u;
      await new Promise((coz,hata)=>{w.onloadeddata=coz;w.onerror=()=>hata(new Error('video açılamadı'))});
      await new Promise(coz=>{w.onseeked=coz;w.currentTime=v.currentTime||0});
      try{return await kanvasBlob(ciz(w))}finally{URL.revokeObjectURL(u)}}}
  async function kareAl(){
    const id=tv.id,l=medya(id),m=l[tv.n];if(!m)return;const kip=$('tuval').dataset.kip;
    setStatus('kopya hazırlanıyor…');
    try{
      let blob,ad;
      if(kip==='pdf'){const c=gorunenPdfSayfasi();if(!c)throw new Error('sayfa yok');blob=await kanvasBlob(c);ad=(m.ad||'PDF')+' · sayfa '+c.dataset.sayfa}
      else if(kip==='video'){const v=document.querySelector('#medyaKutu video');if(!v||!v.videoWidth)throw new Error('video henüz yüklenmedi');v.pause();blob=await videoKaresi(v,m.url);ad=(m.ad||'video')+' · '+(v.currentTime||0).toFixed(1)+' sn'}
      else {const im=await gorselYukle(m.url);const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);blob=await kanvasBlob(c);ad=m.ad||'görsel'}
      const k=await kucult(new File([blob],'kare.jpg',{type:'image/jpeg'}));
      let kayit;
      if(varliklar){const v=await varliklar.upload(k.blob);kayit={id:v.id,url:v.url,w:k.w,h:k.h,ad}}else kayit={url:k.veri,w:k.w,h:k.h,yerel:true,ad};
      kaydet_geri('kare ekleme',[id]);
      const liste=((state[id]||{}).gorseller||[]).slice();liste.push(kayit);
      state[id]=Object.assign({},state[id],{gorseller:liste});await persist(id);renderSafe();
      await medyaAc(id,((maddeBul(id)||{}).ekler||[]).length+liste.length-1);
      setStatus('kopya görsellere eklendi; üzerine çizebilirsin','ok');
    }catch(e){setStatus('kopya alınamadı: '+(e&&e.message||''),'')}
  }
  // dokunmatikte kaydırarak geçiş (çizim alanında değil)
  let kayB=null;
  $('medyaKutu').addEventListener('touchstart',e=>{if(e.touches.length===1)kayB={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
  $('medyaKutu').addEventListener('touchend',e=>{if(!kayB)return;const t=e.changedTouches[0],dx=t.clientX-kayB.x,dy=t.clientY-kayB.y;kayB=null;
    if(Math.abs(dx)>70&&Math.abs(dy)<45)medyaGec(dx<0?1:-1)},{passive:true});

  // ── tam ekran tuşları önce burada: odak videoda, tam ekran düğmesinde ya da başka bir düğmede olsa da ← → yandakine geçer;
  // yalnız yazı yazarken oklar metinde kalır. Dosya notunda Enter notu kaydedip sonrakine geçer (Shift+Enter alt satır).
  function notuKaydetGec(){const id=tv.id;if(!id)return;clearTimeout(timers.get(id));timers.delete(id);persist(id);
    const l=medya(id);if(l.length>1){medyaGec(1);setStatus('not kaydedildi; sıradaki dosya','ok')}else setStatus('not kaydedildi','ok')}
  window.addEventListener('keydown',e=>{
    if($('tuval').hidden)return;
    const t=e.target,yazi=t&&(t.tagName==='TEXTAREA'||t.isContentEditable||(t.tagName==='INPUT'&&!['radio','checkbox','button','range'].includes(t.type)));
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!yazi){
      e.preventDefault();e.stopPropagation();
      if(document.fullscreenElement){try{document.exitFullscreen()}catch(_){}}
      medyaGec(e.key==='ArrowRight'?1:-1);return}
    if(e.key==='Enter'&&t&&t.id==='tuvalNot'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();e.stopPropagation();notuKaydetGec()}
  },true);
  // ── yakınlaştırma ve el ile kaydırma
  const KOPRU='<style>html,body{overscroll-behavior:contain}</style><script>(function(){var P=parent;function y(t){return t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))}addEventListener("keydown",function(e){var c=e.ctrlKey||e.metaKey;if(e.key==="Escape"||((e.key==="ArrowLeft"||e.key==="ArrowRight")&&!y(e.target)&&!c&&!e.altKey&&!e.shiftKey)||(c&&/^[+=0-]$/.test(e.key))){e.preventDefault();P.postMessage({kdKopru:1,key:e.key,ctrl:c},"*")}},true);addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();P.postMessage({kdKopru:1,wheel:e.deltaY,x:e.clientX,y:e.clientY},"*")}},{passive:false,capture:true})})();<\/script>';
  const kip=()=>$('tuval').dataset.kip;
  function kaydirKap(){const k=kip();if(k==='resim')return document.querySelector('#tuval .alan');if(k==='pdf')return document.querySelector('#medyaKutu .pdf-sayfalar');if(k==='metin')return document.querySelector('#medyaKutu .md-okuma');if(k==='html')return document.querySelector('#medyaKutu .html-sahne');return $('medyaKutu')}
  function htmlBoyutla(){const s=document.querySelector('#medyaKutu .html-sahne');if(!s)return;const z=tv.z||1,w=s.clientWidth,h=s.clientHeight,b=s.querySelector('.html-boy'),f=s.querySelector('iframe'),k=s.querySelector('.el-kapak');
    b.style.width=Math.round(w*z)+'px';b.style.height=Math.round(h*z)+'px';b.style.position='relative';f.style.width=w+'px';f.style.height=h+'px';f.style.transform='scale('+z+')';k.style.width=Math.round(w*z)+'px';k.style.height=Math.round(h*z)+'px'}
  function zoomUygula(){const t=$('tuval'),z=tv.z||1,k=kip();
    const tabanAl=el=>{if(!tv.taban&&el){const r=el.getBoundingClientRect();tv.taban={w:r.width/(tv.zEski||1),h:r.height/(tv.zEski||1)}}return tv.taban};
    const boyut=el=>{if(!el)return;if(z===1){el.style.width='';el.style.height=''}else{const b=tabanAl(el);if(b&&b.w){el.style.width=Math.round(b.w*z)+'px';el.style.height=Math.round(b.h*z)+'px'}}};
    if(k==='resim')boyut($('tuvalKanvas'));
    else if(k==='gorsel'||k==='video')boyut($('medyaKutu').firstElementChild);
    else if(k==='pdf')document.querySelectorAll('#medyaKutu .pdf-sayfalar canvas').forEach(c=>{c.style.width=Math.round((+c.dataset.taban||c.width)*z)+'px'});
    else if(k==='metin'){const m=document.querySelector('#medyaKutu .md-okuma');if(m){m.style.fontSize=z===1?'':(z*100)+'%';m.style.maxWidth=z===1?'':Math.round(780*z)+'px'}}
    else if(k==='html')htmlBoyutla();
    t.classList.toggle('zoomlu',z!==1);
    const elOlur=z>1&&['resim','html','video'].includes(k),elHep=z>1&&['pdf','gorsel','metin'].includes(k);
    t.classList.toggle('el-modu',elHep||(elOlur&&tv.el));
    $('zoomDeger').textContent=Math.round(z*100)+'%';
    const b=$('elBtn');b.hidden=!elOlur;b.textContent=tv.el?(k==='resim'?'✎ Çiz':(k==='html'?'Sayfayı kullan':'Oynatıcıyı kullan')):'✋ Kaydır';
    b.setAttribute('aria-pressed',!!tv.el)}
  let netZaman=null;
  function pdfNetlestir(){clearTimeout(netZaman);netZaman=setTimeout(async()=>{const kap=document.querySelector('#medyaKutu .pdf-sayfalar');if(!kap||!tv.pdfSayfa)return;
    const r=kap.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),no=gosterimNo;
    for(const x of tv.pdfSayfa){const cr=x.c.getBoundingClientRect();if(cr.bottom<r.top-200||cr.top>r.bottom+200)continue;
      const hedef=Math.min(5000,(+x.c.dataset.taban)*(tv.z||1)*dpr)/x.w1;if(Math.abs(hedef-x.olcek)/x.olcek<.15)continue;
      const vp=x.sayfa.getViewport({scale:hedef});const yeni=document.createElement('canvas');yeni.width=Math.round(vp.width);yeni.height=Math.round(vp.height);
      await x.sayfa.render({canvasContext:yeni.getContext('2d'),viewport:vp}).promise;if(no!==gosterimNo)return;
      x.c.width=yeni.width;x.c.height=yeni.height;x.c.getContext('2d').drawImage(yeni,0,0);x.olcek=hedef}},350)}
  function yakinlas(kat,cx,cy){if($('tuval').hidden)return;const eski=tv.z||1,yeni=Math.max(.5,Math.min(5,kat===0?1:eski*kat));if(Math.abs(yeni-eski)<.002)return;
    const kap=kaydirKap();let px,py,r;if(kap){r=kap.getBoundingClientRect();if(cx===undefined){cx=r.left+r.width/2;cy=r.top+r.height/2}px=(kap.scrollLeft+cx-r.left)/eski;py=(kap.scrollTop+cy-r.top)/eski}
    if(eski===1)tv.taban=null;tv.zEski=eski;tv.z=yeni;if(yeni>1&&eski<=1)tv.el=true;if(yeni<=1)tv.el=false;zoomUygula();tv.zEski=null;
    if(kap&&px!==undefined){kap.scrollLeft=px*yeni-(cx-r.left);kap.scrollTop=py*yeni-(cy-r.top)}
    if(kip()==='pdf')pdfNetlestir()}
  // tekerlek: Ctrl ile yakınlaştırır; yoksa yalnız tam ekranın içi kayar, arkadaki defter kaymaz
  $('tuval').addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey){e.preventDefault();yakinlas(Math.exp(-e.deltaY*.0018),e.clientX,e.clientY);return}
    let el=e.target;const dy=e.deltaY,dx=e.deltaX;
    while(el&&el!==$('tuval')){const st=getComputedStyle(el);
      if(/(auto|scroll)/.test(st.overflowY+' '+st.overflowX)&&((dy>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1)||(dy<0&&el.scrollTop>0)||(dx>0&&el.scrollLeft+el.clientWidth<el.scrollWidth-1)||(dx<0&&el.scrollLeft>0)))return;
      el=el.parentElement}
    e.preventDefault()},{passive:false});
  // el: yakınken tutup sürükle
  let surukle=null;
  $('tuval').addEventListener('pointerdown',e=>{const t=$('tuval');if(!t.classList.contains('el-modu')||e.button>0)return;
    if(e.target.closest('.arac,.tuval-alt,.medya-ok,button,a,textarea,input'))return;
    const kap=kaydirKap();if(!kap||!kap.contains(e.target))return;
    e.preventDefault();e.stopPropagation();surukle={x:e.clientX,y:e.clientY,l:kap.scrollLeft,t:kap.scrollTop,kap,oynadi:false};t.classList.add('tutuyor');
    try{t.setPointerCapture(e.pointerId)}catch(_){}},true);
  let surukleSonu=0;
  $('tuval').addEventListener('pointermove',e=>{if(!surukle)return;if(Math.abs(e.clientX-surukle.x)+Math.abs(e.clientY-surukle.y)>4)surukle.oynadi=true;surukle.kap.scrollLeft=surukle.l-(e.clientX-surukle.x);surukle.kap.scrollTop=surukle.t-(e.clientY-surukle.y)});
  const birak=()=>{if(!surukle)return;if(surukle.oynadi)surukleSonu=Date.now();surukle=null;$('tuval').classList.remove('tutuyor');if(kip()==='pdf')pdfNetlestir()};
  $('tuval').addEventListener('pointerup',birak);$('tuval').addEventListener('pointercancel',birak);
  // HTML ekinden gelen tuşlar ve Ctrl+tekerlek
  window.addEventListener('message',e=>{const f=document.querySelector('#medyaKutu iframe');if(!f||e.source!==f.contentWindow||!e.data||!e.data.kdKopru)return;
    if(e.data.wheel!==undefined){const r=f.getBoundingClientRect(),z=tv.z||1;yakinlas(Math.exp(-e.data.wheel*.0018),r.left+e.data.x*z,r.top+e.data.y*z);return}
    const k=e.data.key;
    if(e.data.ctrl){if(k==='0')yakinlas(0);else yakinlas(k==='-'?1/1.25:1.25);return}
    if(k==='Escape'){tuvalKapatSor();return}
    if(k==='ArrowRight'||k==='ArrowLeft'){$('tuval').focus({preventScroll:true});medyaGec(k==='ArrowRight'?1:-1)}});
  window.addEventListener('resize',()=>{if(!$('tuval').hidden&&kip()==='html')htmlBoyutla()});
  // dosya adı (yalnız senin eklediklerin ve görseller)
  $('medyaAdGir').addEventListener('change',e=>{const id=tv.id,m=medya(id)[tv.n];if(!m||m.k!=='g')return;const v=e.target.value.trim();
    const l=((state[id]||{}).gorseller||[]).slice();if(!l[m.i])return;l[m.i]=Object.assign({},l[m.i],{ad:v||undefined});if(!v)delete l[m.i].ad;
    state[id]=Object.assign({},state[id],{gorseller:l});persist(id);tuvalBaslik(id);renderSafe();setStatus('ad kaydedildi','ok')});
  $('medyaAdGir').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur()}});
  // video kutucuklarına rastgele (ama her seferinde aynı) bir kare
  document.addEventListener('loadedmetadata',e=>{const v=e.target;if(!v||v.tagName!=='VIDEO'||!v.hasAttribute('data-kapak')||v.dataset.kapakOk)return;v.dataset.kapakOk=1;
    try{v.currentTime=isFinite(v.duration)&&v.duration>0?v.duration*kapakAni(v.currentSrc||v.src):.1}catch(_){}},true);

  async function tuvalAc(id,i,no){
    const g=((state[id]||{}).gorseller||[])[i];if(!g)return;
    if(no===undefined){no=++gosterimNo;tv=Object.assign({},tv,{id,n:((maddeBul(id)||{}).ekler||[]).length+i,z:1,el:false,taban:null})}
    setStatus('görsel açılıyor…');
    try{
      let cizgiler=g.cizgiler;
      if(!cizgiler&&db){try{const c=await db.doc('cizim/'+id+'-'+i).get();cizgiler=(c&&c.exists!==false&&(c.data?c.data():c)||{}).cizgiler||[]}catch(e){cizgiler=[]}
        const l=((state[id]||{}).gorseller||[]).slice();if(l[i]){l[i]=Object.assign({},l[i],{cizgiler});state[id]=Object.assign({},state[id],{gorseller:l})}}
      const im=await gorselYukle((g.ham&&g.ham.url)||g.url);
      if(no!==gosterimNo)return;
      tv=Object.assign({},tv,{id,i,im,cizgiler:(cizgiler||[]).map(c=>({renk:c.renk,kalin:c.kalin,n:c.n.slice()})),igneler:(g.igneler||[]).map(x=>Object.assign({},x)),aktif:null,silinen:null,z:1,el:false,taban:null});
      const c=$('tuvalKanvas');
      const enB=Math.min(im.naturalWidth,Math.max(1200,Math.round(window.innerWidth*1.5))),o=enB/im.naturalWidth;
      c.width=Math.round(im.naturalWidth*o);c.height=Math.round(im.naturalHeight*o);
      tuvalGoster(id,'resim');tuvalCiz();igneListesi();setStatus('çizebilirsin; kendiliğinden kaydedilir','ok');
    }catch(e){setStatus('görsel açılamadı: '+(e.message||''),'')}
  }
  function kucukResmiGuncelle(id,i,url,cizili){const b=document.querySelector(`.gorsel[data-gorsel-ac="${id}"][data-i="${i}"]`);if(!b)return;
    const im=b.querySelector('img');if(im)im.src=url;let r=b.querySelector('.im');if(cizili&&!r){r=document.createElement('span');r.className='im';r.textContent='çizili';b.appendChild(r)}else if(!cizili&&r)r.remove()}
  function tuvalKapat(){try{zKaydet()}catch(_){}clearTimeout(cizimZaman);gosterimNo++;medyaTemizle();tv.z=1;tv.el=false;tv.taban=null;zoomUygula();document.documentElement.classList.remove('tuval-acik');const t=$('tuval');t.hidden=true;tv.im=null;tv.aktif=null;
    if(t.classList.contains('yerinde')){t.classList.remove('yerinde');document.body.appendChild(t);}
    if(pendingRender)setTimeout(()=>{if(!editing())renderSafe()},60);
    const kutu=document.querySelector(`textarea[data-note="${tv.id}"]`);
    if(kutu&&kutu.value!==((state[tv.id]||{}).note||''))kutu.value=((state[tv.id]||{}).note||'');}
  async function tuvalKapatSor(){clearTimeout(cizimZaman);if(bekleyenCizim){await cizimKaydet()}tuvalKapat()}

  let bekleyenCizim=false;
  function cizimPlanla(){bekleyenCizim=true;$('tuvalKayit').textContent='çizim kaydedilecek…';clearTimeout(cizimZaman);cizimZaman=setTimeout(()=>cizimKaydet(),1200)}
  function tuvalBlob(c){return new Promise(coz=>c.toBlob(b=>coz(b),'image/jpeg',.92))}

  async function cizimKaydet(){
    if(cizimKaydediyor||!tv.im||tv.id===null)return;
    cizimKaydediyor=true;clearTimeout(cizimZaman);
    const id=tv.id,i=tv.i;
    const liste=((state[id]||{}).gorseller||[]).slice();
    if(!liste[i]){cizimKaydediyor=false;bekleyenCizim=false;return}
    setStatus('çizim kaydediliyor…');$('tuvalKayit').textContent='çizim kaydediliyor…';
    const cizgiler=tv.cizgiler.map(ç=>({renk:ç.renk,kalin:ç.kalin,n:ç.n.map(n=>[+n[0].toFixed(4),+n[1].toFixed(4)])}));
    try{
      if(!cizgiler.length&&!(tv.igneler||[]).length){
        const ham=liste[i].ham||{id:liste[i].id,url:liste[i].url};const oncekiDuz=liste[i].duzId;
        liste[i]=Object.assign({},liste[i],{id:ham.id,url:ham.url,ham,cizili:false,cizgiler:[]});delete liste[i].duzId;
        state[id]=Object.assign({},state[id],{gorseller:liste});await persist(id);bekleyenCizim=false;
        if(varliklar&&oncekiDuz&&oncekiDuz!==ham.id){try{await varliklar.delete(oncekiDuz)}catch(e){}}
        kucukResmiGuncelle(id,i,ham.url,false);$('tuvalKayit').textContent='çizim yok, ham görsel';cizimKaydediyor=false;return;
      }
      const c=document.createElement('canvas');
      c.width=tv.im.naturalWidth;c.height=tv.im.naturalHeight;
      const x=c.getContext('2d');x.drawImage(tv.im,0,0);
      const yedek=tv.cizgiler;tv.cizgiler=cizgiler;cizgileriCiz(x,c.width,c.height,1);tv.cizgiler=yedek;igneleriCiz(x,c.width,c.height,1);
      const ham=liste[i].ham||{id:liste[i].id,url:liste[i].url};
      let yeni;
      if(varliklar){
        const blob=await tuvalBlob(c);
        if(!blob)throw new Error('görsel oluşturulamadı');
        const v=await varliklar.upload(blob);
        yeni={id:v.id,url:v.url};
      } else yeni={url:c.toDataURL('image/jpeg',.92)};
      const oncekiDuz=liste[i].duzId;
      liste[i]=Object.assign({},liste[i],yeni,{ham,cizili:true,cizgiler,duzId:yeni.id});
      state[id]=Object.assign({},state[id],{gorseller:liste});
      await persist(id);
      bekleyenCizim=false;
      if(varliklar&&oncekiDuz&&oncekiDuz!==yeni.id&&oncekiDuz!==ham.id){try{await varliklar.delete(oncekiDuz)}catch(e){}}
      kucukResmiGuncelle(id,i,yeni.url,true);
      setStatus('çizim kaydedildi','ok');$('tuvalKayit').textContent='çizim kaydedildi';
      if(JSON.stringify(cizgiler)!==JSON.stringify(tv.cizgiler.map(ç=>({renk:ç.renk,kalin:ç.kalin,n:ç.n.map(n=>[+n[0].toFixed(4),+n[1].toFixed(4)])}))))cizimPlanla();
    }catch(e){setStatus('çizim kaydedilemedi: '+(e&&e.message||''),'');$('tuvalKayit').textContent='çizim kaydedilemedi: '+(e&&e.message||'')}
    cizimKaydediyor=false;
  }

  const nokta=e=>{const c=$('tuvalKanvas'),r=c.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]};
  $('tuvalKanvas').addEventListener('pointerdown',e=>{if(!tv.im)return;e.preventDefault();
    if(tv.igne){const n=nokta(e);tv.igneler=(tv.igneler||[]).concat([{x:n[0],y:n[1],not:''}]);tuvalCiz();igneListesi();igneKaydet();cizimPlanla();
      const inp=document.querySelector(`#igneListe input[data-igne="${tv.igneler.length-1}"]`);if(inp)inp.focus();return}
    $('tuvalKanvas').setPointerCapture(e.pointerId);
    tv.aktif={renk:tv.renk,kalin:tv.kalin,n:[nokta(e)]};tv.cizgiler.push(tv.aktif);tuvalCiz()});
  $('tuvalKanvas').addEventListener('pointermove',e=>{if(!tv.aktif)return;
    const n=nokta(e),son=tv.aktif.n[tv.aktif.n.length-1];
    if(Math.abs(n[0]-son[0])+Math.abs(n[1]-son[1])<.004)return;
    tv.aktif.n.push(n);tuvalCiz()});
  const cizBitir=()=>{if(!tv.aktif)return;tv.aktif=null;cizimPlanla()};
  $('tuvalKanvas').addEventListener('pointerup',cizBitir);
  $('tuvalKanvas').addEventListener('pointercancel',cizBitir);

  function cizgiGeriAl(){
    if(!tv.cizgiler.length){if(tv.silinen&&tv.silinen.length){tv.cizgiler=tv.silinen;tv.silinen=null;tuvalCiz();cizimPlanla();$('tuvalKayit').textContent='temizleme geri alındı';return}
      $('tuvalKayit').textContent='geri alınacak çizgi yok';return}
    tv.cizgiler.pop();tuvalCiz();cizimPlanla();
  }

  $('tuval').addEventListener('click',async e=>{
    if(Date.now()-surukleSonu<300&&!e.target.closest('button,a')){e.stopPropagation();return} // sürükleme bitti: tıklama sayılmaz, pencere kapanmaz
    const r=e.target.closest('[data-renk]');
    if(r){tv.renk=r.dataset.renk;[...document.querySelectorAll('[data-renk]')].forEach(b=>b.setAttribute('aria-pressed',b===r));return}
    const b=e.target.closest('[data-ciz]');
    if(!b){if(e.target.classList.contains('alan')||e.target.classList.contains('sahne')||e.target.classList.contains('medya')||e.target.id==='tuval')tuvalKapatSor();return}
    const ne=b.dataset.ciz;
    if(ne==='kapat'){tuvalKapatSor();return}
    if(ne==='onceki'||ne==='sonraki'){medyaGec(ne==='sonraki'?1:-1);return}
    if(ne==='zoom+'){yakinlas(1.25);return}
    if(ne==='indir'){await dosyaIndir(medya(tv.id)[tv.n]);return}
    if(ne==='igne'){tv.igne=!tv.igne;$('tuval').classList.toggle('igne-modu',tv.igne);b.setAttribute('aria-pressed',tv.igne);setStatus(tv.igne?'görsele dokun: iğne konur':'iğne kapalı','ok');return}
    if(ne==='zoom-'){yakinlas(1/1.25);return}
    if(ne==='zoom0'){yakinlas(0);return}
    if(ne==='el'){tv.el=!tv.el;zoomUygula();return}
    if(ne==='kare'){await kareAl();return}
    if(ne==='geri'){cizgiGeriAl();return}
    if(ne==='temizle'){if(tv.cizgiler.length){tv.silinen=tv.cizgiler;tv.cizgiler=[];tuvalCiz();cizimPlanla();$('tuvalKayit').textContent='temizlendi; Ctrl+Z geri alır'}return}
    if(ne==='kalinlik'){kalinIdx=(kalinIdx+1)%KALINLIK.length;tv.kalin=KALINLIK[kalinIdx].v;b.textContent='Kalınlık: '+KALINLIK[kalinIdx].ad;return}
    if(ne==='kaydet'){await cizimKaydet();return}
  });

  // ── ajana haber ver (yorum, oturumu uyandırır)
  let yorum=null;
  async function haberDurumu(){const b=$('haberBtn');if(!yorum){b.hidden=true;return}
    let d='off';try{d=await yorum.canSendToClaude()}catch(e){d='off'}
    b.hidden=d==='off';b.disabled=d!=='available';
    b.title=d==='available'?'Cevaplarını bitirdin mi? Ajanın oturumuna haber gider, defteri okuyup işler':(d==='no_session'?'Şu an bu defteri izleyen ajan oturumu yok; sohbete yaz':'Yalnız defterin sahibi haber verebilir')}
  $('haberBtn').addEventListener('click',async()=>{const b=$('haberBtn');if(!yorum)return;
    const biten=D.items.filter(it=>(state[it.id]||{}).done).map(it=>it.id);
    const sorulu=D.items.filter(it=>((state[it.id]||{}).sorular||[]).length>(it.yanitlar||[]).length).map(it=>it.id);
    const taslakNot=D.items.filter(it=>{const s=state[it.id]||{};return !s.done&&String(s.note||'').trim()}).map(it=>it.id);
    const metin='Defteri doldurdum'+(biten.length?': '+biten.join(', ')+' tamamlandı':'')+(sorulu.length?'; sorular: '+sorulu.join(', '):'')+(taslakNot.length?'; tamamlanmamış notlar: '+taslakNot.join(', '):'')+'. Defteri oku ve işle.';
    b.disabled=true;setStatus('ajana haber veriliyor…');
    try{const a=await yorum.anchorFor(document.getElementById('title')||b);await yorum.sendToClaude({anchor:a,text:metin});setStatus('ajana haber verildi; cevap yorumda gelir','ok');b.classList.remove('nabiz')}
    catch(e){setStatus(e&&e.code==='claude_unavailable'?'şu an haber verilemiyor; sohbete yaz':'haber verilemedi: '+(e&&e.code||''),'uyari')}
    setTimeout(haberDurumu,1500)});
  // ── dikte: tarayıcının ses tanıması varsa onu, yoksa sistemin diktesini kullan
  const SesTanima=window.SpeechRecognition||window.webkitSpeechRecognition;let dinleyen=null;
  const sistemDikte=()=>/Win/i.test(navigator.platform||navigator.userAgent)?"Windows+H'ye bas":(/Mac/i.test(navigator.platform||'')?'Fn tuşuna iki kez bas':'klavyedeki mikrofona bas');
  // claude.ai sayfayı mikrofon izni olmayan bir çerçevede açar; o zaman sistem diktesine yönlendir (ipucu düğmenin yanında)
  const mikIzin=(()=>{try{const p=document.permissionsPolicy||document.featurePolicy;return p&&p.allowsFeature?p.allowsFeature('microphone'):true}catch(e){return true}})();
  function dikteIpucu(b,ek){const sar=b.parentElement;sar.querySelectorAll('.dikte-ipucu').forEach(x=>x.remove());const d=document.createElement('div');d.className='dikte-ipucu';d.setAttribute('role','status');
    d.textContent=(ek?ek+' ':'')+'Sesle yazmak için kutu seçiliyken '+sistemDikte()+', konuş; yazı bu kutuya gelir.';sar.appendChild(d);setTimeout(()=>d.remove(),7000)}
  function dikte(b){const t=$(b.dataset.dikte);if(!t)return;t.focus();
    if(dinleyen){dinleyen.stop();return}
    if(!SesTanima||!mikIzin){dikteIpucu(b,mikIzin?'':'Bu görünümde mikrofon kapalı.');return}
    const r=new SesTanima();r.lang='tr-TR';r.interimResults=false;r.continuous=true;dinleyen=r;b.classList.add('dinliyor');
    const bas=t.value;let ek='';
    r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)ek+=(ek||bas?' ':'')+e.results[i][0].transcript.trim();t.value=(bas+ek).trim();t.dispatchEvent(new Event('input',{bubbles:true}))};
    r.onerror=e=>{dikteIpucu(b,e.error==='not-allowed'||e.error==='service-not-allowed'?'Bu görünümde mikrofon kapalı.':(e.error==='no-speech'?'Ses duyulmadı.':'Ses tanıma durdu.'))};
    r.onend=()=>{dinleyen=null;b.classList.remove('dinliyor')};
    try{r.start();setStatus('dinliyorum; bitince 🎙 ye bas','ok')}catch(e){dinleyen=null;b.classList.remove('dinliyor');dikteIpucu(b,'')}}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-dikte]');if(b){e.preventDefault();e.stopPropagation();dikte(b)}},true);
  // ── indirme
  let indirici=null;
  // paket eki: dosyalar ayrı yayınlanır, zip burada kurulur (sunucu zip barındırmaz)
  function crc32(b){let crc=-1;for(let i=0;i<b.length;i++){let c=(crc^b[i])&255;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;crc=(crc>>>8)^c}return (crc^-1)>>>0}
  function zipYap(dosyalar){const enc=new TextEncoder(),bas=[],mer=[];let ofs=0;
    for(const d of dosyalar){const ad=enc.encode(d.ad),crc=crc32(d.veri),n=d.veri.length;
      const h=new DataView(new ArrayBuffer(30));[[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[12,0x21,2],[14,crc,4],[18,n,4],[22,n,4],[26,ad.length,2]].forEach(([o,v,s])=>s===4?h.setUint32(o,v,true):h.setUint16(o,v,true));
      bas.push(new Uint8Array(h.buffer),ad,d.veri);
      const m=new DataView(new ArrayBuffer(46));[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[14,0x21,2],[16,crc,4],[20,n,4],[24,n,4],[28,ad.length,2],[42,ofs,4]].forEach(([o,v,s])=>s===4?m.setUint32(o,v,true):m.setUint16(o,v,true));
      mer.push(new Uint8Array(m.buffer),ad);ofs+=30+ad.length+n}
    const mb=mer.reduce((a,x)=>a+x.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,dosyalar.length,true);e.setUint16(10,dosyalar.length,true);e.setUint32(12,mb,true);e.setUint32(16,ofs,true);
    return new Blob([...bas,...mer,new Uint8Array(e.buffer)],{type:'application/zip'})}
  async function dosyaIndir(m){if(!m)return;setStatus('dosya hazırlanıyor…');
    try{let blob,ad;
      if(m.tur==='paket'){const kok=String(m.url).replace(/\/$/,'')+'/',dk=(m.klasor?m.klasor.replace(/\/$/,'')+'/':'');
        const l=await Promise.all((m.dosyalar||[]).map(async f=>{const r=await fetch(kok+f,{credentials:'same-origin'});if(!r.ok)throw new Error(f+' '+r.status);return {ad:dk+f,veri:new Uint8Array(await r.arrayBuffer())}}));
        blob=zipYap(l);ad=m.zipAdi||((m.ad||'paket').replace(/[^\wçğıöşüÇĞİÖŞÜ.-]+/g,'-')+'.zip')}
      else{const r=await fetch(m.url,{credentials:'same-origin'});if(!r.ok)throw new Error(r.status);blob=await r.blob();ad=dosyaAdi(m.url)||((m.ad||'dosya')+'.bin')}
      if(indirici){await indirici.save({filename:ad,data:blob});setStatus('indirildi','ok');return}
      throw new Error('indirme yetkisi yok')}
    catch(e){setStatus(e&&e.code==='declined'?'indirme iptal edildi':'indirilemedi; "Ayrı sekmede aç"','uyari')}}
  // ── önce / sonra sürgüsü
  // oranlar farklıysa ikisi de kırpılmadan sığar (contain); çok farklıysa yan yana açılır
  function karsiKur(root){root.querySelectorAll('.karsi:not([data-kuruldu])').forEach(k=>{k.dataset.kuruldu=1;
    const im=[...k.querySelectorAll('img')];const hazir=()=>{if(!im.every(i=>i.naturalWidth))return;
      const o=im.map(i=>i.naturalWidth/i.naturalHeight);k.style.setProperty('--oran',Math.min(...o).toFixed(4));
      karsiKip(k,Math.max(...o)/Math.min(...o)>1.03);karsiYer(k,50)};
    im.forEach(i=>i.complete?hazir():i.addEventListener('load',hazir,{once:true}));karsiYer(k,50)})}
  let karsiKare=0;
  function karsiYer(k,y){y=Math.max(0,Math.min(100,y));cancelAnimationFrame(karsiKare);karsiKare=requestAnimationFrame(()=>{
    k.style.setProperty('--k',y+'%');k.style.setProperty('--kx',(k.clientWidth*y/100)+'px');const s=k.querySelector('.karsi-sur');if(s&&+s.value!==y)s.value=y})}
  function karsiKip(k,yan){k.classList.toggle('yan',yan);k.dataset.kip=yan?'yan':'sur';k.querySelectorAll('img').forEach(i=>{i.title=yan?'Tam ekranda aç':''});if(!yan)karsiYer(k,50)}
  let karsiTut=null;
  document.addEventListener('pointerdown',e=>{const k=e.target.closest&&e.target.closest('.karsi');if(!k||k.classList.contains('yan')||e.button>0)return;
    karsiTut=k;k.setPointerCapture(e.pointerId);const r=k.getBoundingClientRect();karsiYer(k,(e.clientX-r.left)/r.width*100);k.querySelector('.karsi-sur').focus({preventScroll:true})});
  document.addEventListener('pointermove',e=>{if(!karsiTut)return;const r=karsiTut.getBoundingClientRect();karsiYer(karsiTut,(e.clientX-r.left)/r.width*100)});
  document.addEventListener('pointerup',()=>{karsiTut=null});document.addEventListener('pointercancel',()=>{karsiTut=null});
  document.addEventListener('input',e=>{const s=e.target.closest&&e.target.closest('.karsi-sur');if(s)karsiYer(s.closest('.karsi'),+s.value)});
  document.addEventListener('click',e=>{const im=e.target.closest&&e.target.closest('.karsi.yan img');if(!im)return;const k=im.closest('.karsi'),id=k.closest('.card').dataset.id;
    const sira=im.closest('.karsi-ust')?0:1;const it=maddeBul(id)||{};medyaAc(id,(it.ekler||[]).length+((state[id]||{}).gorseller||[]).length+sira)});
  window.addEventListener('resize',()=>document.querySelectorAll('.karsi:not(.yan)').forEach(k=>karsiYer(k,+k.querySelector('.karsi-sur').value)));
  new MutationObserver(()=>karsiKur(document)).observe(document.body,{childList:true,subtree:true});karsiKur(document);
  // ── şık açıklaması (▸ açıkla): seçmeden okunur
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-oac]');if(!b)return;e.preventDefault();e.stopPropagation();
    const l=b.closest('label');const ac=l.classList.toggle('ac');b.setAttribute('aria-expanded',ac);b.textContent=ac?'kapat':'açıkla'},true);
  // ── terimler: maddedeki bilinmeyen kelimeye dokununca tanımı altında açılır
  function terimKur(root){root.querySelectorAll('.card[data-id]:not([data-terim])').forEach(k=>{k.dataset.terim=1;const it=D.items.find(x=>x.id===k.dataset.id);const T=it&&it.terimler;if(!T||typeof T!=='object')return;
    Object.entries(T).forEach(([ad,tanim])=>{const kucuk=ad.toLocaleLowerCase('tr');let kondu=false;
      for(const alan of k.querySelectorAll('.title,.ot,.why-in,.body,.rec,.steps,.deliver')){if(kondu)break;
        const w=document.createTreeWalker(alan,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.terim,.terim-acik,code,pre,button')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
        let n;while((n=w.nextNode())){const i=n.data.toLocaleLowerCase('tr').indexOf(kucuk);if(i<0)continue;
          const son=n.splitText(i);son.splitText(ad.length);const b=document.createElement('button');b.type='button';b.className='terim';b.dataset.tanim=tanim;b.title='Ne demek?';b.setAttribute('aria-expanded','false');b.textContent=son.data;son.replaceWith(b);kondu=true;break}}})})}
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.terim');if(!b)return;e.preventDefault();e.stopPropagation();
    if(b._acik&&b._acik.isConnected){b._acik.remove();b._acik=null;b.setAttribute('aria-expanded','false');return}
    const a=document.createElement('span');a.className='terim-acik';a.setAttribute('role','note');a.textContent=b.textContent+': '+b.dataset.tanim;b._acik=a;b.setAttribute('aria-expanded','true');
    const lb=b.closest('label'),yer=b.closest('.head')||b.closest('p,li,blockquote,td,.rec,.deliver');
    if(lb)lb.appendChild(a);else if(yer)yer.after(a);else b.after(a)},true);
  new MutationObserver(()=>terimKur(document)).observe(document.body,{childList:true,subtree:true});terimKur(document);

  // ── 45: #id ile maddeye git (Merkez'den ve paylaşılan bağlantıdan)
  function hashGit(){let id='';try{id=decodeURIComponent((location.hash||'').slice(1))}catch(e){}if(id)maddeyeGit(id)}
  function maddeyeGit(id){if(String(id).startsWith('SN-')){snGit(String(id).slice(3));return}const it=maddeBul(id);if(!it)return;
    setSekme(isDone(it)?'done':'open');if(odakKip)odakIdx=Math.max(0,lastOpen.indexOf(id));render();
    requestAnimationFrame(()=>{const el=document.querySelector(`.card[data-id="${window.CSS.escape(id)}"]`);if(!el)return;document.querySelectorAll('.card.kfocus').forEach(c=>c.classList.remove('kfocus'));el.classList.add('kfocus');korumaSonu=Date.now()+1500;el.scrollIntoView({block:'start',behavior:yumusak()})})}
  window.addEventListener('hashchange',hashGit);
  // ── odak modu: tek kart, bitince sıradaki
  let odakKip=false,odakIdx=0;try{odakKip=sessionStorage.getItem('kd-odak-'+D.id)==='1'}catch(e){}
  function odakKur(v){odakKip=!!v;try{sessionStorage.setItem('kd-odak-'+D.id,v?'1':'0')}catch(e){}document.body.classList.toggle('odak-kip',odakKip);$('odakBtn').setAttribute('aria-pressed',odakKip);if(odakKip)topluKur(false);render();if(odakKip)scrollTo({top:0})}
  function odakUygula(ids){document.body.classList.toggle('odak-kip',odakKip&&sekme==='open');$('odakBar').hidden=!(odakKip&&sekme==='open'&&ids.length);if(!odakKip)return;
    odakIdx=Math.max(0,Math.min(ids.length-1,odakIdx));const kart=document.querySelector(`#open .card[data-id="${window.CSS.escape(ids[odakIdx]||'')}"]`);if(kart)kart.classList.add('odak-bu');
    $('odakSayac').textContent=ids.length?(odakIdx+1)+' / '+ids.length:'';document.querySelector('[data-odak="-1"]').disabled=odakIdx<=0;document.querySelector('[data-odak="1"]').disabled=odakIdx>=ids.length-1}
  function odakGec(y){odakIdx+=y;render();scrollTo({top:0})}
  $('odakBtn').addEventListener('click',()=>odakKur(!odakKip));
  $('odakBar').addEventListener('click',e=>{const b=e.target.closest('[data-odak]');if(!b)return;if(b.dataset.odak==='cik')odakKur(false);else odakGec(+b.dataset.odak)});
  // ── toplu cevap
  let topluKip=false;const topluSecili=new Set();
  function topluKur(v){topluKip=!!v;if(!v)topluSecili.clear();if(v&&odakKip)odakKur(false);document.body.classList.toggle('toplu-kip',topluKip);render()}
  function topluCiz(){$('topluBar').hidden=!(topluKip&&sekme==='open');$('topluSayi').textContent=topluSecili.size+' seçili';document.querySelectorAll('[data-toplu-is]').forEach(b=>{if(!['hepsi','cik'].includes(b.dataset.topluIs))b.disabled=!topluSecili.size})}
  document.addEventListener('change',e=>{const c=e.target.closest&&e.target.closest('[data-toplu]');if(!c)return;if(c.checked)topluSecili.add(c.dataset.toplu);else topluSecili.delete(c.dataset.toplu);topluCiz()});
  $('topluBar').addEventListener('click',e=>{const b=e.target.closest('[data-toplu-is]');if(!b)return;const is=b.dataset.topluIs;
    if(is==='cik'){topluKur(false);return}
    if(is==='hepsi'){lastOpen.forEach(id=>topluSecili.add(id));render();return}
    const atla=is==='sonra'?[]:[...topluSecili].filter(id=>riskli(maddeBul(id))||secimSart(maddeBul(id)));
    const ids=[...topluSecili].filter(id=>lastOpen.includes(id)&&!atla.includes(id));if(!ids.length){if(atla.length)setStatus('seçtiklerin acil ya da riskli; tek tek cevapla','uyari');return}kaydet_geri('toplu cevap',ids);const zaman=new Date().toISOString();
    ids.forEach(id=>{const it=maddeBul(id)||{};const st=Object.assign({},state[id]);
      if(is==='sonra'){st.later=true}else{if(is==='oneri'&&it.recv&&!st.choice)st.choice=it.recv;if(!st.note)st.note=is==='oneri'?'önerildiği gibi':'Tamam';st.done=true;st.doneAt=zaman;st.later=false}
      state[id]=st;persist(id)});
    topluSecili.clear();atla.forEach(id=>topluSecili.add(id));render();setStatus(ids.length+' madde '+(is==='sonra'?'sonraya atıldı':'tamamlandı')+(atla.length?'; '+atla.length+' acil ya da riskli madde atlandı, tek tek cevapla':'')+'; Ctrl+Z geri alır','ok')});
  // ── komut paleti: madde, sayfa, komut
  let paletSec=0,paletL=[];
  function paletKomutlar(){const K=[['Açık maddeler','komut',()=>{setSekme('open');render();scrollTo({top:0})}],['Bitti','komut',()=>{setSekme('done');render();scrollTo({top:0})}],
      ['Sadece acil','komut',()=>{onlyUrgent=true;$('onlyUrgent').setAttribute('aria-pressed',true);setSekme('open');render()}],
      [odakKip?'Odak modundan çık':'Odak modu: tek kart','komut',()=>{setSekme('open');odakKur(!odakKip)}],[topluKip?'Toplu cevabı bitir':'Toplu cevap: birden çok maddeyi seç','komut',()=>{setSekme('open');topluKur(!topluKip)}],
      ['Ayarlar','komut',()=>setTimeout(()=>ayarAc(true),60)],['Tema: gündüz / gece','komut',()=>$('swBtn').click()],['Kararları kopyala','komut',()=>$('copy').click()],
      ['Haftalık karar özeti','komut',()=>ozetAc()],['Yazdır / PDF','komut',()=>window.print()],['Ajana madde ekle','komut',()=>{setSekme('open');render();setTimeout(()=>{$('addTitle').scrollIntoView({block:'center'});$('addTitle').focus()},50)}],
      ['Defter Merkezi','komut',()=>window.open($('merkezLink').href,'_blank','noopener')],['Kısayollar','komut',()=>keysAc(true)]];
    document.querySelectorAll('.tab[data-sayfa]').forEach(t=>K.push([t.textContent,'sayfa',()=>{setSekme(t.dataset.sekme);render();scrollTo({top:0})}]));
    return K.map(([t,tur,f])=>({t,tur,f}))}
  function paletListe(q){q=(q||'').trim().toLocaleLowerCase('tr');
    const maddeler=D.items.filter(it=>!it.resolved).concat(mine()).map(it=>({id:it.id,t:baslik(it.title),tur:isDone(it)?'bitti':'madde',f:()=>maddeyeGit(it.id)}));
    const lst=paletKomutlar().concat(maddeler);if(!q)return lst.filter(x=>x.tur!=='bitti').slice(0,40);
    const puan=x=>{const a=((x.id||'')+' '+x.t).toLocaleLowerCase('tr');if((x.id||'').toLocaleLowerCase('tr')===q)return 0;if(a.startsWith(q))return 1;if(a.includes(' '+q))return 2;if(a.includes(q))return 3;const p=q.split(/\s+/);return p.every(w=>a.includes(w))?4:9};
    return lst.map(x=>[puan(x),x]).filter(([p])=>p<9).sort((a,b)=>a[0]-b[0]).map(([,x])=>x).slice(0,60)}
  function paletCiz(){paletL=paletListe($('paletGir').value);paletSec=Math.min(paletSec,Math.max(0,paletL.length-1));
    $('paletListe').innerHTML=paletL.map((x,i)=>`<li role="option" data-i="${i}" aria-selected="${i===paletSec}"><span class="tur">${x.tur==='komut'?'komut':x.tur==='sayfa'?'sayfa':x.tur==='bitti'?'bitti':'madde'}</span>${x.id?`<span class="pid">${esc(x.id)}</span>`:''}<span class="pt">${esc(x.t)}</span></li>`).join('')||'<li aria-disabled="true"><span class="pt">Eşleşen yok</span></li>';
    const s=$('paletListe').querySelector('[aria-selected="true"]');s&&s.scrollIntoView({block:'nearest'})}
  function paletAc(){menuAc(false);ayarAc(false);$('paletOrtu').hidden=false;$('paletGir').value='';paletSec=0;paletCiz();$('paletGir').focus()}
  function paletKapat(){$('paletOrtu').hidden=true}
  function paletCalis(i){const x=paletL[i];if(!x)return;paletKapat();x.f()}
  $('araBtn').addEventListener('click',paletAc);
  $('paletGir').addEventListener('input',()=>{paletSec=0;paletCiz()});
  $('paletGir').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();paletSec=Math.min(paletL.length-1,paletSec+1);paletCiz()}else if(e.key==='ArrowUp'){e.preventDefault();paletSec=Math.max(0,paletSec-1);paletCiz()}else if(e.key==='Enter'){e.preventDefault();paletCalis(paletSec)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();paletKapat()}});
  $('paletListe').addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li)paletCalis(+li.dataset.i)});
  $('paletOrtu').addEventListener('click',e=>{if(e.target===$('paletOrtu'))paletKapat()});
  // ── haftalık karar özeti: son yedi günde kapanan kararlar, md
  function ozetMetni(){const sinir=Date.now()-7*864e5;const lst=D.items.filter(it=>{const s=state[it.id]||{};return s.done&&s.doneAt&&new Date(s.doneAt)>=sinir}).sort((a,b)=>String(state[a.id].doneAt).localeCompare(String(state[b.id].doneAt)));
    const g=t=>new Date(t).toLocaleDateString('tr-TR',{day:'numeric',month:'long'});const hucre=x=>String(x||'').replace(/\|/g,'/').replace(/\s+/g,' ').trim();
    const sat=lst.map(it=>{const s=state[it.id];return `| ${it.id} | ${hucre(baslik(it.title))} | ${hucre([secimEtiket(it,s.choice||''),s.note].filter(Boolean).join('; ')||'tamam')} | ${hucre(s.gerekce||'')} | ${g(s.doneAt)} |`});
    return `# ${baslikKisa()}: haftalık karar özeti\n\n${g(sinir)} ile ${g(Date.now())} arası, ${lst.length} karar.\n\n`+(lst.length?`| Madde | Konu | Karar | Gerekçe | Tarih |\n| --- | --- | --- | --- | --- |\n${sat.join('\n')}\n`:'Bu hafta kapanan karar yok.\n')}
  function ozetAc(){menuAc(false);$('ozetMetin').textContent=ozetMetni();$('ozetOrtu').hidden=false}
  $('ozetBtn').addEventListener('click',ozetAc);$('yazdirBtn').addEventListener('click',()=>{menuAc(false);setTimeout(()=>window.print(),200)});
  $('ozetOrtu').addEventListener('click',async e=>{const b=e.target.closest('[data-ozet]');if(e.target===$('ozetOrtu')||(b&&b.dataset.ozet==='kapat')){$('ozetOrtu').hidden=true;return}if(!b)return;const t=$('ozetMetin').textContent;
    if(b.dataset.ozet==='kopyala'){try{await navigator.clipboard.writeText(t);setStatus('özet kopyalandı','ok')}catch(_){setStatus('kopyalanamadı','uyari')}}
    if(b.dataset.ozet==='indir'){const ad=(D.id||'defter')+'-haftalik-ozet.md';if(indirici){try{await indirici.save({filename:ad,data:new Blob([t],{type:'text/markdown'})});setStatus('indirildi','ok')}catch(e2){setStatus(e2&&e2.code==='declined'?'indirme iptal edildi':'indirilemedi; Kopyala','uyari')}}else setStatus('bu görünümde indirilemiyor; Kopyala','uyari')}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('ozetOrtu').hidden){$('ozetOrtu').hidden=true;e.stopPropagation()}},true);
  // ── boy bekçisi: ajana arşiv isteği tek tıkla
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-boy]');if(!b)return;const id='UG-'+Date.now().toString(36);
    state[id]={title:'Defteri arşivle: eski ve sonraya atılan maddeleri arşive al',body:'Boy bekçisi: açık madde sınırı aşıldı.',from:'kullanici',createdAt:new Date().toISOString()};persist(id);state._boyUyari={at:new Date().toISOString()};persist('_boyUyari');render();setStatus('ajana iletildi: '+id,'ok')});
  // ── ⋯ menüsü dışına basınca kapanır
  document.addEventListener('click',e=>{document.querySelectorAll('details.daha[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})});
  // ── kaydırarak cevap: sağa Tamamla, sola Sonra (dokunmatik)
  let ky=null;
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||ayar.kaydir===false||odakKip||topluKip)return;const k=e.target.closest('#open .card');if(!k||e.target.closest('input,textarea,button,label,a,select,summary,.karsi,.drag,.daha-menu,.gorseller,.tablo-sar,table,pre,code,.mesaj,.body'))return;ky={k,x:e.clientX,y:e.clientY,dx:0,on:false}});
  document.addEventListener('pointermove',e=>{if(!ky)return;const dx=e.clientX-ky.x,dy=e.clientY-ky.y;
    if(!ky.on){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){ky=null;return}if(Math.abs(dx)<14)return;ky.on=true;ky.k.classList.add('kayiyor')}
    ky.dx=dx;ky.k.style.transform=`translateX(${dx}px)`;const sag=dx>0;ky.k.dataset.yon=sag?'sag':'sol';ky.k.dataset.kaydirIpucu=Math.abs(dx)>100?(sag?'bırak: tamamla':'bırak: sonra'):(sag?'tamamla →':'← sonra')});
  const kyBitir=()=>{if(!ky)return;const {k,dx,on}=ky;ky=null;if(!on)return;k.classList.remove('kayiyor');
    if(Math.abs(dx)>100){const id=k.dataset.id;k.style.transform='';if(dx>0){const it=maddeBul(id);if(riskli(it)||secimSart(it)){setStatus(id+': acil ya da riskli; kaydırarak tamamlanmaz, şık seç','uyari');return}const b=k.querySelector('[data-done]');b&&b.click()}else{kaydet_geri('sonraya atma',[id]);state[id]=Object.assign({},state[id],{later:true});persist(id);render();setStatus(id+' sonraya atıldı; Ctrl+Z geri alır','ok')}return}
    k.classList.add('geri-kay');k.style.transform='';setTimeout(()=>k.classList.remove('geri-kay'),220)};
  document.addEventListener('pointerup',kyBitir);document.addEventListener('pointercancel',kyBitir);
  // ── bütçe satırı (ajan yazar: "butce")
  if(D.butce)$('butceBilgi').textContent='Bu hafta ≈ '+D.butce+' · ';

  // ── 46: kaynak güven sınıfları, BibTeX ve RIS, yedek, ⋯ menüsünde klavye, uzun önerim
  const guvenAd={hakemli:['hakemli dergi','Hakem denetiminden geçmiş dergi makalesi'],kitap:['akademik kitap','Akademik yayınevi ya da üniversite yayını'],tez:['tez','Yüksek lisans ya da doktora tezi'],rapor:['kurum raporu','Kamu kurumu, müze ya da vakıf raporu'],arsiv:['arşiv belgesi','Birincil kaynak: arşiv, katalog, belge'],basin:['basın','Gazete, dergi, blog: veri olur, dayanak olmaz']};
  const bibAnahtar=(k,i)=>((String(k.yazar||'kaynak').split(/[,;\s]/)[0]||'kaynak').normalize('NFD').replace(/[^\w]/g,'')+(k.yil||'')+'_'+(i+1));
  const bibTur=k=>({hakemli:'article',kitap:'book',tez:'phdthesis',rapor:'techreport'})[k.guven]||(k.dergi?'article':'misc');
  function bibtex(){return (D.kaynakca||[]).map((k,i)=>{const a=[['title',k.baslik],['author',String(k.yazar||'').replace(/\s*[;&]\s*/g,' and ')],['year',k.yil],['journal',k.dergi],['doi',k.doi],['url',k.url],['note',k.neden]].filter(([,v])=>v);
    return '@'+bibTur(k)+'{'+bibAnahtar(k,i)+',\n'+a.map(([n,v])=>'  '+n+' = {'+String(v).replace(/[{}]/g,'')+'}').join(',\n')+'\n}'}).join('\n\n')+'\n'}
  function ris(){return (D.kaynakca||[]).map(k=>{const ty=({hakemli:'JOUR',kitap:'BOOK',tez:'THES',rapor:'RPRT'})[k.guven]||(k.dergi?'JOUR':'GEN');
    const l=['TY  - '+ty,'TI  - '+(k.baslik||'')];String(k.yazar||'').split(/\s*;\s*/).filter(Boolean).forEach(a=>l.push('AU  - '+a));if(k.yil)l.push('PY  - '+k.yil);if(k.dergi)l.push('JO  - '+k.dergi);if(k.doi)l.push('DO  - '+k.doi);if(k.url)l.push('UR  - '+k.url);if(k.neden)l.push('N1  - '+k.neden);l.push('ER  - ');return l.join('\r\n')}).join('\r\n\r\n')+'\r\n'}
  async function dosyaVer(ad,metin,tur){if(indirici){try{await indirici.save({filename:ad,data:new Blob([metin],{type:tur})});setStatus('indirildi: '+ad,'ok');return}catch(e){if(e&&e.code==='declined'){setStatus('indirme iptal edildi','uyari');return}}}
    try{await navigator.clipboard.writeText(metin);setStatus('bu görünümde indirilemiyor; içerik panoya kopyalandı','uyari')}catch(_){setStatus('indirilemedi','uyari')}}
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-kaynak-indir]');if(!b)return;const bib=b.dataset.kaynakIndir==='bib';dosyaVer((D.id||'kaynakca')+(bib?'.bib':'.ris'),bib?bibtex():ris(),bib?'application/x-bibtex':'application/x-research-info-systems')});
  function yedekMetni(){const g=new Date().toISOString().slice(0,10);const sat=[`# ${baslikKisa()}: yedek (${g})`,'',D.purpose||'',''];
    D.items.concat(mine()).forEach(it=>{const s=state[it.id]||{};sat.push(`## ${it.id} ${baslik(it.title)}`,'',`Durum: ${s.done?'tamamlandı '+String(s.doneAt||'').slice(0,10):'açık'}`);
      if(s.choice)sat.push('Karar: '+secimEtiket(it,s.choice));if(s.note)sat.push('Not: '+s.note);if(s.gerekce)sat.push('Gerekçe: '+s.gerekce);if(it.rec)sat.push('Önerim: '+it.rec);
      dosyaNotlari(it.id).forEach(n=>sat.push('Dosya notu, '+n.ad+': '+n.not));(s.sorular||[]).forEach(q=>sat.push('Soru: '+q.q));sat.push('')});
    if((D.kaynakca||[]).length){sat.push('## Kaynakça','');D.kaynakca.forEach(k=>sat.push('- '+kunye(k)))}
    return sat.join('\n')+'\n'}
  $('yedekBtn').addEventListener('click',async()=>{menuAc(false);const g=new Date().toISOString().slice(0,10);
    const veri={defter:{id:D.id,title:D.title,purpose:D.purpose||'',url:D.url||''},tarih:new Date().toISOString(),maddeler:D.items,cevaplar:state,kaynakca:D.kaynakca||[],sayfalar:D.sayfalar||[]};
    await dosyaVer((D.id||'defter')+'-yedek-'+g+'.md',yedekMetni(),'text/markdown');
    setTimeout(()=>dosyaVer((D.id||'defter')+'-yedek-'+g+'.json',JSON.stringify(veri,null,1),'application/json'),400)});
  // ⋯ menüsü: açılınca ilk öğe, ok tuşlarıyla gezilir, Esc kapatır
  document.addEventListener('toggle',e=>{const d=e.target;if(!d.classList||!d.classList.contains('daha')||!d.open)return;const f=d.querySelector('.daha-menu>*');f&&f.focus({preventScroll:true})},true);
  document.addEventListener('keydown',e=>{const m=e.target.closest&&e.target.closest('.daha-menu');if(!m)return;const l=[...m.children];const i=l.indexOf(e.target);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();l[(i+(e.key==='ArrowDown'?1:-1)+l.length)%l.length].focus()}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const d=m.closest('details');d.open=false;d.querySelector('summary').focus()}},true);
  document.addEventListener('click',e=>{const r=e.target.closest&&e.target.closest('.rec.uzun');if(r&&!e.target.closest('a'))r.classList.toggle('ac')});

  // ── 47: Drive köprüsü (Merkez'le eşitleme). Her artifact'ın veritabanı ayrı olduğu için defter ve Merkez,
  // kullanıcının Drive'ındaki "Defter Esitleme" klasöründe küçük JSON dosyalarıyla haberleşir. Sayfa yapar; ajan, token yok.
  const DRIVE='Google Drive',KLASOR='Defter Esitleme';let mcp=null,izinler=null,kopruSaat=null,kopruMesgul=false;
  const aidim=()=>{const u=String(D.url||'');return u?u.replace(/[?#].*$/,'').replace(/\/$/,'').split('/').pop():''};
  const kopruOku=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
  const kopruSakla=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  async function kopruCagir(arac,girdi){const r=await mcp.callTool(DRIVE,arac,girdi,{cache:false});return r&&r.payload!==undefined?r.payload:r}
  async function kopruKlasor(yeniden){let id=yeniden?null:kopruOku('kd-kopru-klasor');if(id)return id;
    const r=await kopruCagir('search_files',{query:"title = '"+KLASOR+"' and mimeType = 'application/vnd.google-apps.folder' and owner = 'me'",excludeContentSnippets:true,pageSize:5});
    const f=((r&&r.files)||[])[0];id=f?f.id:((await kopruCagir('create_file',{title:KLASOR,contentMimeType:'application/vnd.google-apps.folder'}))||{}).id;
    if(id)kopruSakla('kd-kopru-klasor',id);return id}
  const kisa=(t,n)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1)+'…':t};
  function maddeSatiri(it){const r={id:it.id,t:kisa(it.title,140),y:it.type,p:it.priority};if(it.why)r.w=kisa(it.why,320);if(it.rec)r.r=kisa(it.rec,240);if(it.body)r.b=kisa(it.body,260);
    if((it.options||[]).length){r.o=it.options.map(o=>{const x={v:o.v,t:o.t};if(o.m)x.m=o.m;if(o.d)x.d=o.d;return x});if(it.recv)r.rv=it.recv;if(it.coklu)r.c=true}
    if((it.steps||[]).length)r.s=it.steps.length;if(it.due)r.d=it.due;if(it.risk)r.k=it.risk;if(it.acildi)r.a=it.acildi;return r}
  function kopruOzeti(){const acik=[],cevaplar={};D.items.filter(it=>!it.resolved).forEach(it=>{const s=state[it.id]||{};
      if(s.done){const c={q:baslik(it.title).slice(0,100),doneAt:s.doneAt||''};if(s.choice)c.label=secimEtiket(it,s.choice)||String(s.choice);if(s.note)c.note=kisa(s.note,200);if(s.kaynak)c.kaynak=s.kaynak;cevaplar[it.id]=c}
      else acik.push(maddeSatiri(it))});
    return {defter:D.id,ad:D.title.split(';')[0].trim(),url:D.url||'',aid:aidim(),at:new Date().toISOString(),acik,cevaplar}}
  async function kopruYaz(elle){if(!mcp||kopruMesgul)return false;const oz=kopruOzeti(),imza=JSON.stringify([oz.acik,oz.cevaplar]),onceki=kopruOku('kd-kopru-'+D.id)||{};
    if(!elle&&onceki.imza===imza)return true;kopruMesgul=true;
    try{let k=await kopruKlasor(),f;
      const yaz=()=>kopruCagir('create_file',{title:'kd-'+D.id+'.json',parentId:k,textContent:JSON.stringify(oz),contentMimeType:'application/json',disableConversionToGoogleType:true});
      try{f=await yaz()}catch(e){if(e&&e.code==='tool_error'){k=await kopruKlasor(true);f=await yaz()}else throw e}
      const yeni=(f||{}).id;if(onceki.dosya&&onceki.dosya!==yeni)kopruCagir('trash_file',{fileId:onceki.dosya}).catch(()=>{});
      kopruSakla('kd-kopru-'+D.id,{imza,dosya:yeni,at:oz.at});return true}
    catch(e){if(elle)setStatus(kopruHata(e),'uyari');return false}finally{kopruMesgul=false}}
  function kopruHata(e){const c=e&&e.code;return c==='server_not_connected'?'Google Drive bağlı değil: claude.ai Ayarlar → Bağlayıcılar':(c==='needs_reauth'?'Google Drive bağlantısı düşmüş; claude.ai Ayarlar → Bağlayıcılar\'dan yeniden bağla':(c==='not_in_manifest'||c==='not_granted'?'Bu defterde Drive izni kapalı; artifact menüsünde İzinler':'eşitlenemedi ('+(c||'hata')+'); biraz sonra yeniden dene'))}
  function kopruPlanla(){if(!mcp)return;clearTimeout(kopruSaat);kopruSaat=setTimeout(()=>kopruYaz(false),4000)}
  // Merkez'in gönderdiği cevaplar: kd-merkez-cevap.json; bu deftere ait olanlar sayfaya ve veritabanına işlenir
  async function merkezCevaplariniAl(){if(!mcp)return 0;const k=await kopruKlasor();
    const r=await kopruCagir('search_files',{query:"parentId = '"+k+"' and title = 'kd-merkez-cevap.json'",excludeContentSnippets:true,pageSize:5});
    const f=((r&&r.files)||[]).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)))[0];if(!f)return 0;
    const icerik=await kopruCagir('download_file_content',{fileId:f.id});let veri=null;
    try{const b=atob((icerik||{}).content||'');veri=JSON.parse(new TextDecoder().decode(Uint8Array.from(b,ch=>ch.charCodeAt(0))))}catch(_){return 0}
    const aid=aidim();let n=0;
    ((veri&&veri.cevaplar)||[]).forEach(c=>{if(!(c.defterId===D.id||(aid&&c.defter===aid)))return;const it=D.items.find(x=>x.id===c.id);if(!it||it.resolved)return;const cur=state[c.id]||{};if(cur.done)return;
      state[c.id]=Object.assign({},cur,{done:true,doneAt:c.at||new Date().toISOString(),kaynak:'merkez',later:false},c.choice!==undefined?{choice:c.choice}:{},c.note?{note:c.note}:{},c.ret?{ret:c.ret}:{});persist(c.id);n++});
    if(n){renderSafe();setStatus(n+' cevap Merkez\'den geldi','ok')}return n}
  async function esitle(elle){if(!mcp){if(elle)setStatus('Bu görünümde Drive köprüsü yok; ajana "defteri oku" de','uyari');return}
    if(elle)setStatus('eşitleniyor…');try{const n=await merkezCevaplariniAl();const ok=await kopruYaz(true);if(elle&&ok)setStatus('Merkez\'le eşitlendi'+(n?'; '+n+' cevap Merkez\'den geldi':''),'ok')}catch(e){if(elle)setStatus(kopruHata(e),'uyari')}}
  $('esitleBtn').addEventListener('click',()=>{menuAc(false);esitle(true)});
  // ── başlat
  document.documentElement.lang='tr';
  {const m=/\u015fablon s\u00fcr\u00fcm\u00fc: (\d+)/.exec(document.documentElement.innerHTML.slice(0,6000));const el=$('surumNo');if(el)el.textContent=m?m[1]:'?';$('menuSurum').textContent=m?m[1]:'?'}
  if(D.merkez)$('merkezLink').href=D.merkez;
  if(D.purpose)$('purpose').innerHTML=mdSatir(D.purpose);
  // ── okuma sayfaları ve kaynakça: kaynak JSON'daki sayfalar ve kaynakca alanlarından
  function sayfalariKur(){const ss=(Array.isArray(D.sayfalar)?D.sayfalar:[]).filter(x=>x&&x.id&&x.ad).slice();
    if(Array.isArray(D.kaynakca)&&D.kaynakca.length)ss.push({id:'kaynakca',ad:D.kaynakcaAd||'Kaynakça',kaynakca:true});
    if(!ss.length)return;const tb=document.querySelector('.tabs'),pk=$('sayfaPanelleri');tb.classList.add('cok');
    // durum "kapali": sekme çubuğunda durmaz; "Diğer" altında koşulu ve maliyetiyle listelenir, istenince gösterilir
    const kapali=ss.filter(x=>x.durum==='kapali'),acikS=ss.filter(x=>x.durum!=='kapali');
    const panelKur=(x,kap)=>{const v='s-'+x.id;const d=document.createElement('div');d.className='sayfa-panel';d.id='panel-'+v;d.setAttribute('role','tabpanel');d.hidden=true;if(kap)d.dataset.kapali='1';
      d.innerHTML=(kap?'<button type="button" class="ghost sayfa-geri" data-sekme="s-_diger">← Diğer sayfalar</button>':'')+(x.kaynakca?kaynakcaHtml():(x.tur==='senaryo'&&D.senaryo?'<div class="sn" data-sn></div>':'<div class="body sayfa-icerik">'+md(x.body||'')+'</div>'));pk.appendChild(d)};
    const sekmeKur=(v,ad)=>{const b=document.createElement('button');b.className='tab';b.dataset.sekme=v;b.dataset.sayfa='1';b.setAttribute('role','tab');b.setAttribute('aria-selected','false');b.textContent=ad;tb.appendChild(b)};
    acikS.forEach(x=>{sekmeKur('s-'+x.id,x.ad);panelKur(x,false)});
    if(kapali.length){sekmeKur('s-_diger','Diğer ('+kapali.length+')');
      const d=document.createElement('div');d.className='sayfa-panel';d.id='panel-s-_diger';d.setAttribute('role','tabpanel');d.hidden=true;
      d.innerHTML='<div class="body"><p>Bu sayfalar şimdilik kapalı: ajan onları güncellemez, token harcamaz. Koşulu gelince açılır; yüksek maliyetli olanı açmadan önce sana sorar.</p></div><ul class="diger-liste">'+kapali.map(x=>`<li><span class="ad">${esc(x.ad)}</span><span class="kosul">${x.kosul?'Açılır: '+mdSatir(x.kosul):'Koşulu yazılmadı'}${x.m?` <span class="maliyet m${ ({yok:0,'düşük':1,orta:2,'yüksek':3})[String(x.m).toLocaleLowerCase('tr')]??1}" title="Açmanın token maliyeti">m ${esc(x.m)}</span>`:''}</span><button type="button" class="ghost" data-sekme="s-${esc(x.id)}">Göster</button></li>`).join('')+'</ul>';pk.appendChild(d);
      kapali.forEach(x=>panelKur(x,true))}
    // menüde de dursun: Bitti'nin altına
    const nav=document.querySelector('#menuOrtu nav'),sonra=nav.querySelector('[data-git="acil"]');
    acikS.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.dataset.git='sayfa';b.dataset.sayfaId='s-'+x.id;b.className='menu-sayfa';b.innerHTML='<small>·</small><span>'+esc(x.ad)+'</span>';nav.insertBefore(b,sonra)})}
  const kunye=k=>(k.yazar||'[yazar]')+' ('+(k.yil||'t.y.')+'). '+(k.baslik||'')+'.'+(k.dergi?' '+k.dergi+'.':'')+(k.doi?' https://doi.org/'+k.doi:(k.url?' '+k.url:''));
  function kaynakcaHtml(){const lst=D.kaynakca,gr=[...new Set(lst.map(k=>k.grup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
    return `<div class="kaynak-arac"><input type="search" class="kaynak-ara" placeholder="Kaynaklarda ara" aria-label="Kaynaklarda ara"><select class="kaynak-grup" aria-label="Gruba göre"><option value="">Bütün gruplar (${lst.length})</option>${gr.map(g=>`<option>${esc(g)}</option>`).join('')}</select>${lst.some(k=>k.guven)?`<select class="kaynak-guven" aria-label="Güven sınıfına göre"><option value="">Bütün türler</option>${window.Object.entries(guvenAd).filter(([g])=>lst.some(k=>k.guven===g)).map(([g,[a]])=>`<option value="${g}">${a}</option>`).join('')}</select>`:''}<button type="button" class="btn ghost" data-kaynak-indir="bib" title="Zotero, Mendeley ve Word için">BibTeX indir</button><button type="button" class="btn ghost" data-kaynak-indir="ris">RIS indir</button></div>
    <div class="kaynak-liste">${lst.slice().sort((a,b)=>String(a.grup||'').localeCompare(String(b.grup||''),'tr')||String(a.yil||'').localeCompare(String(b.yil||''))).map(k=>`<div class="kaynak${k.geri_cekildi?' cekildi':''}" data-g="${esc(k.grup||'')}" data-guven="${esc(k.guven||'')}" data-ara="${esc([k.baslik,k.yazar,k.dergi,k.yil,k.grup,k.neden].join(' ').toLocaleLowerCase('tr'))}">
      <div class="kaynak-baslik">${esc(k.baslik||'')}</div>
      <div class="kaynak-meta">${k.geri_cekildi?'<span class="pill cekildi" title="Dergide geri çekildiği kayıtlı; dayanak olarak kullanma">geri çekildi</span> ':''}${k.guven&&guvenAd[k.guven]?`<span class="pill guven g-${k.guven}" title="${guvenAd[k.guven][1]}">${guvenAd[k.guven][0]}</span> `:''}${k.dogrulandi?`<span class="pill dogru" title="Künye dizinden doğrulandı">DOI doğrulandı · ${esc(String(k.dogrulandi).slice(0,10))}</span> `:''}${k.grup?`<span class="pill">${esc(k.grup)}</span> `:''}${esc([k.yazar,k.dergi,k.yil].filter(Boolean).join(' · '))}${k.doi?` · <a href="https://doi.org/${esc(k.doi)}" target="_blank" rel="noopener">doi.org/${esc(k.doi)}</a>`:(k.url?` · <a href="${esc(k.url)}" target="_blank" rel="noopener">bağlantı</a>`:' · <span class="soluk">DOI yok</span>')}</div>
      ${k.neden?`<div class="kaynak-neden">${mdSatir(k.neden)}</div>`:''}
      <details class="kunye"><summary>künye</summary><code>${esc(kunye(k))}</code>${kopyaSvg}</details></div>`).join('')}</div><p class="kaynak-yok" hidden>Eşleşen kaynak yok.</p>`}
  function kaynakSuz(panel){const q=(panel.querySelector('.kaynak-ara').value||'').trim().toLocaleLowerCase('tr'),g=panel.querySelector('.kaynak-grup').value,gv=(panel.querySelector('.kaynak-guven')||{}).value||'';let n=0;
    panel.querySelectorAll('.kaynak').forEach(k=>{const v=(!g||k.dataset.g===g)&&(!gv||k.dataset.guven===gv)&&(!q||k.dataset.ara.includes(q));k.hidden=!v;if(v)n++});panel.querySelector('.kaynak-yok').hidden=n>0}
  document.addEventListener('input',e=>{const p=e.target.closest&&e.target.closest('.sayfa-panel');if(p&&(e.target.classList.contains('kaynak-ara')))kaynakSuz(p)});
  document.addEventListener('change',e=>{const p=e.target.closest&&e.target.closest('.sayfa-panel');if(p&&(e.target.classList.contains('kaynak-grup')||e.target.classList.contains('kaynak-guven')))kaynakSuz(p)});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-teyit]');if(!b)return;const id=b.dataset.teyit;state[id]=Object.assign({},state[id]);
    if(state[id].teyit)delete state[id].teyit;else state[id].teyit=new Date().toISOString();persist(id);render()});
  sayfalariKur();   // senaryo sayfası ilk render()'da çizilir
  // ── hızlı cevap, hayır nedeni, soru, dinle, Claude'a gönder
  document.addEventListener('click',e=>{const t=e.target;
    const hz=t.closest&&t.closest('[data-hz]');
    if(hz){const kutu=hz.closest('.hizli'),id=kutu.dataset.hizli,it=maddeBul(id);if(!it)return;state[id]=Object.assign({},state[id]);const st=state[id],nt=document.getElementById('note-'+id);
      if(hz.dataset.hz==='tamam'){if(it.options&&!st.choice&&it.recv&&!it.coklu)st.choice=it.recv;if(!(nt&&nt.value.trim()))st.note='Tamam';else st.note=nt.value.trim();complete(id);return}
      if(hz.dataset.hz==='hayir'){const rn=kutu.querySelector('.ret-neden');rn.hidden=!rn.hidden;return}
      if(hz.dataset.hz==='soru'){const sk=kutu.closest('.card').querySelector('.soru-kutu');sk.hidden=!sk.hidden;if(!sk.hidden)sk.querySelector('textarea').focus();return}}
    const rt=t.closest&&t.closest('[data-ret]');
    if(rt){const id=rt.closest('.hizli').dataset.hizli;state[id]=Object.assign({},state[id]);const nt=document.getElementById('note-'+id),ek=nt?nt.value.trim():'';
      state[id].note='Hayır: '+rt.dataset.ret.toLocaleLowerCase('tr')+(ek&&!/^hayır/i.test(ek)?'. '+ek:'');state[id].ret=rt.dataset.ret;complete(id);return}
    const sq=t.closest&&t.closest('[data-soru-kaydet]');
    if(sq){const id=sq.dataset.soruKaydet,ta=document.querySelector(`[data-soru-gir="${window.CSS.escape(id)}"]`),q=ta?ta.value.trim():'';if(!q)return;
      state[id]=Object.assign({},state[id]);state[id].sorular=(state[id].sorular||[]).concat([{q,at:new Date().toISOString()}]);persist(id);render();setStatus('soru bırakıldı; Ajana haber ver deyince cevaplanır','ok');return}
    const dn=t.closest&&t.closest('[data-dinle]');
    if(dn){const ss=window.speechSynthesis;if(ss.speaking){ss.cancel();dn.textContent='Dinle';return}
      const it=maddeBul(dn.dataset.dinle);if(!it)return;const tmp=document.createElement('div');tmp.innerHTML=md((it.title||'')+'\n\n'+(it.body||it.why||''));
      const u=new SpeechSynthesisUtterance(tmp.textContent.replace(/\s+/g,' '));u.lang='tr-TR';u.onend=u.onerror=()=>{dn.textContent='Dinle'};ss.speak(u);dn.textContent='Durdur';return}
    const gn=t.closest&&t.closest('[data-gonder]');
    if(gn){const id=gn.dataset.gonder,it=maddeBul(id),st=state[id]||{};const nt=document.getElementById('note-'+id);
      const sat=['Defter '+D.id+' · '+id+' '+String(it.title).replace(/^[✎⚙ⓘ▤☐]\s*/,''),st.choice&&secimEtiket(it,st.choice)?'seçim: '+secimEtiket(it,st.choice):'',(nt&&nt.value.trim())||st.note?'not: '+((nt&&nt.value.trim())||st.note):'',...dosyaNotlari(id).map(n=>n.ad+': '+n.not),...(st.sorular||[]).map(x=>'soru: '+x.q)].filter(Boolean).join('\n');
      navigator.clipboard.writeText(sat).then(()=>setStatus('kopyalandı; Claude\'un mesaj kutusuna yapıştır','ok'),()=>setStatus('kopyalanamadı; menüden Kararları kopyala','uyari'));return}
    const kart=t.closest&&t.closest('.card[data-id]');if(kart&&!kart.classList.contains('okundu-isaret')){kart.classList.add('okundu-isaret');try{const o=JSON.parse(localStorage.getItem(gorAnahtar+'-o')||'{}');o[kart.dataset.id]=1;localStorage.setItem(gorAnahtar+'-o',JSON.stringify(o))}catch(_){}}
  });
  $('bittiAra').addEventListener('input',()=>render());
  // görülen madde: ekranda 1,5 saniye kalınca yeni rozeti bir sonraki açılışta kalkar
  if(window.IntersectionObserver){const zaman=new Map();const io=new IntersectionObserver(l=>l.forEach(x=>{const id=x.target.dataset.id;if(x.isIntersecting)zaman.set(id,setTimeout(()=>gorduIsaretle(id),1500));else clearTimeout(zaman.get(id))}),{threshold:.4});
    const izle=()=>document.querySelectorAll('#open .card[data-id]:not([data-izlenen])').forEach(k=>{k.dataset.izlenen=1;io.observe(k)});new MutationObserver(izle).observe(document.body,{childList:true,subtree:true});izle()}
  if(D.renk)document.documentElement.style.setProperty('--proje',D.renk);
  // okundu: açıp etkileştiğin ama cevaplamadığın madde soluk
  {let o={};try{o=JSON.parse(localStorage.getItem(gorAnahtar+'-o')||'{}')}catch(_){}
   const isle=()=>document.querySelectorAll('#open .card[data-id]').forEach(k=>{const st=state[k.dataset.id]||{};k.classList.toggle('okundu',!!o[k.dataset.id]&&!st.choice&&!st.note&&!st.done)});new MutationObserver(isle).observe($('open'),{childList:true});isle()}
  // ── menü (tam ekran) ve ayarlar paneli
  function menuAc(ac){document.documentElement.classList.toggle('menu-acik',ac);$('menuBtn').setAttribute('aria-expanded',ac);$('menuBtn').setAttribute('aria-label',ac?'Menüyü kapat':'Menü');
    if(ac){ayarAc(false);const a=document.querySelector('#menuOrtu nav [data-git]');a&&a.focus({preventScroll:true})}}
  let carkAci=0;
  function ayarAc(ac){const p=$('ayarPanel');if(ac===undefined)ac=p.hidden;p.hidden=!ac;
    if(ac&&innerWidth>640){const g=$('ayarBtn').getBoundingClientRect();p.style.right=Math.max(16,Math.round(document.documentElement.clientWidth-g.right-4))+'px'}else p.style.right='';$('ayarBtn').setAttribute('aria-expanded',ac);carkAci+=ac?120:-120;$('ayarBtn').querySelector('svg').style.transform='rotate('+carkAci+'deg)';
    if(ac){ayarPanelGuncelle();const f=p.querySelector('input,button.chip');f&&f.focus({preventScroll:true})}}
  $('menuBtn').addEventListener('click',()=>menuAc(!document.documentElement.classList.contains('menu-acik')));
  $('ayarBtn').addEventListener('click',e=>{e.stopPropagation();if(document.documentElement.classList.contains('menu-acik'))menuAc(false);ayarAc()});
  document.addEventListener('click',e=>{const p=$('ayarPanel');if(!p.hidden&&!p.contains(e.target)&&!e.target.closest('#ayarBtn'))ayarAc(false);if(e.target.closest('[data-ayar-kapat]'))ayarAc(false)});
  $('ayarPanel').addEventListener('change',e=>{const x=e.target;if(!x.dataset||!x.dataset.ayar)return;ayarDegis(x.dataset.ayar,x.dataset.acik?(x.checked?x.dataset.acik:x.dataset.kapali):x.checked)});
  $('fsSec').innerHTML=FS.map(v=>`<button class="chip" type="button" data-fs="${v}" aria-pressed="${v===fs}">${v} px</button>`).join('');
  $('fsSec').addEventListener('click',e=>{const b=e.target.closest('[data-fs]');if(!b)return;fs=+b.dataset.fs;try{localStorage.setItem('kd-fs',fs)}catch(_){};applyFs();[...$('fsSec').children].forEach(c=>c.setAttribute('aria-pressed',+c.dataset.fs===fs))});
  $('menuOrtu').addEventListener('click',e=>{const b=e.target.closest('[data-git]');if(!b){if(e.target.closest('a'))menuAc(false);return}const g=b.dataset.git;menuAc(false);
    const acilYap=v=>{onlyUrgent=v;$('onlyUrgent').setAttribute('aria-pressed',v)};
    if(g==='open'){acilYap(false);setSekme('open');render();scrollTo({top:0,behavior:yumusak()})}
    else if(g==='done'){setSekme('done');render();scrollTo({top:0,behavior:yumusak()})}
    else if(g==='acil'){acilYap(true);setSekme('open');render();scrollTo({top:0,behavior:yumusak()})}
    else if(g==='ekle'){acilYap(false);setSekme('open');render();const a=document.querySelector('.addbox');a&&a.scrollIntoView({block:'center',behavior:yumusak()});setTimeout(()=>$('addTitle').focus({preventScroll:true}),350)}
    else if(g==='ayar')setTimeout(()=>ayarAc(true),60);
    else if(g==='sayfa'){setSekme(b.dataset.sayfaId);render();scrollTo({top:0,behavior:yumusak()})}
    else if(g==='odak'){setSekme('open');odakKur(true)}
    else if(g==='toplu'){setSekme('open');topluKur(true)}
    else if(g==='kilavuz'){const k=$('kilavuz');k.open=true;k.scrollIntoView({block:'start',behavior:yumusak()})}});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(document.documentElement.classList.contains('menu-acik')){menuAc(false);$('menuBtn').focus();e.stopPropagation()}else if(!$('ayarPanel').hidden){ayarAc(false);$('ayarBtn').focus();e.stopPropagation()}},true);

  // ── sürüm 55: senaryo sayfası (D.senaryo yapılandırılmış gelir; sahne belgesi defter/SN-<id>, önerilen sıra defter/_senaryo_sira)
  const snSt=sid=>state['SN-'+sid]||{};
  function snBul(sid){for(const b of (D.senaryo||{}).bolumler||[])for(const x of b.sahneler||[])if(x.id===sid)return x;return null}
  function snMadde(sid){const sh=snBul(sid);return sh?{id:'SN-'+sid,title:sid+' · '+(sh.ad||''),ekler:sh.kareler||[],_sahne:true}:null}
  function snKaynakSira(){return ((D.senaryo||{}).bolumler||[]).map(b=>(b.sahneler||[]).map(x=>x.id))}
  function snSira(){const k=snKaynakSira(),o=(state._senaryo_sira||{}).bolumler,kd=k.flat();
    if(Array.isArray(o)&&o.length===k.length&&o.every(Array.isArray)&&o.flat().length===kd.length&&o.flat().every(x=>kd.includes(x)))return {sira:o,oneri:JSON.stringify(o)!==JSON.stringify(k)};return {sira:k,oneri:false}}
  function snSure(sh){const st=snSt(sh.id);if(st.sure!==undefined&&st.sure!==null&&st.sure!==''&&!isNaN(+st.sure))return +st.sure;if(+sh.sure>0)return +sh.sure;
    const a=sh.alanlar||{},k=Object.keys(a).find(x=>/^s[üu]re$/i.test(x));if(!k)return 0;const m=/(\d+(?:[.,]\d+)?)\s*(dk|dakika)?/i.exec(String(a[k]));if(!m)return 0;const n=parseFloat(m[1].replace(',','.'));return m[2]?n*60:n}
  function snHedef(){const s=D.senaryo||{};if(+s.hedef_sure>0)return +s.hedef_sure;const b=s.bilgi||{},k=Object.keys(b).find(x=>/s[üu]re/i.test(x));if(!k)return 0;
    const t=String(b[k]),n=(t.match(/\d+/g)||[]).map(Number);if(!n.length)return 0;const m=Math.max.apply(null,n);return /dakika|dk/i.test(t)?m*60:m}
  const snKimler=sh=>{const st=snSt(sh.id);return Array.isArray(st.kimler)?st.kimler:(sh.kimler||[])};
  const kopyaIkon='<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/><path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2"/></svg>';
  const snUretimAcik=new Set();let snBekle=false,snKarsiAcik=false;
  function snSahneHtml(sh){const st=snSt(sh.id),id='SN-'+sh.id,sid=esc(sh.id),g=st.gorseller||[],sure=snSure(sh),kim=snKimler(sh),kar=((D.senaryo||{}).karakterler||[]).map(k=>k.ad);
    const rolI=r=>{for(let i=g.length-1;i>=0;i--)if(g[i].rol===r)return i;return -1};
    const slot=(r,ad)=>{const i=rolI(r);return `<div class="sn-kare"><span class="sn-kare-ad">${ad}</span>${i>=0?`<span class="gorsel-sar">${gorselKutu(id,g[i],i)}<button type="button" class="gorsel-sil" data-gorsel-sil="${id}" data-i="${i}" title="Kaldır" aria-label="${ad} kaldır">✕</button></span>`:`<button type="button" class="sn-kare-bos" data-kare-yukle="${sid}" data-rol="${r}" aria-label="${sid} ${ad} yükle">+ Yükle</button>`}</div>`};
    const diger=g.map((x,i)=>[x,i]).filter(([x])=>x.rol!=='bas'&&x.rol!=='son');
    const alanlar=Object.entries(sh.alanlar||{}).filter(([k])=>!/^s[üu]re$/i.test(k)).map(([k,v])=>/prompt/i.test(k)?`<div class="komut-kutu prompt-kutu"><div class="komut-bas"><span>${esc(k)}</span><button type="button" class="kopyala-yazi" data-kopyala-kutu title="Kopyala">${kopyaIkon}Kopyala</button></div><pre><code>${esc(v)}</code></pre></div>`:`<div class="sn-alan"><span class="sn-ad">${esc(k)}</span><div>${mdSatir(String(v))}</div></div>`).join('');
    const bag=(sh.bagli||[]).filter(x=>D.items.some(y=>y.id===x));
    const ur=(sh.uretim||[]).concat((st.uretim||[]).filter(u=>!(sh.uretim||[]).some(v=>v.at===u.at)));
    return `<li class="sn-sahne" data-sahne="${sid}" id="sahne-${sid}">
      <div class="sn-bas"><span class="sn-tut" data-sn-tut="${sid}" title="Sürükleyip sırala" aria-hidden="true">≡</span><button type="button" class="sn-tasi" data-sn-tasi="${sid}" data-yon="-1" aria-label="${sid} yukarı">↑</button><button type="button" class="sn-tasi" data-sn-tasi="${sid}" data-yon="1" aria-label="${sid} aşağı">↓</button><b class="sn-baslik">${sid} · ${esc(sh.ad||'')}</b><label class="sn-sure-gir">⏱ <input type="number" min="0" step="1" inputmode="numeric" data-sahne-sure="${sid}" value="${sure||''}" aria-label="${sid} süresi, saniye"> sn</label></div>
      ${kar.length?`<div class="sn-kimler" role="group" aria-label="Sahnede kim var">${kar.map(a=>`<button type="button" class="chip kucuk" data-sahne-kim="${sid}" data-kim="${esc(a)}" aria-pressed="${kim.includes(a)}">${esc(a)}</button>`).join('')}</div>`:''}
      <div class="sn-kareler">${slot('bas','Başlangıç karesi')}${slot('son','Bitiş karesi')}${ (sh.kareler||[]).length?`<div class="sn-kare"><span class="sn-kare-ad">Storyboard</span><span class="gorseller">${ekSerit({id,ekler:sh.kareler})}</span></div>`:''}${diger.length?`<div class="sn-kare"><span class="sn-kare-ad">Senin karelerin</span><span class="gorseller">${diger.map(([x,i])=>`<span class="gorsel-sar">${gorselKutu(id,x,i)}<button type="button" class="gorsel-sil" data-gorsel-sil="${id}" data-i="${i}" title="Kaldır" aria-label="Kaldır">✕</button></span>`).join('')}</span></div>`:''}<div class="sn-kare"><span class="sn-kare-ad">&nbsp;</span><button type="button" class="sn-kare-bos kucuk" data-kare-yukle="${sid}" data-rol="" aria-label="${sid} kare ekle">+ Kare</button></div></div>
      ${alanlar}
      ${bag.length?`<p class="sn-bagli">Bağlı karar: ${bag.map(x=>`<a href="#${esc(x)}" class="madde-ref" data-madde-git="${esc(x)}" title="Maddeye git">${esc(x)}</a>`).join(', ')}</p>`:''}
      <textarea class="sn-not" data-sahne-not="${sid}" rows="2" aria-label="${sid} sahnesine not" placeholder="Bu sahneye notun; ajan yalnız bu sahneyi açar">${esc(st.not||'')}</textarea>
      <details class="sn-uretim" data-sn-ur="${sid}"${snUretimAcik.has(sh.id)?' open':''}><summary>Üretim günlüğü (${ur.length})</summary>${ur.length?`<div class="tablo-sar"><table><thead><tr><th>Araç</th><th>Prompt</th><th>Deneme</th><th>Seçim gerekçesi</th></tr></thead><tbody>${ur.map(u=>`<tr><td>${esc(u.arac||'')}</td><td>${esc(u.prompt||'')}</td><td>${esc(u.deneme||'')}</td><td>${esc(u.secim||'')}</td></tr>`).join('')}</tbody></table></div>`:''}
        <div class="sn-uretim-gir"><input data-ur="arac" placeholder="Araç (ör. Midjourney)" aria-label="Araç"><input data-ur="deneme" type="number" min="1" placeholder="Deneme" aria-label="Deneme sayısı"><textarea data-ur="prompt" rows="2" placeholder="Kullandığın prompt" aria-label="Prompt"></textarea><input data-ur="secim" placeholder="Neden bunu seçtin" aria-label="Seçim gerekçesi"><button type="button" class="btn ghost" data-ur-ekle="${sid}">Kaydı ekle</button></div></details>
    </li>`}
  function snZamanHtml(sira){const tum=sira.flat().map(snBul).filter(Boolean),sr=tum.map(snSure),top=sr.reduce((a,b)=>a+b,0),hedef=snHedef(),yok=sr.filter(x=>!x).length;
    if(!top)return `<p class="small sn-zaman">Sahnelere saniye yazınca burada zaman çizelgesi ve toplam süre çıkar.${hedef?' Hedef '+hedef+' sn.':''}</p>`;
    return `<div class="sn-zaman"><div class="sn-serit">${tum.map((sh,i)=>sr[i]?`<button type="button" class="sn-dilim" data-sn-git="${esc(sh.id)}" style="flex:${sr[i]}" title="${esc(sh.id)} · ${esc(sh.ad||'')} · ${sr[i]} sn">${esc(sh.id)}</button>`:'').join('')}${hedef>top?`<span class="sn-bosluk" style="flex:${hedef-top}" title="Hedefe ${hedef-top} sn var"></span>`:''}</div>
      <div class="sn-zaman-yazi">Toplam <b>${top} sn</b>${hedef?' · hedef '+hedef+' sn':''}${hedef&&top>hedef?` <span class="sn-uyari">${top-hedef} sn fazla</span>`:''}${yok?' · '+yok+' sahnenin süresi yok':''}</div></div>`}
  function snZamanCiz(){const z=document.querySelector('[data-sn] .sn-zaman');if(z)z.outerHTML=snZamanHtml(snSira().sira)}
  function senaryoHtml(){const s=D.senaryo,{sira,oneri}=snSira(),f=s.dosya||{},tum=sira.flat().map(snBul).filter(Boolean);
    const bilgi=Object.entries(s.bilgi||{});const kar=s.karakterler||[];
    const kimde=a=>tum.filter(sh=>snKimler(sh).includes(a)).map(sh=>sh.id);
    const acik={};tum.forEach(sh=>(sh.bagli||[]).forEach(x=>{const it=D.items.find(y=>y.id===x);if(it&&!it.resolved&&!isDone(it))(acik[x]=acik[x]||[]).push(sh.id)}));
    return `<div class="sn-arac"><button type="button" class="btn" data-sn-oku>Okuma modu</button>${ (s.surumler||[]).length>1?`<button type="button" class="btn ghost" data-sn-karsi aria-expanded="${snKarsiAcik}">Sürümleri karşılaştır</button>`:''}<span class="sn-indir">İndir: ${ [f.md?`<a href="${esc(f.md)}" download>md</a>`:'',f.fountain?`<a href="${esc(f.fountain)}" download title="Highland, Fade In, Final Draft açar">Fountain</a>`:'',f.yazdir?`<a href="${esc(f.yazdir)}" target="_blank" rel="noopener" title="Açılan sayfada Ctrl+P ile PDF olarak kaydet">Yazdırılabilir (PDF)</a>`:''].filter(Boolean).join(' · ')}</span></div>
      <div class="sn-karsi" ${snKarsiAcik?'':'hidden'}></div>
      <h3 class="sn-ad-baslik">${esc(s.ad||'Senaryo')} <small>sürüm ${esc(s.surum||'')}${s.tarih?' · '+esc(s.tarih):''}</small></h3>
      ${snZamanHtml(sira)}
      ${oneri?`<div class="sn-oneri">Önerdiğin sahne sırası ajana gidiyor; ajan uygulayınca kalıcı olur. <button type="button" class="hz kucuk" data-sn-sira-geri>Ajanın sırasına dön</button></div>`:''}
      ${bilgi.length?`<div class="tablo-sar"><table class="sn-bilgi"><tbody>${bilgi.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${mdSatir(String(v))}</td></tr>`).join('')}</tbody></table></div>`:''}
      ${s.logline?`<div class="body"><h5>Logline</h5><p>${mdSatir(s.logline)}</p></div>`:''}${s.ana_fikir?`<div class="body"><h5>Ana fikir</h5>${md(s.ana_fikir)}</div>`:''}
      ${ (s.bolumler||[]).map((b,bi)=>`<section class="sn-bolum"><h4>${esc(b.ad||'')}${b.zaman?` <small>${esc(b.zaman)}</small>`:''}</h4><ol class="sn-liste" data-bolum="${bi}">${ (sira[bi]||[]).map(snBul).filter(Boolean).map(snSahneHtml).join('')}</ol></section>`).join('')}
      ${kar.length?`<section class="sn-karakterler"><h4>Karakterler</h4><div class="sn-kartlar">${kar.map(k=>`<div class="sn-karakter"><b>${esc(k.ad||'')}</b>${k.rol?` <small>${esc(k.rol)}</small>`:''}${ [['gorunus','Görünüş'],['motivasyon','Motivasyon'],['ses','Ses'],['not','Not']].filter(([x])=>k[x]).map(([x,a])=>`<p><span class="sn-ad">${a}</span> ${mdSatir(String(k[x]))}</p>`).join('')}<p class="small">Sahneler: ${kimde(k.ad).join(', ')||'henüz yok'}</p></div>`).join('')}</div></section>`:''}
      ${window.Object.keys(acik).length?`<section><h4>Açık sorular</h4><div class="tablo-sar"><table><thead><tr><th>Madde</th><th>Soru</th><th>Sahne</th></tr></thead><tbody>${window.Object.entries(acik).map(([x,l])=>`<tr><td><a href="#${esc(x)}" class="madde-ref" data-madde-git="${esc(x)}">${esc(x)}</a></td><td>${esc(baslik(D.items.find(y=>y.id===x).title))}</td><td>${esc(l.join(', '))}</td></tr>`).join('')}</tbody></table></div></section>`:''}`}
  function senaryoCiz(){const p=document.querySelector('[data-sn]');if(!p||!D.senaryo)return;const ak=document.activeElement;
    if(ak&&p.contains(ak)&&/^(TEXTAREA|INPUT|SELECT)$/.test(ak.tagName)){snBekle=true;return}
    if(snDrag)return;snBekle=false;const k=p.querySelector('.sn-karsi');const kh=k&&!k.hidden?k.innerHTML:'';p.innerHTML=senaryoHtml();if(kh){const k2=p.querySelector('.sn-karsi');k2.innerHTML=kh;k2.hidden=false}}
  document.addEventListener('focusout',e=>{if(!snBekle)return;setTimeout(()=>{const p=document.querySelector('[data-sn]'),ak=document.activeElement;if(p&&!(ak&&p.contains(ak)&&/^(TEXTAREA|INPUT|SELECT)$/.test(ak.tagName)))senaryoCiz()},60)});
  document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.snUr){if(d.open)snUretimAcik.add(d.dataset.snUr);else snUretimAcik.delete(d.dataset.snUr)}},true);
  function snGit(sid){setSekme('s-senaryo');requestAnimationFrame(()=>{const el=document.getElementById('sahne-'+sid);if(el){korumaSonu=Date.now()+1500;el.scrollIntoView({block:'start',behavior:yumusak()});el.classList.add('kfocus');setTimeout(()=>el.classList.remove('kfocus'),1600)}})}
  // sıra: sürükle bırak (fare ve dokunma) ya da ↑ ↓; öneri ajana gider (defter/_senaryo_sira)
  let snDrag=null;const snSiraOku=()=>[...document.querySelectorAll('[data-sn] .sn-liste')].map(ol=>[...ol.children].map(li=>li.dataset.sahne));
  function snSiraKaydet(yeni){state._senaryo_sira={bolumler:yeni};persist('_senaryo_sira');senaryoCiz();setStatus(JSON.stringify(yeni)===JSON.stringify(snKaynakSira())?'ajanın sırasına dönüldü':'yeni sıra ajana gidiyor; uygulayınca kalıcı olur','ok')}
  document.addEventListener('pointerdown',e=>{const h=e.target.closest&&e.target.closest('[data-sn-tut]');if(!h)return;const li=h.closest('.sn-sahne');snDrag={li,ilk:snSiraOku()};li.classList.add('dragging');try{h.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  document.addEventListener('pointermove',e=>{if(!snDrag)return;if(e.clientY<90)window.scrollBy(0,-14);else if(e.clientY>innerHeight-90)window.scrollBy(0,14);
    const el=document.elementFromPoint(e.clientX,e.clientY),ust=el&&el.closest('.sn-sahne'),ol=el&&el.closest('.sn-liste');
    if(ust&&ust!==snDrag.li&&!snDrag.li.contains(ust)){const r=ust.getBoundingClientRect();ust.parentNode.insertBefore(snDrag.li,e.clientY<r.top+r.height/2?ust:ust.nextSibling)}else if(ol&&!ust&&!ol.contains(snDrag.li))ol.appendChild(snDrag.li)});
  const snBirak=()=>{if(!snDrag)return;snDrag.li.classList.remove('dragging');const yeni=snSiraOku(),ilk=snDrag.ilk;snDrag=null;if(JSON.stringify(yeni)!==JSON.stringify(ilk))snSiraKaydet(yeni)};
  document.addEventListener('pointerup',snBirak);document.addEventListener('pointercancel',snBirak);
  // kare yükleme: başlangıç, bitiş ya da storyboard karesi (görsel; varlık deposuna gider, iğne ve çizim tam ekranda)
  const snDosya=document.createElement('input');snDosya.type='file';snDosya.accept='image/*';snDosya.hidden=true;document.body.appendChild(snDosya);let snKareHedef=null;
  snDosya.addEventListener('change',async()=>{const h=snKareHedef;snKareHedef=null;const fl=[...snDosya.files];snDosya.value='';if(!h||!fl.length)return;const id='SN-'+h.sid;
    const once=((state[id]||{}).gorseller||[]).length;await gorselEkle(id,h.rol?fl.slice(0,1):fl);const l=((state[id]||{}).gorseller||[]).slice();
    if(h.rol&&l.length>once){const y=Object.assign({},l[l.length-1],{rol:h.rol,ad:h.rol==='bas'?'Başlangıç karesi':'Bitiş karesi'});state[id]=Object.assign({},state[id],{gorseller:l.slice(0,-1).filter(x=>x.rol!==h.rol).concat([y])});await persist(id)}
    senaryoCiz()});
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-kare-yukle],[data-sahne-kim],[data-sn-tasi],[data-sn-sira-geri],[data-ur-ekle],[data-sn-git],[data-sn-oku],[data-sn-karsi]');if(!t)return;e.preventDefault();
    if(t.dataset.kareYukle!==undefined){snKareHedef={sid:t.dataset.kareYukle,rol:t.dataset.rol||''};snDosya.multiple=!snKareHedef.rol;snDosya.click();return}
    if(t.dataset.sahneKim){const sid=t.dataset.sahneKim,a=t.dataset.kim,sh=snBul(sid);if(!sh)return;const l=snKimler(sh).slice(),i=l.indexOf(a);if(i>=0)l.splice(i,1);else l.push(a);state['SN-'+sid]=Object.assign({},state['SN-'+sid],{kimler:l});persist('SN-'+sid);senaryoCiz();return}
    if(t.dataset.snTasi){const sid=t.dataset.snTasi,yon=+t.dataset.yon,o=snSira().sira.map(b=>b.slice());let bi=o.findIndex(b=>b.includes(sid)),i=o[bi].indexOf(sid);o[bi].splice(i,1);
      if(yon<0){if(i>0)o[bi].splice(i-1,0,sid);else if(bi>0)o[bi-1].push(sid);else o[bi].unshift(sid)}else{if(i<o[bi].length)o[bi].splice(i+1,0,sid);else if(bi<o.length-1)o[bi+1].unshift(sid);else o[bi].push(sid)}
      snSiraKaydet(o);requestAnimationFrame(()=>{const b=document.querySelector(`[data-sn-tasi="${window.CSS.escape(sid)}"][data-yon="${yon}"]`);if(b)b.focus({preventScroll:false})});return}
    if(t.dataset.snSiraGeri!==undefined){snSiraKaydet(snKaynakSira());return}
    if(t.dataset.urEkle){const sid=t.dataset.urEkle,k=t.closest('.sn-uretim-gir'),v=x=>(k.querySelector(`[data-ur="${x}"]`).value||'').trim();if(!v('arac')&&!v('prompt')){setStatus('araç ya da prompt yaz','uyari');return}
      const u={arac:v('arac'),prompt:v('prompt'),secim:v('secim'),at:new Date().toISOString()};if(v('deneme'))u.deneme=v('deneme');const id='SN-'+sid;state[id]=Object.assign({},state[id],{uretim:(snSt(sid).uretim||[]).concat([u])});snUretimAcik.add(sid);
      document.activeElement&&document.activeElement.blur();persist(id);senaryoCiz();setStatus('üretim kaydı eklendi; ajan okuyunca senaryoya işlenir','ok');return}
    if(t.dataset.snGit){snGit(t.dataset.snGit);return}
    if(t.dataset.snOku!==undefined){snOkumaAc();return}
    if(t.dataset.snKarsi!==undefined){snKarsiAcik=!snKarsiAcik;const k=document.querySelector('[data-sn] .sn-karsi');t.setAttribute('aria-expanded',snKarsiAcik);if(!k)return;k.hidden=!snKarsiAcik;if(snKarsiAcik)snKarsiKur(k)}});
  // sürüm karşılaştırma: her sürümün sahneleri ekler/<id>/senaryo-<sürüm>.json'da; değişen kelimeler renkli
  function kelimeFark(a,b){const x=String(a||'').split(/(\s+)/).filter(Boolean),y=String(b||'').split(/(\s+)/).filter(Boolean),n=x.length,m=y.length;
    if(n*m>300000)return '<del>'+esc(a)+'</del> <ins>'+esc(b)+'</ins>';
    const L=Array.from({length:n+1},()=>new Uint16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:window.Math.max(L[i+1][j],L[i][j+1]);
    let i=0,j=0,o='';while(i<n&&j<m){if(x[i]===y[j]){o+=esc(x[i]);i++;j++}else if(L[i+1][j]>=L[i][j+1])o+='<del>'+esc(x[i++])+'</del>';else o+='<ins>'+esc(y[j++])+'</ins>'}
    while(i<n)o+='<del>'+esc(x[i++])+'</del>';while(j<m)o+='<ins>'+esc(y[j++])+'</ins>';return o.replace(/<\/del><del>/g,'').replace(/<\/ins><ins>/g,'')}
  const snSurumUrl=v=>String(((D.senaryo||{}).dosya||{}).json||'').replace(/senaryo-[^/]*\.json$/,'')+'senaryo-'+String(v).replace(/[^\w.-]/g,'')+'.json';
  const snSurumOnbellek=new Map();
  async function snSurumAl(v){if(!snSurumOnbellek.has(v))snSurumOnbellek.set(v,fetch(snSurumUrl(v),{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null));return snSurumOnbellek.get(v)}
  function snKarsiKur(k){const l=((D.senaryo||{}).surumler||[]).filter((v,i,a)=>a.indexOf(v)===i);if(l.length<2){k.innerHTML='<p class="small">Karşılaştırmak için en az iki sürüm gerekir.</p>';return}
    const sec=(ad,v)=>`<select data-sn-karsi-sec="${ad}" aria-label="${ad==='a'?'Eski':'Yeni'} sürüm">${l.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
    k.innerHTML=`<div class="sn-karsi-ust">${sec('a',l[l.length-2])} → ${sec('b',l[l.length-1])}<span class="small">Silinen <del>böyle</del>, eklenen <ins>böyle</ins>.</span></div><div class="sn-karsi-sonuc"><p class="small">Yükleniyor…</p></div>`;snKarsiCiz(k)}
  async function snKarsiCiz(k){const a=k.querySelector('[data-sn-karsi-sec="a"]').value,b=k.querySelector('[data-sn-karsi-sec="b"]').value,o=k.querySelector('.sn-karsi-sonuc');
    const [A,B]=await Promise.all([snSurumAl(a),snSurumAl(b)]);if(!A||!B){o.innerHTML=`<p class="small">${ !A?esc(a):esc(b)} sürümünün karşılaştırma dosyası yok (sürüm 55'ten önce üretilmiş).</p>`;return}
    const duz=V=>{const m=new Map();(V.bolumler||[]).forEach(bl=>(bl.sahneler||[]).forEach(sh=>{const f={Ad:sh.ad||''};if(sh.sure)f['Süre']=sh.sure+' sn';if((sh.kimler||[]).length)f.Kimler=sh.kimler.join(', ');window.Object.assign(f,sh.alanlar||{});m.set(sh.id,f)}));return m};
    const ma=duz(A),mb=duz(B),ids=[...new Set([...ma.keys(),...mb.keys()])];const ayni=[];
    const h=ids.map(id=>{const x=ma.get(id),y=mb.get(id);if(!x)return `<div class="sn-k-sahne"><b>${esc(id)}</b> <ins>yeni sahne: ${esc(y.Ad)}</ins></div>`;if(!y)return `<div class="sn-k-sahne"><b>${esc(id)}</b> <del>çıkarıldı: ${esc(x.Ad)}</del></div>`;
      const al=[...new Set([...window.Object.keys(x),...window.Object.keys(y)])].filter(k2=>String(x[k2]||'')!==String(y[k2]||''));if(!al.length){ayni.push(id);return ''}
      return `<div class="sn-k-sahne"><b>${esc(id)} · ${esc(y.Ad)}</b>${al.map(k2=>`<div class="sn-alan"><span class="sn-ad">${esc(k2)}</span><div>${kelimeFark(x[k2],y[k2])}</div></div>`).join('')}</div>`}).join('');
    o.innerHTML=(h||'<p class="small">Sahnelerde fark yok.</p>')+(ayni.length?`<p class="small">Değişmeyen: ${esc(ayni.join(', '))}</p>`:'')}
  document.addEventListener('change',e=>{const s2=e.target.closest&&e.target.closest('[data-sn-karsi-sec]');if(s2)snKarsiCiz(s2.closest('.sn-karsi'))});
  // okuma modu: tam ekran, büyük yazı, ← → sahne, isteğe bağlı sesli okuma
  let snOkuI=0;
  function snOkumaAc(){let o=document.getElementById('snOkuma');const s=D.senaryo,tum=snSira().sira.flat().map(snBul).filter(Boolean);
    if(!o){o=document.createElement('div');o.id='snOkuma';o.className='sn-okuma';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Okuma modu');o.tabIndex=-1;document.body.appendChild(o)}
    o.innerHTML=`<div class="sn-okuma-ust"><b>${esc(s.ad||'Senaryo')}</b><span class="sn-okuma-dug"><button type="button" class="btn ghost" data-oku-git="-1" aria-label="Önceki sahne">‹</button><button type="button" class="btn ghost" data-oku-git="1" aria-label="Sonraki sahne">›</button>${window.speechSynthesis?'<button type="button" class="btn ghost" data-oku-ses>Sesli oku</button>':''}<button type="button" class="btn" data-oku-kapat>Kapat</button></span></div>
      <div class="sn-okuma-ic">${s.logline?`<p class="sn-okuma-log">${mdSatir(s.logline)}</p>`:''}${tum.map((sh,i)=>`<section class="sn-oku-sahne" data-oku-i="${i}"><h3>${esc(sh.id)} · ${esc(sh.ad||'')}</h3>${window.Object.entries(sh.alanlar||{}).filter(([k])=>!/prompt|üretim|uretim/i.test(k)).map(([k,v])=>/^(görüntü|goruntu|anlatı|anlati|aksiyon)$/i.test(k)?`<p>${mdSatir(String(v))}</p>`:`<p><span class="sn-ad">${esc(k)}</span> ${mdSatir(String(v))}</p>`).join('')}</section>`).join('')}</div>`;
    o.hidden=false;document.documentElement.classList.add('tuval-acik');snOkuI=0;try{o.focus({preventScroll:true})}catch(_){}}
  function snOkumaKapat(){const o=document.getElementById('snOkuma');if(!o||o.hidden)return;if(window.speechSynthesis)window.speechSynthesis.cancel();o.hidden=true;document.documentElement.classList.remove('tuval-acik')}
  function snOkuGit(yon){const l=[...document.querySelectorAll('#snOkuma .sn-oku-sahne')];if(!l.length)return;snOkuI=window.Math.max(0,window.Math.min(l.length-1,snOkuI+yon));l.forEach((x,i)=>x.classList.toggle('aktif',i===snOkuI));l[snOkuI].scrollIntoView({block:'start',behavior:yumusak()})}
  function snSesli(b){const ss=window.speechSynthesis;if(ss.speaking){ss.cancel();b.textContent='Sesli oku';return}const l=[...document.querySelectorAll('#snOkuma .sn-oku-sahne')].slice(snOkuI);
    l.forEach((x,k)=>{const u=new SpeechSynthesisUtterance(x.textContent.replace(/\s+/g,' '));u.lang='tr-TR';u.onstart=()=>{snOkuI+=k?1:0;l.forEach(y=>y.classList.remove('aktif'));x.classList.add('aktif');x.scrollIntoView({block:'start',behavior:yumusak()})};if(k===l.length-1)u.onend=()=>{b.textContent='Sesli oku'};ss.speak(u)});b.textContent='Durdur'}
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#snOkuma [data-oku-git],#snOkuma [data-oku-kapat],#snOkuma [data-oku-ses]');if(!t)return;
    if(t.dataset.okuGit)snOkuGit(+t.dataset.okuGit);else if(t.dataset.okuKapat!==undefined)snOkumaKapat();else snSesli(t)});
  document.addEventListener('keydown',e=>{const o=document.getElementById('snOkuma');if(!o||o.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();snOkumaKapat();return}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();snOkuGit(e.key==='ArrowRight'?1:-1)}},true);
  // ── sürüm 54: hazır not, çıktı kutusu, açıkla, kendin karar ver, ajan rozeti, Bugün, ortak defter
  const HAZIR0=['Tamam, devam','Sonra konuşalım','Görsel at','Daha basit anlat'];
  const hazirListe=()=>{const l=(state._hazir||{}).liste;return Array.isArray(l)&&l.length?l:HAZIR0};
  function hazirHtml(it){return `<div class="hazir" role="group" aria-label="Hazır notlar">${hazirListe().map(x=>`<button type="button" class="hz kucuk" data-hazir="${esc(it.id)}" data-metin="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}
  document.addEventListener('click',e=>{const h=e.target.closest&&e.target.closest('[data-hazir]');if(!h)return;e.preventDefault();const id=h.dataset.hazir,x=h.dataset.metin;
    const ta=document.getElementById('note-'+id);const eski=(ta?ta.value:((state[id]||{}).note||'')).trim();if(eski.split(/;\s*/).includes(x)){setStatus('bu not zaten var','');return}
    const v=eski?eski+'; '+x:x;if(ta){ta.value=v;ta.dispatchEvent(new Event('input',{bubbles:true}))}else{state[id]=Object.assign({},state[id],{note:v});sched(id)}setStatus('not eklendi: '+x,'ok')});
  function ciktiKutulari(){document.querySelectorAll('#open .card[data-id]').forEach(k=>{const id=k.dataset.id,c=(state[id]||{}).ciktilar||{};
    k.querySelectorAll('.komut-kutu').forEach((kk,n)=>{const s=kk.nextElementSibling;if(s&&s.classList.contains('cikti'))return;const v=(c[n]||{}).m||'';
      kk.insertAdjacentHTML('afterend',`<details class="cikti"${v?' open':''}><summary>Çıktıyı yapıştır</summary><textarea data-cikti="${esc(id)}" data-n="${n}" rows="3" spellcheck="false" aria-label="Komutun çıktısı" placeholder="Komutun ekrana yazdığını buraya yapıştır; ajan doğrudan okur, ekran görüntüsü gerekmez">${esc(v)}</textarea></details>`)})})}
  // f) Bunu açıkla: Claude sayfada cevaplar (görüntüleyenin hesabından); ajan oturumu uyanmaz
  let ornek=null,kisi=null,benimId=null,benSahip=true,sonSecim=null;const aciklama=new Map();
  document.addEventListener('selectionchange',()=>{const sl=document.getSelection&&document.getSelection();const x=sl&&String(sl).trim();if(!x)return;const n=sl.anchorNode&&(sl.anchorNode.nodeType===1?sl.anchorNode:sl.anchorNode.parentElement);const k=n&&n.closest&&n.closest('.card[data-id]');if(k)sonSecim={id:k.dataset.id,metin:x.slice(0,300)}});
  function aciklaHtml(it){const a=aciklama.get(it.id)||{};return `<div class="acikla-kutu"><div class="acikla-gir"><input type="text" data-acikla-soru="${esc(it.id)}" value="${esc(a.q||'')}" placeholder="Neyi anlamadın? Boş bırakırsan maddeyi sade anlatır" aria-label="Claude'a sorun"><button type="button" class="btn" data-acikla-sor="${esc(it.id)}">${a.yuk?'Durdur':'Sor'}</button><button type="button" class="hz kucuk" data-acikla-kapat="${esc(it.id)}" aria-label="Açıklamayı kapat">✕</button></div><div class="acikla-cevap" data-acikla-cevap="${esc(it.id)}" aria-live="polite">${a.a?md(a.a):(a.yuk?'<i>Düşünüyor…</i>':'')}</div>${a.hata?`<p class="small">${esc(a.hata)}</p>`:''}${a.a&&!a.yuk?`<div class="acikla-alt"><button type="button" class="hz kucuk" data-acikla-ajan="${esc(it.id)}" title="Soruyu maddenin altına bırakır; ajan bir sonraki turda cevaplar">Yetmedi, ajana sor</button><small>Claude maddeyi okuyup cevapladı; ajan uyanmadı.</small></div>`:''}</div>`}
  function aciklaIstem(it,q){const kes=(x,n)=>String(x||'').slice(0,n);
    return ['Bir karar defterinde okuyanın anlamadığı yeri açıklıyorsun. Kurallar: Türkçe; en fazla altı kısa cümle ya da kısa bir liste; sade, teknik terimi açarak; uzun tire kullanma; maddede ve genel bilgide olmayanı uydurma, emin değilsen "maddede yazmıyor, ajana sor" de. Karar verme; şıkları karşılaştırabilirsin.',
      'Defter: '+kes(D.title,200),'Madde '+it.id+': '+kes(it.title,300),it.why?'Neden soruluyor:\n'+kes(it.why,3000):'',it.body?'Metin:\n'+kes(it.body,9000):'',
      (it.options||[]).length?'Şıklar:\n'+it.options.map(o=>'- '+o.t+(o.d?': '+o.d:'')).join('\n'):'',(it.steps||[]).length?'Adımlar:\n'+it.steps.map(x=>'- '+(typeof x==='string'?x:[x.go,x.do,x.see].filter(Boolean).join(' / '))).join('\n'):'',
      it.rec?'Ajanın önerisi: '+kes(it.rec,1000):'','Soru: '+(q||'Bu maddeyi sade bir dille anlat: ne soruluyor, şıklar ne demek, seçimim neyi değiştirir?')].filter(Boolean).join('\n\n')}
  const aciklaHata={not_granted:'Claude izni verilmedi; izin verirsen yeniden dene.',rate_limited:'Çok sık soruldu; biraz bekleyip yeniden dene.',prompt_too_large:'Madde çok uzun; daha dar bir soru sor.',cancelled:'Durduruldu.'};
  async function aciklaSor(id){const it=maddeBul(id);if(!it||!ornek)return;const a=aciklama.get(id)||{};
    if(a.yuk){a.ctl&&a.ctl.abort();return}
    const inp=document.querySelector(`[data-acikla-soru="${window.CSS.escape(id)}"]`);a.q=inp?inp.value.trim():(a.q||'');a.a='';a.hata='';a.yuk=true;a.ctl=new AbortController();aciklama.set(id,a);renderSafe();
    try{const r=await ornek(aciklaIstem(it,a.q),{modelTier:'quick',signal:a.ctl.signal,onText:({text})=>{a.a=text;const el=document.querySelector(`[data-acikla-cevap="${window.CSS.escape(id)}"]`);if(el)el.innerHTML=md(text)}});a.a=r.text;if(r.truncated)a.hata='Cevap kısaldı; daha dar sor.'}
    catch(e){a.a=(e&&e.text)||'';a.hata=aciklaHata[e&&e.code]||'Şu an açıklanamadı; ajana sorabilirsin.';if(e&&e.code==='not_granted'){ornek=null}}
    a.yuk=false;a.ctl=null;render()}
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-acikla],[data-acikla-sor],[data-acikla-kapat],[data-acikla-ajan]');if(!t)return;e.preventDefault();e.stopPropagation();
    if(t.dataset.acikla){const id=t.dataset.acikla;const dt=t.closest('details');if(dt)dt.open=false;const q=sonSecim&&sonSecim.id===id?'"'+sonSecim.metin+'" ne demek?':'';
      if(!aciklama.has(id))aciklama.set(id,{q});render();setTimeout(()=>{const i=document.querySelector(`[data-acikla-soru="${window.CSS.escape(id)}"]`);if(i){i.focus();i.select()}},30);return}
    if(t.dataset.aciklaSor){aciklaSor(t.dataset.aciklaSor);return}
    if(t.dataset.aciklaKapat){const a=aciklama.get(t.dataset.aciklaKapat);if(a&&a.ctl)a.ctl.abort();aciklama.delete(t.dataset.aciklaKapat);render();return}
    if(t.dataset.aciklaAjan){const id=t.dataset.aciklaAjan,a=aciklama.get(id)||{};const q=a.q||'Bu maddeyi daha sade anlatır mısın?';state[id]=Object.assign({},state[id]);state[id].sorular=(state[id].sorular||[]).concat([{q,at:new Date().toISOString()}]);persist(id);aciklama.delete(id);render();setStatus('soru ajana bırakıldı; Ajana haber ver deyince cevaplanır','ok')}},true);
  // g) Ajan kendisi karar versin: işaretlenen türü ajan sormaz (oku KENDIN satırında görür)
  const KENDIN=['Renk tonu ve küçük görsel ayar','Kullanıcının görmediği iç metin','Teknik ayrıntı ve araç seçimi','Dosya, klasör ve değişken adları','Sıralama ve küçük düzen'];
  function ayarEkCiz(){const l=((state._kendin||{}).turler)||[],ak=document.activeElement;   // yazılan alana dokunma: veritabanı güncellemesi yazıyı silmesin
    if(!$('kendinSec').contains(ak))$('kendinSec').innerHTML=KENDIN.map(x=>`<label class="anahtar"><input type="checkbox" data-kendin value="${esc(x)}" ${l.includes(x)?'checked':''}><span>${esc(x)}</span></label>`).join('');
    if(ak!==$('kendinGir'))$('kendinGir').value=l.filter(x=>!KENDIN.includes(x)).join(', ');const h=(state._hazir||{}).liste;if(ak!==$('hazirGir'))$('hazirGir').value=Array.isArray(h)&&h.length?h.join(', '):'';$('hazirGir').placeholder=HAZIR0.join(', ')}
  $('ayarPanel').addEventListener('change',e=>{const x=e.target;
    if(x.dataset&&x.dataset.kendin!==undefined||x.id==='kendinGir'){const l=[...document.querySelectorAll('[data-kendin]:checked')].map(y=>y.value).concat($('kendinGir').value.split(',').map(y=>y.trim()).filter(Boolean));
      state._kendin={turler:[...new Set(l)]};persist('_kendin');setStatus(l.length?'ajan '+l.length+' türde kendisi karar verecek':'liste boş; ajan her türü sorar','ok');return}
    if(x.id==='hazirGir'){const l=x.value.split(',').map(y=>y.trim()).filter(Boolean).slice(0,8);state._hazir={liste:l};persist('_hazir');render();setStatus(l.length?'hazır notlar kaydedildi':'varsayılan hazır notlar','ok')}});
  // h) ajan durum rozeti: ajan her okumada defter/_ajan yazar (oku basar)
  const onceYazi=t=>{const d=(Date.now()-new Date(t))/6e4;if(!(d>=0))return '';if(d<1)return 'az önce';if(d<60)return window.Math.round(d)+' dk önce';if(d<1440)return window.Math.round(d/60)+' sa önce';return window.Math.round(d/1440)+' gün önce'};
  function rozetCiz(){const r=$('ajanRozet');const a=state._ajan;if(!r)return;if(!a||!a.son){r.hidden=true;return}
    const n=D.items.filter(it=>{const s=state[it.id]||{};return !it.resolved&&(s.done||String(s.note||'').trim())&&String(s.updatedAt||s.doneAt||'')>String(a.son)}).length;
    r.hidden=false;r.textContent='Ajan: '+String(a.durum||'okudu').slice(0,60)+' · '+onceYazi(a.son)+(n?' · sırada senin '+n+' cevabın':'');r.title='Ajanın son okuması: '+new Date(a.son).toLocaleString('tr-TR')}
  setInterval(()=>{if(!document.hidden)rozetCiz()},60000);
  // i) Bugün kartı: senden beklenen en çok üç iş ve tahmini süre
  function tahminDk(it){if(+it.sure>0)return +it.sure;const k=x=>String(x||'').split(/\s+/).filter(Boolean).length;
    if(isText(it))return window.Math.max(1,window.Math.round(k(it.body)/180));if(it.type==='task')return window.Math.max(3,(it.steps||[]).length*3);
    return window.Math.max(1,window.Math.round((k(it.why)+k(it.rec)+(it.options||[]).reduce((a,o)=>a+k(o.t)+k(o.d),0))/180)+1)}
  function bugunHtml(open){if(!open.length)return '<b>Hepsi cevaplandı.</b> Bitti sekmesine bak; ajan bir sonraki turda buradan okur.';
    const gun=it=>it.due?(new Date(it.due)-Date.now())/864e5:99;
    const l=open.filter(it=>!(state[it.id]||{}).later).slice().sort((a,b)=>a.priority-b.priority||gun(a)-gun(b)||a._i-b._i).slice(0,3);if(!l.length)return '<b>Kalanlar sonraya atıldı.</b>';
    const top=l.reduce((a,it)=>a+tahminDk(it),0);
    return `<div class="bugun"><b>Bugün senden</b> <span class="bugun-sure">yaklaşık ${top} dk</span><ol>${l.map(it=>`<li><a href="#${esc(it.id)}">${esc(it.id)} · ${esc(baslik(it.title))}</a> <small>~${tahminDk(it)} dk</small></li>`).join('')}</ol>${open.length>l.length?`<small>Kalan ${open.length-l.length} madde bekleyebilir.</small>`:''}</div>`}
  // j) ortak defter: kartta kim ne dedi (ad her görüntülemede çözülür, saklanmaz)
  function ortakHtml(it,s){const y=Object.entries(s.yazanlar||{});if(!y.length||(y.length===1&&y[0][0]===benimId))return '';
    return `<div class="ortak">${y.sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at))).map(([k,v])=>`<div class="ortak-satir"><span class="kisi" data-kisi="${esc(k)}">${k===benimId?'Sen':'…'}</span> ${v.label?'<b>'+esc(v.label)+'</b> ':''}${v.note?esc(v.note):''}${ !v.label&&!v.note?(v.done?'<i>tamamladı</i>':'<i>baktı</i>'):''}</div>`).join('')}</div>`}
  async function kisiAdlari(){if(!kisi)return;const els=[...document.querySelectorAll('[data-kisi]')].filter(x=>x.dataset.kisi!==benimId);if(!els.length)return;
    let ps={};try{ps=await kisi.profiles([...new Set(els.map(x=>x.dataset.kisi))])}catch(e){return}
    els.forEach(x=>{const p=ps[x.dataset.kisi]||{};x.textContent=p.name||'Biri';if(p.color)x.style.color=p.color})}
  document.addEventListener('mousedown',()=>document.body.classList.remove('klavye'));
  (async()=>{if(!(window.claude&&window.claude.use))return;try{ornek=await window.claude.use('sample')}catch(e){ornek=null}try{kisi=await window.claude.use('user')}catch(e){kisi=null}
    if(kisi){try{benimId=await kisi.id();benSahip=!!(await kisi.isOwner())}catch(e){benimId=null}}if(ornek||benimId)renderSafe()})();
  if(D._veriYok)setTimeout(()=>setStatus('maddeler yüklenemedi (veri.json); sayfayı yenile','uyari'),50);
  Object.assign(state,loadLocal()); ['filters','onlyUrgent','acceptAll','fsBtn'].forEach(i=>$(i).classList.add('gizlenir')); ayarYukle(); ornekTohumla(); setSekme(sekme); if(odakKip)$('odakBtn').setAttribute('aria-pressed','true'); render(); ustOlc(); setTimeout(hashGit,30);
  window.addEventListener('resize',ustOlc);if(window.ResizeObserver){new ResizeObserver(ustOlc).observe(document.querySelector('.top'))}
  setTimeout(ustOlc,600);
  (async()=>{
    const ns=await (window.claude&&window.claude.use?window.claude.use('db'):Promise.resolve(null));
    if(!ns){setStatus('tarayıcı hafızası','');$('storeInfo').textContent='Bu görünümde cevaplar tarayıcıda saklanır; kopyalayıp ajana yapıştır.';return}
    db=ns;renderSafe();$('storeInfo').textContent='Cevaplar sayfanın veritabanında; ajan doğrudan okur.';
    try{varliklar=await window.claude.use('assets')}catch(e){varliklar=null}
    try{indirici=await window.claude.use('downloads')}catch(e){indirici=null}
    try{yorum=await window.claude.use('comments')}catch(e){yorum=null}
    haberDurumu();setInterval(()=>{if(!document.hidden)haberDurumu()},30000);
    db.collection('cevap').onSnapshot(snap=>{let deg=false;snap.docs.forEach(d=>{const c=d.data()||{};if(c.kaynak!=='merkez'||c.acik)return;const cur=state[d.id]||{};if(cur.done)return;
      state[d.id]=Object.assign({},cur,{done:true,doneAt:c.doneAt||new Date().toISOString(),kaynak:'merkez',later:false},c.choice!==undefined?{choice:c.choice}:{},c.note?{note:c.note}:{},c.ret?{ret:c.ret}:{});persist(d.id);deg=true});if(deg)renderSafe()},()=>{});
    setTimeout(bekleyenGonder,1500);
    try{mcp=await window.claude.use('mcp')}catch(e){mcp=null}
    try{izinler=await window.claude.use('permissions')}catch(e){izinler=null}
    if(mcp){let st='prompt';try{st=izinler?await izinler.state('mcp:'+DRIVE).catch(()=>'unavailable'):'prompt'}catch(_){}
      if(st==='granted')setTimeout(()=>esitle(false),1200)}
    db.collection('defter').onSnapshot(snap=>{
      const before=sig();
      snap.docs.forEach(d=>{if(timers.has(d.id))return;const cur=state[d.id]||{};const inc=d.data()||{};if(!cur.updatedAt||!inc.updatedAt||inc.updatedAt>cur.updatedAt)state[d.id]=Object.assign({},cur,inc)});
      saveLocal();ayarYukle();ornekTohumla();rozetCiz();if(D.senaryo)senaryoCiz();
      if(sig()!==before) renderSafe(); else snap.docs.forEach(d=>{const el=document.querySelector(`[data-saved="${d.id}"]`);if(el&&!timers.has(d.id))el.textContent='kaydedildi'});
      if(!(snap.metadata&&snap.metadata.fromCache))setStatus('bağlı · otomatik kayıt','ok')},e=>setStatus('bağlantı sorunu',''));
  })();
})();
