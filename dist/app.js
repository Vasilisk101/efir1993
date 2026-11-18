'use strict';
const $=id=>document.getElementById(id);
const items=window.EFIR_RECORDS;
const pages=new Map(items.map(r=>[r.code,r]));
const issueCodes=[201,202,203];
const eveningCodes=[411,412,413,414];
const bytCodes=[511,512,513,514,515,516];
const sections={byt:{code:510,title:'Куплю, продам',list:'В выпуске'},media:{code:700,title:'Медиатека',list:'Источники'},evening:{code:410,title:'Свободный вечер',list:'В выпуске'},issue:{code:200,title:'Октябрь 1993',list:'В выпуске'},catalog:{code:100,title:'Архив 1993',list:'Указатель'},tape:{code:900,title:'Моя кассета',list:'Мои материалы'}};
const viewFor=code=>Object.keys(sections).find(key=>sections[key].code===code);
const savedKey='efir1993.personal-tape.v1', rasterKey='efir1993.raster.v1';
function stored(key){try{return localStorage.getItem(key)}catch{return null}}
function writeStorage(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
function readTape(){try{const raw=JSON.parse(stored(savedKey));return Array.isArray(raw)?[...new Set(raw.map(Number).filter(code=>pages.has(code)))]:[]}catch{return []}}
let tape=readTape(),raster=stored(rasterKey)!=='off';
let state, currentList=[],statusTimer,numberTimer,typed='',scale=1,scanRecord=null,scanAnchor=null;
const memory={byt:513,media:0,evening:411,issue:201,catalog:101,tape:0};
let lastQuery='',lastKind='all';
const allowedTypes=['all','press','photo','document','video','artifact'];
const typeNames={press:'Пресса',photo:'Фото',document:'Документ',video:'Кино',artifact:'Предмет'};
const monthWords=['','январь января','февраль февраля','март марта','апрель апреля','май мая','июнь июня','июль июля','август августа','сентябрь сентября','октябрь октября','ноябрь ноября','декабрь декабря'];
const fold=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
function prettyDate(r){
 const date=r.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
 return date?Number(date[1])+' '+monthWords[Number(date[2])].split(' ')[1]+' '+date[3]:r.date;
}
const keywords={411:'телевидение сетка программа',412:'денди денди игры приставка',413:'мультик анимация кино сорочонок',414:'пентакубики головоломки математика башня кубы',201:'белый дом москва фото фотография',202:'авто машина гараж запчасти цена москвич за рулем',203:'тула тульская сцена театр газетная статья толстовская застава гончаpов',204:'хроника кино фильм октябрь октябрьский осень телевидение',101:'тысяча 1000 банкнота деньги рубли',110:'апрельское голосование бюллетень',121:'указ сентябрь',122:'кс сентябрь',301:'конституция декабрь',302:'москва школа 81 декабрь',303:'голосование результаты декабрь',310:'листовка дума выборы'};
const searchIndex=new Map(items.map(r=>[r.code,fold([r.code,r.title,r.shortTitle,prettyDate(r),r.date,r.summary,r.detail,r.typeLabel,typeNames[r.type],r.source,r.credit,r.place,r.supplement?.links?.map(a=>a.label+' '+a.note).join(' '),keywords[r.code],r.edition?.facts?.map(f=>f.label+' '+f.value).join(' '),r.ocr?.text,r.quote].filter(Boolean).join(' '))]));
function matching(s){
 if(s.view==='byt')return bytCodes.slice();
 if(s.view==='media')return items.filter(r=>recordAttachments(r).some(a=>archiveKinds[a.kind]&&(s.medium==='all'||a.kind===s.medium||(s.medium==='scan'&&a.kind==='document')))).map(r=>r.code);
 if(s.view==='evening')return eveningCodes.slice();
 if(s.view==='issue')return issueCodes.slice();
 if(s.view==='tape')return tape.slice();
 const parts=fold(s.q).split(' ').filter(Boolean);
 return monthSections.flatMap(group=>group[1]).filter(code=>{const r=pages.get(code);return (s.kind==='all'||r.type===s.kind)&&parts.every(p=>searchIndex.get(code).includes(p))});
}
function baseState(view){return{view,medium:'all',sel:memory[view]||0,read:0,q:view==='catalog'?lastQuery:'',kind:view==='catalog'?lastKind:'all'}}
function parseRoute(){
 const [key,params='']=location.hash.slice(1).split('?');
 const p=new URLSearchParams(params),code=Number(key),record=pages.get(code);
 let view=viewFor(code)||(record?(viewFor(Number(p.get('from')))||(bytCodes.includes(code)?'byt':eveningCodes.includes(code)?'evening':issueCodes.includes(code)?'issue':'catalog')):'byt');
 const s=baseState(view);s.read=record?code:0;s.sel=Number(p.get('sel'))||s.read||s.sel;
 if(view==='media'&&['photo','video','scan'].includes(p.get('media')))s.medium=p.get('media');
 if(view==='catalog'){s.q=p.get('q')||'';s.kind=allowedTypes.includes(p.get('type'))?p.get('type'):'all'}
 return s;
}
function encode(s){
 const p=new URLSearchParams();
 if(s.read)p.set('from',sections[s.view].code);
 if(s.view==='media'&&s.medium!=='all')p.set('media',s.medium);
 if(s.sel)p.set('sel',s.sel);
 if(s.view==='catalog'&&s.q)p.set('q',s.q);
 if(s.view==='catalog'&&s.kind!=='all')p.set('type',s.kind);
 return '#'+(s.read||sections[s.view].code)+(p.size?'?'+p:'');
}
function replace(){history.replaceState(history.state,'',encode(state))}
function remember(){memory[state.view]=state.sel;if(state.view==='catalog'){lastQuery=state.q;lastKind=state.kind}}
function setRoute(next,method='push'){
 clearTimeout(statusTimer);text('status','');
 remember();const old=encode(state);state=next;
 if(method==='push'&&old!==encode(state)){history.pushState({efir:true,previous:old},'',encode(state))}
 else replace();
 render();clearNumber();
}
function section(view,search=false){
 if(state.view===view&&!state.read){if(search)$('query').focus();return}
 const next=baseState(view);setRoute(next);window.scrollTo(0,0);
 if(search)$('query').focus();
}
function message(text){
 clearTimeout(statusTimer);$('status').textContent=text;
 statusTimer=setTimeout(()=>{$('status').textContent=''},5000);
}
function showRaster(){document.body.classList.toggle('no-raster',!raster);$('raster-btn').setAttribute('aria-pressed',String(raster));$('raster-btn').title=raster?'Отключить растр':'Включить растр'}
function savedButtons(code){
 const saved=tape.includes(code);
 for(const id of ['reader-save']){
  $(id).textContent=saved?'✓ На кассете':'+ На кассету';
  $(id).setAttribute('aria-pressed',String(saved));
  $(id).title=saved?'Убрать из моей кассеты':'Добавить в мою кассету';
 }
}
function saveCurrent(){
 const code=state.read||state.sel;if(!pages.has(code))return;
 const was=tape.includes(code);tape=was?tape.filter(n=>n!==code):[...tape,code];
 const ok=writeStorage(savedKey,JSON.stringify(tape));
 if(state.view==='tape'){render();replace()}else savedButtons(code);
 message((was?'Убрано с кассеты':'Добавлено на кассету')+(ok?'':' · в этой вкладке'));
}
function text(id,s){$(id).textContent=s||''}
function elem(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n}
function readCode(code,method='push'){
 if(!pages.has(code))return;
 const next={...state,read:code};
 setRoute(next,method);window.scrollTo(0,0);$('reader-title').focus({preventScroll:true});
}
function external(url,label){
 const a=elem('a','',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function siblings(){const list=matching(state);return list.includes(state.read)?list:[state.read]}
function reader(){
 const r=pages.get(state.read);if(!r)return;
 text('reader-kind',r.typeLabel);text('reader-title',r.title);text('reader-date',prettyDate(r));
 text('reader-summary',r.summary);text('reader-detail',r.detail);
 const figure=$('reader-media');figure.hidden=!r.imageData;figure.replaceChildren();
 if(r.imageData){const b=elem('button','open-image');b.type='button';b.title='Увеличить изображение';b.setAttribute('aria-label','Увеличить изображение: '+r.title);
  const im=elem('img');im.src=r.imageData;im.alt=r.title;b.append(im);b.addEventListener('click',()=>openScan(false));
  figure.append(b,elem('figcaption','',r.credit));}
 const quotation=r.quote||r.ocr?.text;
 $('reader-quote').hidden=!quotation;text('reader-quote',quotation?'«'+quotation.replace(/\.$/,'')+'»':'');
 text('reader-source',r.source);const links=$('reader-links');links.replaceChildren(external(r.originalUrl,r.code===203?'Библиотечный дайджест (PDF)':r.code===202?'Открыть журнальные полосы':r.type==='video'?'Смотреть у держателя':'Открыть первоисточник'));
 if(r.contextUrl)links.append(external(r.contextUrl,r.contextLabel||'Дополнительный источник'));
 if(r.licenseUrl)links.append(external(r.licenseUrl,'Условия использования'));
 $('reader-scan').hidden=!r.imageData;text('reader-scan',r.ocr?'Показать строку на скане':'Увеличить изображение');
 const list=siblings(),i=list.indexOf(r.code);
 $('reader-prev').disabled=i<=0;$('reader-next').disabled=i<0||i>=list.length-1;
 text('reader-back',state.view==='tape'?'← К моей кассете':state.view==='catalog'?'← К указателю':state.view==='media'?'← В медиатеку':'← К выпуску');
 const pair=pairing(r.code);$('reader-compare').hidden=!pair;if(pair)$('reader-compare').title=pair.title;
 savedButtons(r.code);writeReader(r);
}
function render(){
 $('browse').hidden=!!state.read;$('reader').hidden=!state.read;
 document.body.dataset.view=state.view;document.body.classList.toggle('reading',!!state.read);
 const sec=sections[state.view];
 text('mast-title',sec.title);text('page-code','P'+(state.read||sec.code));
 document.title=(state.read?pages.get(state.read).title:sec.title)+' · Эфир 1993';
 for(const b of document.querySelectorAll('[data-view]')){if(!b.matches('button'))continue;const active=b.dataset.view===state.view;if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
 cleanRecordMedia();
 const front=['issue','evening','byt'].includes(state.view)&&!state.read;
 const media=state.view==='media'&&!state.read;
 $('byt-front').hidden=!front||state.view!=='byt';$('media-shelf').hidden=!media;
 $('evening-front').hidden=!front||state.view!=='evening';$('issue-front').hidden=!front||state.view!=='issue';$('browse').hidden=!!state.read||front||media;
 document.querySelector('.mast').hidden=front||media||!!state.read;
 if(state.read){reader();const r=pages.get(state.read);tuneReader(r);renderArchiveExtra(r)}
 else if(media){currentList=[];renderMediaShelf()}
 else if(front){currentList=state.view==='byt'?[513,514,511,512,516,515]:state.view==='evening'?[411,414,412,413]:matching(state);if(!currentList.includes(state.sel))state.sel=currentList[0];if(state.view==='byt')renderBytFront();else if(state.view==='evening')renderEveningFront();else renderHandIssue()}
 else{updateList();revealRow()}
}
function back(){
 if($('scan').open||$('compare').open){dismissLayer($('scan').open?'scan':'compare');return}
 if(state.read){
  if(history.state?.efir&&history.state.previous){history.back();return}
  setRoute({...state,read:0},'replace');revealRow(true);return;
 }
 if(history.state?.efir&&history.state.previous){history.back();return}
 if(state.view!=='byt')section('byt');
}
function pageTurn(step){const list=siblings(),i=list.indexOf(state.read)+step;if(i>=0&&i<list.length)readCode(list[i],'replace')}
function clearNumber(){clearTimeout(numberTimer);typed='';$('jump-code').value=''}
function jump(number){
 const code=Number(number),view=viewFor(code);clearNumber();
 if(view){section(view);return true}
 if(pages.has(code)){
  const source=bytCodes.includes(code)?'byt':eveningCodes.includes(code)?'evening':issueCodes.includes(code)?'issue':'catalog';
  const method=state.read?'replace':'push';
  if(source!==state.view && (['byt','evening'].includes(source)||['byt','evening'].includes(state.view)) && !matching(state).includes(code)){
   setRoute({...baseState(source),sel:code,read:code},method);window.scrollTo(0,0);$('reader-title').focus({preventScroll:true});
  }else readCode(code,method);
  return true;
 }
 message('Страница '+String(number)+' отсутствует в указателе.');return false;
}
function digits(value){
 typed=value.replace(/\D/g,'').slice(0,3);$('jump-code').value=typed;clearTimeout(numberTimer);
 if(typed.length===3){jump(typed);return}
 numberTimer=setTimeout(clearNumber,2500);
}
function scanSize(){
 if(!scanRecord||!$('scan').open)return;
 const stage=$('scan-stage'),im=$('scan-img');
 if(!im.naturalWidth||!im.naturalHeight)return;
 const fit=Math.min(stage.clientWidth,Math.max(1,stage.clientHeight)*im.naturalWidth/im.naturalHeight);
 $('scan-canvas').style.width=Math.max(1,Math.round(fit*scale))+'px';
 text('scan-zoom-level',Math.round(scale*100)+'%');$('scan-zoom-out').disabled=scale<=1;$('scan-zoom-in').disabled=scale>=4;
}
function zoomBy(factor){
 const stage=$('scan-stage'),canvas=$('scan-canvas');
 const before=canvas.getBoundingClientRect(),frame=stage.getBoundingClientRect();
 const cx=Math.max(0,Math.min(1,(frame.left+stage.clientWidth/2-before.left)/before.width));
 const cy=Math.max(0,Math.min(1,(frame.top+stage.clientHeight/2-before.top)/before.height));
 scale=Math.max(1,Math.min(4,scale+factor));scanSize();
 const after=canvas.getBoundingClientRect();stage.scrollLeft+=after.left+cx*after.width-frame.left-stage.clientWidth/2;stage.scrollTop+=after.top+cy*after.height-frame.top-stage.clientHeight/2;
}
function openScan(highlight,track=true){showSourceScan(highlight,track)}
$('scan-close').addEventListener('click',()=>dismissLayer('scan'));
$('scan').addEventListener('close',()=>{scanRecord=null;if(scanAnchor?.isConnected)scanAnchor.focus({preventScroll:true})});
$('scan-zoom-out').addEventListener('click',()=>zoomBy(-.5));$('scan-zoom-in').addEventListener('click',()=>zoomBy(.5));
window.addEventListener('resize',scanSize);
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.view){section(b.dataset.view);return}
 const handlers={
  'open-search':()=>section('catalog',true),'reader-save':saveCurrent,'reader-back':back,
  'reader-prev':()=>pageTurn(-1),'reader-next':()=>pageTurn(1),'reader-scan':()=>openScan(true),
  'empty-action':()=>{if(state.view==='tape'){section('catalog');return}state.q='';state.kind='all';updateList();replace();$('query').focus()},
  'raster-btn':()=>{raster=!raster;writeStorage(rasterKey,raster?'on':'off');showRaster();message(raster?'Растр включён':'Растр выключен')}
 };
 handlers[b.id]?.();
});
function changeFilter(){state.q=$('query').value;state.kind=$('type').value;updateList();remember();replace()}
$('query').addEventListener('input',changeFilter);$('type').addEventListener('change',changeFilter);
$('query').addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'&&currentList.length){e.preventDefault();readCode(state.sel)}else if(e.key==='ArrowDown'&&currentList.length){e.preventDefault();revealRow(true)}});
$('jump-code').addEventListener('input',e=>digits(e.target.value));
$('jump').addEventListener('submit',e=>{e.preventDefault();const value=$('jump-code').value;if(value.length===3)jump(value);else{message('Введите три цифры страницы.');$('jump-code').focus()}});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||$('scan').open||$('compare').open)return;
 const field=e.target.closest('input,select,textarea,[contenteditable=true]');
 if(field){
  if(e.key==='Escape'){if(field.id==='query'&&state.q){field.value='';changeFilter()}else{clearNumber();field.blur()}e.preventDefault()}
  return;
 }
 if(e.key==='Escape'){e.preventDefault();if(typed)clearNumber();else back();return}
 if(/^\d$/.test(e.key)){e.preventDefault();digits(typed+e.key);return}
 if(e.key==='/'){e.preventDefault();section('catalog',true);return}
 if(state.read||!currentList.length||e.target.closest('.station,dialog,details'))return;
 if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
  e.preventDefault();const i=currentList.indexOf(state.sel);
  const next=e.key==='Home'?0:e.key==='End'?currentList.length-1:Math.max(0,Math.min(currentList.length-1,i+(e.key==='ArrowDown'?1:-1)));
  choose(currentList[next],true);
 }else if(e.key==='Enter'&&e.target===document.body){e.preventDefault();readCode(state.sel)}
});
window.addEventListener('popstate',()=>{
 const next=parseRoute(),moved=encode(next)!==encode(state);state=next;clearNumber();
 if(moved){render();if(!state.read)revealRow(true);else $('reader-title').focus({preventScroll:true})}
 syncLayers();const action=afterLayer;afterLayer=null;action?.();
});
window.addEventListener('storage',e=>{if(e.key===savedKey||e.key===null){tape=readTape();render()}if(e.key===rasterKey||e.key===null){raster=stored(rasterKey)!=='off';showRaster()}});
// Each pairing explains what the date and the source establish for these two objects.
const pairTopics=[
 {codes:[310,302],title:'Листовки и день голосования',notes:['Два предвыборных обращения сохранились в каталоге Исторической библиотеки.','С. Поминов снял участок в Кунцеве 12 декабря, в день выборов в парламент и голосования по Конституции.']},
 {codes:[201,204],title:'Снимок и кинохроника',notes:['Семейную фотографию датируют октябрём. Конкретный день съёмки неизвестен.','Съёмка 4–7 октября вошла в фильм 1994 года. В 2011-м библиотека издала подборку длиной 2 минуты 34 секунды.']},
 {codes:[202,101],title:'Что значит цена в таблице?',notes:['Октябрьский номер публикует июльские московские цены. Для таблицы редакция перевела их в доллары из расчёта 1100 рублей за доллар.','На обороте банкноты указан номинал 1000 рублей. Чтобы узнать стоимость конкретной покупки, нужна запись о самой покупке.']},
 {codes:[203,202],title:'Октябрь в двух изданиях',notes:['16 октября вышла статья о тульском театре. Сегодня доступна выдержка в библиотечном дайджесте.','Журнал за октябрь рассказывает о расчётах московских автомобилистов. Цены в его таблице наблюдали в июле.']},
 {codes:[121,122],title:'Два документа 21 сентября',notes:['Указ формулирует решение президента о конституционной реформе. В каталоге описан архивный подлинник.','Конституционный суд оценил действия президента, связанные с указом. В фонде представлена машинописная копия заключения.']},
 {codes:[301,303],title:'От вопроса к результату',notes:['Бюллетень даёт точную формулировку вопроса, предъявленного избирателю 12 декабря.','20 декабря ЦИК оформил итог голосования. В постановлении указаны абсолютные числа и доли голосов.']},
 {codes:[302,301],title:'Фотография участка и бюллетень',notes:['Снимок С. Поминова показывает голосование в одной московской школе 12 декабря.','Бюллетень позволяет прочитать вопрос и инструкцию для голосующего. На фотографии документа читаются и вопрос, и правила заполнения.']},
 {codes:[110,301],title:'Два бюллетеня 1993 года',notes:['В архиве показан первый из четырёх апрельских бюллетеней — вопрос о доверии президенту.','На декабрьском бюллетене напечатан вопрос о принятии Конституции. На обоих сканах можно выделить оригинальную строку.']}
];
let compareReturn=null,afterLayer=null;
function pairing(code){
 const topic=pairTopics.find(p=>p.codes[0]===code)||pairTopics.find(p=>p.codes.includes(code));
 return topic||null;
}
function detailFor(code,topic){
 const r=pages.get(code),i=topic.codes.indexOf(code),card=elem('article','compare-column');
 card.append(elem('div','compare-number',prettyDate(r)),elem('h3','',r.title));
 if(r.imageData){const img=elem('img');img.src=r.imageData;img.alt=r.title;card.append(img)}
 if(!r.imageData)card.append(editionComposition(r,false));
 card.append(elem('p','',topic.notes[i]),external(r.originalUrl,r.edition.sourceAction));
 return card;
}
function openCompare(track=true){
 const topic=pairing(state.read);if(!topic||$('compare').open)return;
 compareReturn=document.activeElement;text('compare-title',topic.title);
 const ordered=[state.read,...topic.codes.filter(c=>c!==state.read)];$('compare-items').replaceChildren(...ordered.map(code=>detailFor(code,topic)));
 const sibling=pages.get(ordered[1]);$('compare-follow').textContent=sibling.edition.short+' →';$('compare-follow').dataset.page=sibling.code;
 $('compare').showModal();$('compare-close').focus();if(track)markLayer('compare');
}
function markLayer(id,highlight=false){
 history.pushState({...history.state,efir:true,layer:id,highlight},'',encode(state));
}
function dismissLayer(id,after=null){
 if(!$(id).open)return;
 if(history.state?.layer===id){afterLayer=after;history.back();return}
 $(id).close();after?.();
}
function syncLayers(){
 const layer=history.state?.layer;
 for(const id of ['scan','compare'])if($(id).open&&layer!==id)$(id).close();
 if(layer==='scan'&&!$('scan').open)openScan(history.state.highlight,false);
 if(layer==='compare'&&state.read&&!$('compare').open)openCompare(false);
}
function prepareComparison(){
 const btn=elem('button','key compare-key','Сопоставить источники');btn.type='button';btn.id='reader-compare';btn.addEventListener('click',()=>openCompare());$('reader-save').after(btn);
 const d=elem('dialog');d.id='compare';d.setAttribute('aria-labelledby','compare-title');
 d.innerHTML='<div class="scan-head"><h2 id="compare-title"></h2><button id="compare-close" type="button" aria-label="Закрыть сравнение">Закрыть ×</button></div><div id="compare-items"></div><div class="compare-foot"><button type="button" class="key primary" id="compare-follow"></button></div>';
 document.body.append(d);
 $('compare-close').addEventListener('click',()=>dismissLayer('compare'));
 $('compare-follow').addEventListener('click',()=>{const code=Number($('compare-follow').dataset.page);dismissLayer('compare',()=>readCode(code,'replace'))});
 d.addEventListener('close',()=>{if(compareReturn?.isConnected&&compareReturn.checkVisibility())compareReturn.focus({preventScroll:true})});
 for(const id of ['scan','compare'])$(id).addEventListener('cancel',e=>{e.preventDefault();dismissLayer(id)});
}


// Source compositions use catalogue facts and quotations. They are typeset here and
// remain distinct from the six digitised originals, which use the image viewer.
const editionCredits = {
  101: 'Банк России. Скан оборотной стороны банкноты — Kostya Wiki, Wikimedia Commons.',
  110: 'Бюллетень референдума 25 апреля 1993 года. Цифровая копия — Wikimedia Commons.',
  201: 'Москва, октябрь 1993 года. Семейный архив Chrislatondresse, Wikimedia Commons.',
  301: 'Фотография бюллетеня — Lesless, 2012 год, Wikimedia Commons.',
  302: 'Москва, 12 декабря 1993 года. Фото С. Поминова, Главархив Москвы.',
  303: 'Постановление ЦИК от 20 декабря 1993 года. Цифровая копия — Wikimedia Commons.'
};

function editionComposition(r, readerMode) {
  if(eveningCodes.includes(r.code))return eveningComposition(r);
  if (r.code === 202) {
    const figure = elem('div','source-composition market table-composition');
    const table = elem('table','market-table');
    const caption = elem('caption','','Цены на детали ВАЗ‑2101');
    const head = table.createTHead().insertRow();
    for (const title of ['Деталь','Доллары США']) {
      const th = elem('th','',title); th.scope = 'col'; head.append(th);
    }
    const body = table.createTBody();
    for (const [part,price] of [['Передний бампер','18,2'],['Переднее крыло','21,8'],['Капот','27,3']]) {
      const tr = body.insertRow();
      const th = elem('th','',part); th.scope = 'row';
      tr.append(th,elem('td','',price));
    }
    table.prepend(caption);
    figure.append(elem('p','source-topline','«За рулём» • № 10, 1993'),table,
      elem('p','source-byline','Москва, июль 1993 года. Курс для таблицы — 1 100 рублей за доллар.'));
    return figure;
  }
  const specs = {
    121: ['fonds', 'Архив Президента Российской Федерации', 'Указ № 1400', 'Фонд 92, опись 1, дело 36, листы 118–124'],
    122: ['fonds document-court', 'Архив Президента Российской Федерации', 'Заключение № З-2', 'Фонд 92, опись 3, дело 241, листы 244–245'],

    203: ['press-quote', '«Тула вечерняя»', '«' + (r.quote || '').replace(/\.$/,'') + '»', 'С. Гончаров, 16 октября 1993 года'],
    204: ['film', 'Москва • 4–7 октября 1993', 'Россия… Осень 93-го', 'Звуковая кинохроника • 2 мин 34 с'],
    310: ['leaflets', 'Государственная публичная историческая библиотека России', '', 'Листовки к выборам в Государственную думу, 1993 год']
  };
  const data = specs[r.code];
  if (!data) return elem('div','source-composition',r.title);
  const [style, imprint, focus, caption] = data;
  const art = elem('div','source-composition ' + style);
  const main = elem(r.code === 203 ? 'blockquote' : 'p','source-focus',focus);
  if (r.code === 310) {
    for (const [party, format] of [['«Женщины России»','9 × 18 см'],['КПРФ','22 × 18 см']]) {
      const line = elem('span','leaflet-line',party);
      line.append(elem('small','leaflet-format',format));
      main.append(line);
    }
  }
  art.append(elem('p','source-topline',imprint),main);

  const bottom = elem('p','source-byline',caption);
  art.append(bottom);
  if (r.code === 203 && readerMode && r.edition?.clip) {
    const details = elem('details','print-excerpt');
    const toggle = elem('summary','','Увидеть строки в сборнике');
    const view = elem('div','clip-view');
    view.tabIndex = 0;
    view.setAttribute('role','region');
    view.setAttribute('aria-label','Строки в библиотечном сборнике, горизонтальная прокрутка');
    const clip = elem('img'); clip.src = r.edition.clip;
    clip.alt = 'Строки выдержки со словами о дружеской поддержке театра, страница 90 сборника';
    view.append(clip);
    details.append(toggle,view);
    art.append(details);
  }
  if (r.code === 204 && readerMode) {
    const play = external(r.originalUrl,r.edition?.sourceAction || 'Открыть карточку кинохроники');
    play.className = 'film-play';
    art.append(play);
  }
  return art;
}

function editionClockButton(id) {
  const button = elem('button','photo-detail','Рассмотреть часы');
  button.type = 'button';
  button.id = id;
  return button;
}
function editionReader(r) {
  const article = $('reader');
  article.dataset.code = String(r.code);
  article.dataset.format = r.ocr && r.imageData ? 'ballot' : r.type;
  if(eveningCodes.includes(r.code))article.dataset.format='evening';
  if(bytCodes.includes(r.code))article.dataset.format='byt';
  if (r.code === 203) article.dataset.format = 'quote';
  if (r.code === 202) article.dataset.format = 'prices';
  $('reader-related').append($('reader-compare'));
  const line = $('reader-detail').querySelector('.line-reference');
  const scan = $('reader-scan');
  scan.classList.remove('line-reference');
  $('object-tool').append(scan);
  $('reader-line').replaceChildren();
  if (line) {
    scan.classList.add('line-reference');
    scan.replaceChildren(...line.childNodes);
    $('reader-line').append(scan);
    line.remove();
  }
  const frame = $('reader-media');
  frame.dataset.kind = r.type;
  if (!r.imageData) {
    frame.hidden = false;
    frame.replaceChildren(editionComposition(r,true));
    const caption = r.code === 202 ? 'По таблице из журнала «За рулём», № 10 за 1993 год, с. 10.' : r.edition?.caption || r.edition?.objectLabel;
    if (caption) frame.append(elem('figcaption','',caption));
  } else {
    const caption = frame.querySelector('figcaption');
    if (caption && r.edition?.caption) caption.textContent = r.edition.caption;
    if (r.code === 201) {
      const photo = frame.querySelector('.open-image');
      const group = elem('div','edition-reader-image');
      group.append(photo,editionClockButton('reader-photo-detail'));
      frame.prepend(group);
    }
  }
  if (r.code === 203) $('reader-quote').hidden = true;
}
document.querySelector('.station-home').addEventListener('click',() => section('byt'));
const editionSwitch = document.querySelector('.page-switch');
document.addEventListener('click', e => {
  if (!editionSwitch.contains(e.target)) editionSwitch.open = false;
});
$('jump').addEventListener('submit',() => {
  if (!$('jump-code').value) editionSwitch.open = false;
});
$('jump-code').addEventListener('input',() => {
  if (!$('jump-code').value) editionSwitch.open = false;
});
editionSwitch.addEventListener('keydown',e => {
  if (e.key === 'Escape' && editionSwitch.open) {
    e.preventDefault();e.stopPropagation();
    editionSwitch.open = false;
    editionSwitch.querySelector('summary').focus();
  }
});
function writeReader(r) {
  const e = r.edition;
  text('reader-summary',e.lead);
  $('reader-detail').replaceChildren(...e.paragraphs.map(p => elem('p','',p)));
  text('reader-kind',r.code === 202 ? 'Журнал «За рулём»' : r.code === 203 ? 'Тула вечерняя' : typeNames[r.type]);
  const figure = $('reader-media');
  if (r.imageData) figure.querySelector('figcaption').textContent = e.caption || r.credit;
  text('reader-source',e.sourceLabel);
  const links = [external(r.originalUrl,e.sourceAction)];
  if (r.contextUrl) links.push(external(r.contextUrl,e.contextLabel || r.contextLabel || 'Подробнее об источнике'));
  for (const extra of e.extraLinks || []) links.push(external(extra.url,extra.label));
  if (r.licenseUrl) links.push(external(r.licenseUrl,'Условия использования'));
  $('reader-links').replaceChildren(...links);
  // The transcription belongs to the scan. The reader can jump directly to its line.
  $('reader-quote').hidden = true;
  if (r.ocr && r.imageData) {
    const line = elem('button','line-reference');
    line.type = 'button';
    line.append(elem('span','',r.ocr.text),elem('small','','Найти эту строку на скане ↗'));
    line.addEventListener('click',() => openScan(true));
    $('reader-detail').append(line);
  }
  const pair = pairing(r.code);
  if (pair) {
    const other = pages.get(pair.codes.find(code => code !== r.code));
    text('reader-compare', 'Сравнить: ' + other.edition.short);
  }
  const codes = siblings(), ix = codes.indexOf(r.code);
  for (const [id, n, arrow] of [['reader-prev',ix-1,'← '],['reader-next',ix+1,' →']]) {
    const dest = pages.get(codes[n]), button = $(id);
    button.hidden = !dest;
    if (dest) text(id,id === 'reader-prev' ? arrow+dest.edition.short : dest.edition.short+arrow);
  }
  editionReader(r);
}

function centerScan(region) {
  const stage=$('scan-stage'), canvas=$('scan-canvas');
  const outer=stage.getBoundingClientRect(), inner=canvas.getBoundingClientRect();
  stage.scrollBy(inner.left-outer.left+(region.x+region.w/2)*inner.width-stage.clientWidth/2,
                 inner.top-outer.top+(region.y+region.h/2)*inner.height-stage.clientHeight/2);
}
function showSourceScan(focus=false,track=true,code=state.read || state.sel) {
  const r=pages.get(code), dlg=$('scan');
  if (!r?.imageData || dlg.open) return;
  const clock = focus==='clock' && r.code===201;
  const region = clock ? {x:.5104,y:.009,w:.0807,h:.141} : focus===true ? r.ocr?.region : null;
  scanRecord=r; scanAnchor=document.activeElement; scale=clock ? 2 : region ? 2.5 : 1;
  text('scan-title',clock?'Часы над Домом Советов':r.title);
  const mark=$('scan-mark');
  mark.hidden=!region;
  if (region) Object.assign(mark.style,{left:100*region.x+'%',top:100*region.y+'%',width:100*region.w+'%',height:100*region.h+'%'});
  text('scan-caption',clock ? 'Циферблат над выгоревшими этажами. На сохранившейся копии стрелки трудно различить.' : region ? r.ocr.text : r.edition.caption || r.credit);
  const im=$('scan-img');
  im.alt=r.edition.caption||r.title;
  let positioned=false;
  function place() {
    if (!im.naturalWidth || !dlg.open || scanRecord!==r || positioned) return;
    positioned=true; scanSize();
    $('scan-stage').scrollTo(0,0);
    if (region) centerScan(region);
  }
  im.onload=place; im.src=r.imageData;
  dlg.showModal(); if (im.complete) place();
  $('scan-close').focus({preventScroll:true});
  if(track) markLayer('scan',focus);
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');
  if (!b) return;
  if (b.id==='reader-photo-detail') showSourceScan('clock');
});

const finishKey='efir1993.screen-finish.v1';
function applyFinish(value){
  const aged=value!=='clean';
  document.body.dataset.finish=aged?'aged':'clean';
  $('finish-btn').setAttribute('aria-pressed',String(aged));
}
applyFinish(stored(finishKey));
$('finish-btn').addEventListener('click',()=>{
  const next=document.body.dataset.finish==='aged'?'clean':'aged';
  applyFinish(next);
  writeStorage(finishKey,next);
});
window.addEventListener('storage',e=>{
  if(e.key===finishKey||e.key===null)applyFinish(stored(finishKey));
});

const handIssueTable = 'assets/webp-bb7673eb5bce.webp';

function renderHandIssue() {
  const front = document.getElementById('issue-front');
  if (!front || front.firstElementChild) return;
  const photoRecord = pages.get(201);
  function story(code, style) {
    const link = elem('a', 'hand-story ' + style);
    link.href = '#' + code;
    link.dataset.issueCode = code;
    return link;
  }
  function folio(code) {
    return elem('span', 'hand-folio', String(code));
  }
  const spread = elem('div', 'hand-spread');
  const lead = elem('div', 'hand-lead');
  const date = elem('h1', 'hand-date');
  date.id = 'hand-issue-title';
  front.setAttribute('aria-labelledby', date.id);
  const month = elem('span', 'hand-month', 'Октябрь');
  const year = elem('span', 'hand-year');
  year.append(elem('span', '', '19'), elem('span', '', '93'));
  date.append(month, year);
  const main = story(201, 'hand-moscow');
  const photo = elem('img','hand-photo');
  photo.src = photoRecord.imageData;
  photo.alt = 'Обгоревшие верхние этажи московского Дома Советов. Над ними видны часы.';
  photo.width = 384; photo.height = 262;
  const photoInfo = elem('div','hand-photo-info');
  photoInfo.append(elem('span','','Москва. Семейный снимок'),folio(201));
  main.append(photo, photoInfo, elem('h2','hand-moscow-title','Дом Советов после пожара'),
    elem('p','hand-photo-note','Над обгоревшими этажами видны часы. Точную дату съёмки семья не указала.'));
  lead.append(date,main);
  const side = elem('div','hand-side');
  const auto = story(202, 'hand-auto');
  const autoMeta = elem('div','hand-auto-meta');
  autoMeta.append(elem('span','','«За рулём»'),elem('span','','№ 10'));
  const autoTitle = elem('h2','hand-auto-title');
  autoTitle.append(elem('span','','Почем'),elem('span','','запчасти?'));
  const table = elem('img','hand-table');
  table.src = handIssueTable;
  table.alt = 'Фрагмент журнальной таблицы с московскими ценами на детали ВАЗ.';
  table.width = 808; table.height = 105;
  const autoCredit = elem('div','hand-auto-credit');
  autoCredit.append(elem('span','','Из таблицы В. Субботина, с. 10'),folio(202));
  auto.append(autoMeta,autoTitle,
    elem('p','hand-auto-note','Переднее крыло для «копейки» — 21,8 доллара. По июльскому курсу «За рулём» пересчитал московские цены.'),
    table,autoCredit);
  const tula = story(203,'hand-tula');
  const tulaMeta = elem('div','hand-tula-meta');
  tulaMeta.append(elem('span','','Тула вечерняя'),elem('time','','16 октября'));
  tula.append(tulaMeta,elem('h2','hand-tula-title','«Таких бы театров, да побольше»'),
    elem('p','hand-tula-note','С. Гончаров просит поддержать тульский театр «У Толстовской заставы».'),folio(203));
  side.append(auto,tula);
  spread.append(lead,side);
  front.replaceChildren(spread);
  for (const link of front.querySelectorAll('[data-issue-code]')) {
    const heading=link.querySelector('h2');heading.id='issue-story-'+link.dataset.issueCode;
    link.setAttribute('aria-labelledby',heading.id);
  }
}


const monthSections = [
  ['Март',[516]], ['Апрель',[110]], ['Июль',[412]], ['Сентябрь',[513,514,121,122,411]], ['Октябрь',[201,204,512,202,203]],
  ['Декабрь',[301,302,303,511]], ['За весь год',[515]], ['Без точного месяца',[101,310,413,414]]
];
const imprints = {411:'Тотьма · 24 сентября',412:'«Видео-Асс Dendy» · № 1',413:'«Союзмультфильм»',414:'«Квант» · № 1/2',101:'Банк России · оборот',110:'25 апреля · вопрос № 1',121:'21 сентября · 20:00',122:'21 сентября · машинопись',201:'Семейный снимок',202:'«За рулём» · № 10',203:'С. Гончаров · 16 октября',204:'4–7 октября · 2 мин 34 с',301:'12 декабря · бланк',302:'С. Поминов · Москва',303:'20 декабря · № 142',310:'ГПИБ · каталог'};
function registerRow(code){
  const r=pages.get(code), li=elem('li'), a=elem('a','register-entry');
  a.dataset.entryCode=code;
  a.href=encode({...state,sel:code,read:code});
  a.append(elem('span','entry-number',String(code)),elem('span','entry-title',r.shortTitle),elem('span','entry-imprint',(r.imprint||imprints[code])));
  li.append(a);return li;
}
function updateList(){
  const catalog=state.view==='catalog';
  const found=matching(state), selected=new Set(found);
  const groups=catalog?monthSections.map(([label,codes])=>[label,codes.filter(c=>selected.has(c))]):[['',found]];
  currentList=groups.flatMap(group=>group[1]);
  if(!currentList.includes(state.sel))state.sel=currentList[0]||0;
  $('filterbar').hidden=!catalog;$('query').value=state.q;$('type').value=state.kind;
  const blocks=groups.filter(group=>group[1].length).map(([label,codes])=>{
    const li=elem('li','register-month'), list=elem('ul','register-items');
    if(label)li.append(elem('h3','month-name',label));
    list.append(...codes.map(registerRow));li.append(list);return li;
  });
  $('record-list').replaceChildren(...blocks);
  const count=currentList.length;
  text('list-count',catalog&&count<items.length?count+' из '+items.length:count+' '+(count===1?'запись':count>=2&&count<=4?'записи':'записей'));
  $('empty-state').hidden=!!count;
  text('empty-text',catalog?'По этому запросу записей нет.':'Кассета пуста. В открытом материале нажмите «На кассету».');
  text('empty-action',catalog?'Очистить поиск':'Открыть архив');
}
function entryLinks(){
  return Array.from((state.view==='byt'?$('byt-front'):state.view==='evening'?$('evening-front'):state.view==='issue'?$('issue-front'):$('record-list')).querySelectorAll('[data-entry-code],[data-issue-code]'));
}
function revealRow(focus=false){
  if(!focus)return;
  const a=entryLinks().find(n=>Number(n.dataset.entryCode||n.dataset.issueCode)===state.sel);
  if(a){a.focus({preventScroll:true});a.scrollIntoView({block:'nearest'})}
}
function choose(code,focus=false){
  if(!currentList.includes(code))return;
  state.sel=code;memory[state.view]=code;replace();revealRow(focus);
}
document.addEventListener('click',event=>{
  const a=event.target.closest('a[data-entry-code],a[data-issue-code]');
  if(!a||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();const code=Number(a.dataset.entryCode||a.dataset.issueCode);
  choose(code);readCode(code);
});
document.addEventListener('focusin',event=>{
  const a=event.target.closest('[data-entry-code],[data-issue-code]');
  if(a && !state?.read){
    const code=Number(a.dataset.entryCode||a.dataset.issueCode);
    if(state && state.sel!==code && currentList.includes(code))choose(code);
  }
});

const printedPrices=[{"alt": "Крыло переднее — 21,8", "src": "assets/webp-117e75866507.webp"}, {"alt": "Капот — 27,3", "src": "assets/webp-c344b095e5da.webp"}, {"alt": "Бампер передний — 18,2", "src": "assets/webp-00a1e05a821d.webp"}];
function clippingsForPrices(){
  const frame=$('reader-media'), previous=frame.querySelector('.market-table');
  const figure=elem('div','price-cuttings');
  const head=elem('div','cutting-heading');
  head.append(elem('span','','ВАЗ‑2101'),elem('span','','Москва, июль 1993'));
  const paper=elem('div','original-lines');
  const label=elem('div','column-key','Деталь');label.append(elem('span','','Доллары США'));
  paper.append(label);
  for(const line of printedPrices){
    const sample=elem('img');sample.alt=line.alt;sample.src=line.src;paper.append(sample);
  }
  const toggle=elem('button','type-switch','Крупный набор');toggle.type='button';
  toggle.setAttribute('aria-pressed','false');
  const setting=elem('div','cutting-tools');setting.append(toggle,external(pages.get(202).originalUrl,'Обе полосы «За рулём»'));
  previous.hidden=true;
  toggle.addEventListener('click',()=>{
    previous.hidden=!previous.hidden;paper.hidden=!previous.hidden;
    toggle.textContent=previous.hidden?'Крупный набор':'Печатные строки';
    toggle.setAttribute('aria-pressed',String(!previous.hidden));
  });
  figure.append(head,paper,previous,setting);
  frame.replaceChildren(figure,elem('figcaption','','«За рулём», № 10, с. 10. Три вырезки из графы «2101». Промежуточные строки опущены.'));
}
function tuneReader(r){
  const e=r.edition;
  if(r.code===202)clippingsForPrices();
  if(r.code===203){
    const quote=$('reader-media').querySelector('.press-quote');
    const ref=quote.querySelector('.print-excerpt');
    if(ref){
      ref.querySelector('summary').textContent='Строки на странице сборника';
    }
    const cap=$('reader-media').querySelector('figcaption');
    if(cap)cap.remove();
  }
  if(r.code===201)text('reader-kind','Москва');
  if(eveningCodes.includes(r.code)){text('reader-kind',r.typeLabel);text('reader-source',[r.source,r.credit].join(' '))}
  const compare=$('reader-compare');
  if(!compare.hidden && e.pairLabel)compare.textContent=e.pairLabel;
  const panel=document.querySelector('.source-notes');
  const disclosure=$('source-disclosure');
  disclosure.open=false;
  text('source-toggle','Выходные данные и ссылки');
  const first=$('reader-links').querySelector('a');
  const slot=$('source-original');slot.replaceChildren();
  // The first source sits with the object; the record's full bibliography stays available.
  if(first && r.code!==202 && r.code!==204)slot.append(first);
  if(first && (r.code===202 || r.code===204))first.remove();
  panel.classList.toggle('standalone-notes',!slot.firstElementChild);
  if(r.code===201||r.code===302){
    const cap=$('reader-media').querySelector('figcaption');
    if(cap && e.caption)cap.textContent=e.caption;
  }
}

function eeWheelArt() {
  const ink = '#222341';
  const shadow = '#171930';
  const night = '#343457';
  const red = '#cf4c38';
  const redDark = '#9f3c36';
  const paper = '#f5e1b5';
  const buff = '#dcba87';
  const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const mark = (d, color, width) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
  const pieces = [];

  // Cut-paper sky, a slightly ragged moon and a low bank of folded fields.
  pieces.push(
    path('M0 0H820V460H0Z', ink),
    path('M0 272 Q103 244 176 256T333 252L430 263Q548 212 637 236T820 219V460H0Z', night),
    path('M32 130C35 84 77 47 124 46L144 48C172 52 203 65 223 93Q252 133 243 174C238 211 207 250 177 262Q135 285 89 266C44 248 19 212 23 168Z', red),
    path('M0 306L92 291 201 303 308 286 432 311 544 282 660 296 820 269V460H0Z', redDark),
    path('M0 345Q105 326 182 345T360 338Q419 330 502 347T669 322L820 297V460H0Z', red),
    path('M0 385C110 370 171 393 267 376S430 391 526 364Q632 340 701 347T820 332V460H0Z', buff),
    path('M0 411Q78 390 146 400T283 394Q367 381 454 398T639 383L820 359V460H0Z', paper),
    path('M0 454Q102 438 230 446T486 425Q557 416 614 421T820 403V460H0Z', buff)
  );
  const stars = [[50,39],[276,79],[329,38],[368,113],[411,59],[639,58],[745,81],[796,124],[298,173]];
  for (const [x,y] of stars) {
    pieces.push(path(`M${x} ${y-4}l1.5 3 3 1-3 1.5-1.5 3-1.5-3-3-1.5 3-1z`, buff));
  }
  pieces.push(
    mark('M63 137Q74 89 128 81M45 161Q50 118 70 96M66 202Q63 185 65 177M93 238L108 245M171 68l17 9', redDark, 2),
    mark('M11 365l55-8m-21 11 58-7m205-2 28-2m-10 8 38-3m27 17 36-4m291-39 29-4m-15 10 48-7m-654 58 32-2m96 7 57-4m164 3 64-5m34 36 60-6m83-22 83-8', redDark, 2),
    mark('M15 424l56-6m5 5 35-3m201-5 46-2m342-17 41-4m14-5 27-3', buff, 3)
  );

  // The cart's single off-round woodcut wheel. Each carved opening follows a spoke.
  pieces.push(
    path('M547 356Q532 319 552 286Q570 259 605 257Q643 252 668 286Q688 314 675 348Q660 386 623 393Q574 401 547 356Z', shadow),
    path('M553 350Q539 317 559 290C578 261 615 256 645 275Q675 296 674 324Q671 362 638 382Q584 408 553 350Z', paper),
    path('M560 347Q549 316 568 292Q593 264 629 275Q661 284 666 317Q668 343 646 364Q624 387 596 379Q573 373 560 347Z', ink),
    path('M600 324L568 298 572 290 607 316ZM615 315L636 274 643 280 623 319ZM626 325L666 317 666 327 630 332ZM622 335L644 365 636 370 615 340ZM607 340L592 378 584 373 600 335ZM597 330L560 345 556 337 597 323Z', buff),
    path('M598 316Q608 305 619 313Q631 320 623 333Q614 346 600 336Q590 330 598 316Z', red),
    dot(610,326,4,shadow),
    mark('M563 287q19-23 42-24m43 110 11-9m-80 11 15 6', buff, 2)
  );

  // The canopy is seen from its open end; the arched edge and two hems show it is cloth.
  pieces.push(
    path('M427 233L429 155Q432 105 471 77Q503 52 563 45L630 57Q680 68 709 108Q744 155 755 214L724 243L478 262Z', shadow),
    path('M447 226L440 161Q444 118 477 88Q514 54 565 52Q619 51 655 76Q691 98 710 138L739 209 720 226Z', paper),
    path('M467 221L454 170Q456 131 483 103Q512 73 552 70Q598 65 634 88Q668 110 688 149L713 220Z', redDark),
    path('M475 222L465 172Q467 135 493 110Q517 87 552 83Q596 76 626 99Q656 118 678 157L697 218Z', night),
    path('M572 50Q623 48 660 71Q701 97 724 143L749 199 735 212 721 193 717 205 702 187 699 196 685 170Q663 120 637 92Q610 66 572 50Z', red),
    mark('M588 56Q645 74 677 134M613 60Q674 85 705 161M640 69Q684 90 710 137M670 86Q699 106 715 143M701 120l19 37', redDark, 2.5),
    path('M448 211L437 152 434 163 440 226 449 234Z', buff),
    mark('M453 161Q457 124 481 102M489 92q26-20 49-23', buff, 3)
  );

  // Adult magpie with two begging chicks. Each silhouette includes its own folded wing.
  pieces.push(
    path('M604 218L627 181 655 158 685 146 665 173 642 199 624 218Z', paper),
    path('M613 214L659 170 704 148 669 183 632 215Z', ink),
    path('M631 210L683 176 696 174 651 214Z', buff),
    path('M535 162Q528 148 532 137Q535 120 554 113Q570 107 583 121Q592 130 593 147Q597 164 611 173Q636 180 640 193Q641 206 624 217Q599 233 571 220Q548 211 542 189Z', paper),
    path('M524 143L502 150 531 151 546 144Z', buff),
    path('M528 144L505 147 530 134Z', ink),
    path('M530 144Q527 128 541 115Q551 105 564 107L559 99 572 105 572 100 581 112Q595 124 591 146L582 164 571 170 553 164 555 151 543 150Z', ink),
    dot(540.5,134.5,4.2,paper), dot(540,135,1.7,ink),
    path('M570 169Q589 156 604 166Q621 176 629 189L641 197 626 198 631 203Q609 212 589 203Q571 193 570 169Z', ink),
    path('M575 170Q586 164 595 169Q608 174 616 184Q599 184 580 177Z', paper),
    mark('M586 187l23 10m-14-9 25 8', buff, 2),
    path('M475 221Q460 214 461 199Q462 189 473 187L478 183 479 175 484 181 489 175 491 182Q502 184 505 198L517 205 513 218Z', ink),
    path('M466 194L450 184 466 186 471 190ZM466 197L450 191 466 202Z', buff),
    dot(476,191,2.7,paper),
    path('M470 203Q480 212 490 204Q498 203 505 211L506 219 478 219Z', paper),
    path('M510 220Q497 210 499 196Q502 185 515 183L522 177 525 167 528 176 535 172 534 182Q544 186 546 198L558 209 557 218Z', paper),
    path('M501 198Q498 184 511 179L519 169 520 176 528 169 526 179Q538 177 544 189L540 201 527 199 518 192Z', ink),
    path('M505 188L492 177 507 181 514 187ZM504 192L490 184 500 197Z', buff),
    dot(516,185,2.9,paper)
  );
  // Painted wooden body, hinged flap, rope pegs and worn bands.
  pieces.push(
    path('M397 209L587 211 758 185 729 245 686 283 493 302 430 281Z', shadow),
    path('M404 205L582 207 755 181 731 230 687 271 494 288 439 270Z', red),
    path('M408 208L584 216 741 194 735 206 582 226 416 219Z', paper),
    path('M425 236L580 240 716 222 707 234 578 249 433 247Z', redDark),
    path('M443 266L567 273 691 256 681 269 492 285Z', buff),
    mark('M454 231l84 1m57-4 38-5m-105 39 40 2m33-6 60-9m23-9 17-4', redDark, 2),
    dot(450,233,4,paper),dot(696,216,3,paper),
    path('M516 277L564 284 635 307 630 318 542 300 502 286Z', ink),
    path('M488 281L545 290 556 294 528 291Z', paper)
  );

  // Taut traces cross the night and gather on the pulling bird's shoulder.
  pieces.push(
    mark('M175 253Q266 252 340 242L443 230', shadow, 7),
    mark('M174 251Q274 251 342 239L443 229', paper, 3.4),
    mark('M171 263Q303 271 415 251L448 242', shadow, 6),
    mark('M171 261Q310 269 425 248L447 241', buff, 2.8),
    path('M428 223L448 222 451 238 441 245 436 239 443 231 430 232Z', ink)
  );

  // The youngster strides into the light. A long split tail, cheek, eye and black bib
  // make the bird recognizable even when the poster is reduced to a small teaser.
  pieces.push(
    path('M170 250Q223 236 277 201L310 178Q296 199 275 215L307 195Q286 217 249 238L300 218Q263 247 201 267Z', shadow),
    path('M197 254L276 202 255 224 222 246 273 220 248 239 215 255Z', paper),
    path('M168 281L157 301 142 318 126 322 125 326 149 322 140 328 146 328 155 324 164 308 178 290Z', shadow),
    path('M191 278L189 298 203 308 224 305 229 308 213 312 226 313 227 316 204 315 187 308 181 302 180 283Z', shadow),
    path('M95 218L79 218 65 224 96 222Z', buff),
    path('M100 211L73 215 61 221 91 219 108 216Z', ink),
    path('M91 215Q89 193 107 180Q123 169 141 175L138 169 150 176 152 168 155 179Q167 184 170 199Q173 214 186 219Q207 230 213 245Q218 264 206 278Q193 293 175 297Q156 302 137 293Q113 280 106 258Q101 244 103 230L96 231Z', paper),
    path('M89 216Q88 196 99 183Q113 168 133 169L140 171 134 161 147 171 147 161 155 172 160 167 160 177Q174 185 171 206Q169 218 163 231L153 239 141 239 130 235 124 224 111 224 103 218Z', ink),
    path('M96 210Q105 196 116 196L108 200 101 211Z', buff),
    dot(106,203,4.8,paper),dot(105,204,2,ink),
    path('M143 236Q153 222 173 224Q190 225 208 238L247 253 232 258 241 260 220 267 225 270Q196 284 169 274Q151 268 141 251Z', ink),
    path('M146 237Q153 227 168 229Q179 230 189 235L177 238 199 247 177 245 161 240Z', paper),
    mark('M159 251q13 12 32 14m-17-12 26 10m-14-12 27 7', buff, 2.2),
    path('M132 240Q139 254 151 260L149 265Q131 254 126 239Z', red),
    mark('M128 220q-8 12-4 26', redDark, 4),
    mark('M128 220q-8 11-5 22', buff, 1.3),
    path('M74 338L117 333 126 334 115 337ZM180 327L197 323 208 324 195 328Z', redDark)
  );

  // Hand-placed scratches and sparse dry-ink specks; no filters, raster images or shared IDs.
  let state = 114;
  const jitter = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grain = [];
  for (let i = 0; i < 920; i++) {
    const x = (jitter() * 820).toFixed(1);
    const y = (jitter() * 460).toFixed(1);
    const w = (0.5 + jitter() * 2.8).toFixed(1);
    grain.push(`M${x},${y}l${w},-.3`);
  }
  pieces.push(`<path d="${grain.join('')}" stroke="${paper}" opacity=".21" stroke-width=".9" fill="none"/>`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 820 460');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Бумажный театр. На фоне красной луны сорочонок в упряжке тянет кибитку на одном колесе. Из-под навеса выглядывают Сорока и два птенца.');
  svg.innerHTML = '<title>Кибиточка на одном колесе</title>' + pieces.join('');
  return svg;
}


function eveningPressObject(record) {
  const code = String(record.code ?? "").replace(/^P/i, "");
  const facts = record.facts ?? record.edition?.facts ?? [];

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }

  function button(label, className = "evepress-button") {
    const node = element("button", className, label);
    node.type = "button";
    return node;
  }

  function schedule() {
    const figure = element("figure", "evepress-sheet evepress-schedule");
    const caption = element("figcaption", "evepress-caption");
    const heading = element("span", "evepress-title", "Программа телевидения");
    const date = element("time", "evepress-date", "Пятница, 24 сентября");
    date.dateTime = "1993-09-24";
    caption.append(heading, date);

    const controls = element("div", "evepress-controls");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Телеканалы");
    const onChange = element("span", "evepress-visually-hidden");
    onChange.setAttribute("role", "status");
    const listings = element("ul", "evepress-list");
    listings.setAttribute("aria-label", "Передачи по газетному анонсу");

    const rows = facts.flatMap(({ label, value }) => {
      const match = label.match(/^(\d{2}:\d{2}) · «(.+)»$/);
      if (!match || !value) return [];
      const [, time, channel] = match;
      const row = element("li", "evepress-listing");
      const clock = element("time", "evepress-clock", time);
      clock.dateTime = time;
      row.append(
        clock,
        element("span", "evepress-program", value),
        element("span", "evepress-channel", channel)
      );
      listings.append(row);
      return [{ channel, row }];
    });

    const filters = ["Оба канала", "Останкино", "Россия"].map((label, index) => {
      const trigger = button(label);
      const channel = index === 0 ? "" : label;
      trigger.setAttribute("aria-pressed", String(index === 0));
      trigger.addEventListener("click", () => {
        filters.forEach((option) => {
          option.setAttribute("aria-pressed", String(option === trigger));
        });
        rows.forEach((listing) => {
          listing.row.hidden = Boolean(channel && listing.channel !== channel);
        });
        onChange.textContent = channel ? "Показан канал «" + channel + "»" : "Показаны оба канала";
      });
      controls.append(trigger);
      return trigger;
    });

    figure.append(
      caption,
      controls,
      onChange,
      listings,
      element("div", "evepress-source", "По газете «Ленинское знамя» от 18 сентября 1993 года, с. 3.")
    );
    return figure;
  }

  function postcard() {
    const figure = element("figure", "evepress-sheet evepress-postcard");
    const caption = element("figcaption", "evepress-caption");
    caption.append(
      element("span", "evepress-title", "Игры на открытке"),
      element("span", "evepress-date", "«Видео-Асс Dendy», № 1")
    );
    const layout = element("div", "evepress-card-layout");
    const rankings = element("div", "evepress-rankings");
    const sales = element("div", "evepress-card-panel");
    const standings = element("ol", "evepress-places");
    const entries = facts.filter(({ label }) => /^\d+-е место$/.test(label));
    entries.forEach(({ value }) => {
      const item = element("li", "evepress-place");
      const name = value.match(/^(.+) \((«.+»)\)$/);
      item.append(element("span", "evepress-game-name", name?.[1] ?? value));
      if (name) item.append(element("span", "evepress-game-translation", name[2]));
      standings.append(item);
    });

    const compose = button("Составить свою тройку");
    sales.append(element("h4", "evepress-card-label", "Первые три по продажам"), standings, compose);

    const form = element("form", "evepress-card-panel evepress-form");
    form.hidden = true;
    form.append(
      element("h4", "evepress-card-label", "Ваша тройка"),
      element("p", "evepress-draft", "Черновик доступен, пока открыта эта карточка.")
    );
    const fields = entries.map(({ label }, index) => {
      const row = element("label", "evepress-input-row");
      const field = element("input", "evepress-input");
      field.type = "text";
      field.required = true;
      field.maxLength = 65;
      field.name = "game" + (index + 1);
      field.autocomplete = "off";
      field.addEventListener("input", () => field.setCustomValidity(""));
      row.append(element("span", "evepress-input-label", label), field);
      form.append(row);
      return field;
    });
    const formActions = element("div", "evepress-controls");
    const preview = button("Посмотреть карточку");
    preview.type = "submit";
    const backFromEdit = button("К списку продаж", "evepress-button evepress-secondary");
    formActions.append(preview, backFromEdit);
    form.append(formActions);

    const draft = element("div", "evepress-card-panel");
    draft.hidden = true;
    const draftHeading = element("h4", "evepress-card-label", "Ваша тройка");
    draftHeading.tabIndex = -1;
    const draftList = element("ol", "evepress-places");
    const draftActions = element("div", "evepress-controls");
    const edit = button("Изменить тройку");
    const backFromDraft = button("К списку продаж", "evepress-button evepress-secondary");
    draftActions.append(edit, backFromDraft);
    draft.append(
      draftHeading,
      draftList,
      draftActions,
      element("p", "evepress-draft", "Черновик доступен, пока открыта эта карточка.")
    );

    function showPanel(panel, focus) {
      [sales, form, draft].forEach((item) => {
        item.hidden = item !== panel;
      });
      focus?.focus({ preventScroll: true });
    }

    compose.addEventListener("click", () => showPanel(form, fields[0]));
    edit.addEventListener("click", () => showPanel(form, fields[0]));
    [backFromEdit, backFromDraft].forEach((trigger) => {
      trigger.addEventListener("click", () => showPanel(sales, compose));
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const names = fields.map((field) => field.value.trim());
      const empty = names.indexOf("");
      if (empty !== -1) {
        fields[empty].setCustomValidity("Введите название игры.");
        fields[empty].reportValidity();
        return;
      }
      draftList.replaceChildren(...names.map((name) => {
        const item = element("li", "evepress-place");
        item.append(element("span", "evepress-game-name", name));
        return item;
      }));
      showPanel(draft, draftHeading);
    });
    rankings.append(sales, form, draft);
    layout.append(rankings);

    const address = facts.find(({ label }) => label === "На конверте в 1993-м")?.value;
    if (address) {
      const panel = element("div", "evepress-address");
      const [, postcode, city] = address.match(/^(\d+), (.+)$/) ?? [];
      panel.append(
        element("h4", "evepress-card-label", "Адрес редакции в 1993 году"),
        element("p", "evepress-postcode", postcode),
        element("p", "evepress-address-line", city ?? address),
        element("p", "evepress-postscript", "Пометка «хит-парад игр»")
      );
      layout.append(panel);
    }
    figure.append(
      caption,
      layout,
      element("div", "evepress-source", "По хит-параду и обращению к читателям на с. 3 журнала.")
    );
    return figure;
  }

  if (code === "411") return schedule();
  if (code === "412") return postcard();
  return null;
}

function towerCell(x, y, z) {
  if (z < 0 || z > 2 || x < z || y < z || x >= 9 - z || y >= 9 - z) return false;
  if (z === 1) return x !== 4 || y !== 4;
  if (z === 2) return Math.abs(x - 4) > 1 || Math.abs(y - 4) > 1;
  return true;
}

function eveningTowerArt(floor = 0) {
  const ns = 'http://www.w3.org/2000/svg';
  function svgTag(name, attrs) {
    const node = document.createElementNS(ns, name);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }
  const svg = svgTag('svg', {
    viewBox: floor ? '0 0 360 280' : '0 0 480 288',
    role: 'img', 'aria-label': floor ? 'План этажа '+floor+' сверху' : 'Три квадратных яруса башни. В верхних двух ярусах есть проёмы.'
  });
  const ink = '#253749';
  const faces = [
    ['#a7c1b2','#527c85','#375565'], ['#f4c774','#ce865c','#a95545'], ['#fff0cb','#ec976d','#b85b4d']
  ];
  if (floor) {
    const z = floor-1, cell=25;
    for (let y=0;y<9;y++) for (let x=0;x<9;x++) {
      if (x<z || x>8-z || y<z || y>8-z) continue;
      const solid=towerCell(x,y,z);
      const square=svgTag('rect',{x:67.5+x*cell,y:27.5+y*cell,width:cell,height:cell,fill:solid?faces[z][0]:'none',stroke:ink,'stroke-width':solid?1.5:.55});
      if (!solid) square.setAttribute('stroke-dasharray','2 4');
      svg.append(square);
    }
    return svg;
  }
  // Each layer is one cube tall; draw only the faces the viewer can see.
  function project([x,y,z]) {return [240+24*(x-y),40+12*(x+y)-24*z].join(',')}
  function polygon(points, fill, stroke=ink) {
    svg.append(svgTag('polygon',{points:points.map(project).join(' '),fill,stroke,'stroke-width':1.3,'stroke-linejoin':'round'}));
  }
  polygon([[0,0,-.09],[9.3,0,-.09],[9.3,9.3,-.09],[0,9.3,-.09]],'#c1aa82','#c1aa82');
  for (let z=0;z<3;z++) for (let sum=0;sum<=16;sum++) for (let x=0;x<9;x++) {
    const y=sum-x;
    if (!towerCell(x,y,z)) continue;
    const hi=z+1;
    if (!towerCell(x+1,y,z)) polygon([[x+1,y,hi],[x+1,y+1,hi],[x+1,y+1,z],[x+1,y,z]],faces[z][2]);
    if (!towerCell(x,y+1,z)) polygon([[x,y+1,hi],[x+1,y+1,hi],[x+1,y+1,z],[x,y+1,z]],faces[z][1]);
    if (!towerCell(x,y,hi)) polygon([[x,y,hi],[x+1,y,hi],[x+1,y+1,hi],[x,y+1,hi]],faces[z][0]);
  }
  return svg;
}

function eveningPuzzle(r) {
  const box=elem('div','eve-object eve-puzzle');
  const figure=elem('div','eve-puzzle-figure');
  const controls=elem('div','eve-floor-controls');
  controls.setAttribute('role','group');controls.setAttribute('aria-label','Вид башни');
  const labels=['Вся башня','1-й этаж','2-й этаж','3-й этаж','Рисунок из журнала'];
  const descriptions=[
    '145 кубиков. Все 29 деталей уходят в башню.',
    '81 кубик. Нижний этаж — сплошной квадрат 9 × 9.',
    '48 кубиков. В квадрате 7 × 7 оставлена пустой центральная клетка.',
    '16 кубиков. По краю квадрата 5 × 5 идёт стенка толщиной в один кубик.',
    'Фрагмент задней обложки «Кванта», № 1/2 за 1993 год. Видны белые линии исходного чертежа.'
  ];
  const note=elem('p','eve-puzzle-note');note.setAttribute('aria-live','polite');
  function show(floor) {
    if(floor===4){
      const scan=elem('img','eve-original-drawing');
      scan.src=r.edition.drawing;scan.alt='Исходный журнальный чертёж. Белым по тёмному полю начерчена ступенчатая башня с проёмом в центре.';
      figure.replaceChildren(scan);
    }else figure.replaceChildren(eveningTowerArt(floor));
    [...controls.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===floor)));
    note.textContent=descriptions[floor];
  }
  labels.forEach((label,i)=>{
    const b=elem('button','',label);b.type='button';
    b.addEventListener('click',()=>show(i));controls.append(b);
  });
  box.append(figure,controls,note);show(0);return box;
}

function eveningComposition(r) {
  if (r.code===414) return eveningPuzzle(r);
  if (r.code===413) {
    const art=elem('div','eve-object eve-film');
    const stage=elem('div','eve-stage');
    stage.append(eeWheelArt());
    const label=elem('div','eve-film-credits');
    label.append(elem('b','','Акоп Киракосян'),elem('span','','«Союзмультфильм», 1993'));
    const action=external(r.edition.watch,'Смотреть на Wink');action.className='eve-watch';
    art.append(stage,label,action);return art;
  }
  const wrap=elem('div','eve-object');
  wrap.append(eveningPressObject(r));
  if(r.code===412){
    const detail=elem('details','eve-rank-detail'),toggle=elem('summary','','Три строки из журнала');
    const scan=elem('img');scan.src=r.edition.clipping;scan.alt='Фрагмент полосы с тремя первыми местами: Duck Tales, Super Mario и F-1 Race.';
    detail.append(toggle,scan,elem('p','','«Видео-Асс Dendy», № 1 за 1993 год, с. 3. Скан из архива «Великого Dракона».'));wrap.append(detail);
  }
  return wrap;
}

function renderEveningFront() {
  const front = document.getElementById('evening-front');
  if (!front || front.firstElementChild) return;

  front.setAttribute('aria-labelledby', 'evening-front-title');
  front.innerHTML = `
    <div class="ev-cover">
      <header class="ev-masthead">
        <div class="ev-edition">
          <span>ЭФИР 1993</span>
          <span>Выпуск № 2</span>
        </div>
        <h1 id="evening-front-title" class="ev-title">
          <span class="ev-title-first">Свободный</span>
          <span class="ev-title-last">вечер</span>
        </h1>
      </header>
      <div class="ev-spread">
        <a class="ev-link ev-schedule" href="#411" data-issue-code="411" aria-labelledby="ev-story-411">
          <div class="ev-rubric">
            <span>Телепрограмма</span>
            <span class="ev-page">411</span>
          </div>
          <h2 id="ev-story-411">Пятница, <time datetime="1993-09-24">24 сентября</time></h2>
          <ul class="ev-listings">
            <li><time datetime="19:45">19:45</time><strong>«Поле чудес»</strong><span>«Останкино»</span></li>
            <li><time datetime="20:25">20:25</time><strong>«Осенний марафон»</strong><span>«Россия»</span></li>
            <li><time datetime="20:40">20:40</time><strong>«Спокойной ночи, малыши!»</strong><span>«Останкино»</span></li>
          </ul>
        </a>

        <a class="ev-link ev-games" href="#412" data-issue-code="412" aria-labelledby="ev-story-412">
          <div class="ev-rubric">
            <span>Игры для Dendy</span>
            <span class="ev-page">412</span>
          </div>
          <h2 id="ev-story-412">Десять игр на почтовой открытке</h2>
          <ol class="ev-game-rank" aria-label="Первые три места по продажам">
            <li>Duck Tales</li>
            <li>Super Mario</li>
            <li>F-1 Race</li>
          </ol>
          <p>«Хит-парад игр» — такую пометку редакция просила ставить на конверте.</p>
        </a>

        <a class="ev-link ev-cinema" href="#413" data-issue-code="413" aria-labelledby="ev-story-413">
          <div class="ev-rubric">
            <span>«Союзмультфильм»</span>
            <span class="ev-page">413</span>
          </div>
          <h2 id="ev-story-413">Кибиточка на одном колесе</h2>
          <div class="ev-wheel" aria-hidden="true"></div>
          <p>Сорочонок везёт всю семью. Кому достанется каша?</p>
        </a>

        <a class="ev-link ev-tower" href="#414" data-issue-code="414" aria-labelledby="ev-story-414">
          <div class="ev-rubric">
            <span>Головоломка из «Кванта»</span>
            <span class="ev-page">414</span>
          </div>
          <div class="ev-tower-art" aria-hidden="true"></div>
          <h2 id="ev-story-414">Башня из <strong>29</strong> пентакубиков</h2>
        </a>
      </div>
    </div>`;

  if (typeof eveningTowerArt === 'function') {
    front.querySelector('.ev-tower-art').append(eveningTowerArt(0));
  }
  if (typeof eeWheelArt === 'function') {
    front.querySelector('.ev-wheel').append(eeWheelArt());
  }
  const fragment=elem('img','ev-rank-fragment');
  fragment.src=pages.get(412).edition.clipping;
  fragment.alt='Три первых места в журнале: Duck Tales, Super Mario, F-1 Race.';
  front.querySelector('.ev-game-rank').replaceWith(fragment);
  front.querySelector('.ev-schedule').after(front.querySelector('.ev-tower'));
}

prepareComparison();state=parseRoute();showRaster();render();replace();syncLayers();
