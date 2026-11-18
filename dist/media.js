/* Documentary supplements, the media index and the household-issue reading desk. */
const archiveKinds = {video:'Видео',photo:'Фото',scan:'Сканы',document:'Документы'};
function mergeAttachments(entries){
  const combined=new Map();
  for(const entry of entries){
    const key=entry.kind+'|'+entry.url;
    combined.set(key,{...combined.get(key),...entry});
  }
  return [...combined.values()];
}
function recordAttachments(r) {
  const supplement = r.supplement || {};
  const entries = [];
  if (r.imageData) {
    const kind=r.type==='photo'?'photo':'scan';
    entries.push({kind,file:r.imageData,alt:r.mediaAlt||r.title,label:r.edition.objectLabel||r.shortTitle,caption:r.edition.caption||r.credit,url:r.originalUrl});
  }
  if (r.code===412) entries.push({kind:'scan',file:r.edition.clipping,alt:'Первые три места таблицы продаж игр',label:'Три строки первого номера Dendy',url:r.originalUrl});
  if (r.code===414) entries.push({kind:'scan',file:r.edition.drawing,alt:'Чертёж башни на задней обложке',label:'Чертёж «Кванта»',url:r.originalUrl});
  if (r.code===413) entries.push({kind:'video',label:'«Кибиточка на одном колесе»',url:r.edition.watch,note:'Мультфильм 1993 года в каталоге Wink.'});
  const additional=[...(supplement.media||[]),...(supplement.links||[])];
  if(r.code===204)entries.unshift({kind:'video',label:'Москва. 4–7 октября 1993 года',stream:'https://streammtk.prlib.ru/3940.mp4',url:r.originalUrl,note:'Звуковая кинохроника. 2 мин 34 с. Видеопоток Президентской библиотеки.'});
  return mergeAttachments([...entries,...additional]);
}
function renderArchiveExtra(r) {
  const container=$('archive-extra');container.replaceChildren();
  const previousVideo=$('reader-media').querySelector('video');
  if(previousVideo)previousVideo.pause();
  const source=r.supplement||{};
  const items=recordAttachments(r);
  if(r.code===204){
    const media=$('reader-media');
    const item=items.find(i=>i.stream);
    const vid=elem('video','history-player');vid.controls=true;vid.preload='none';vid.playsInline=true;
    vid.setAttribute('aria-label','Кинохроника Москвы, 4–7 октября 1993 года');
    const track=elem('source');track.src=item.stream;track.type='video/mp4';vid.append(track);
    const title=elem('span','stream-title','Москва, 4–7 октября');
    const fallback=external(r.originalUrl,'Открыть в Президентской библиотеке');
    media.replaceChildren(title,vid,elem('figcaption','',item.note),fallback);
  }
  if(bytCodes.includes(r.code)){
    text('reader-kind',r.typeLabel);
    text('reader-source',[r.source,r.credit].join(' '));
    const mainImg=$('reader-media').querySelector('img');if(mainImg)mainImg.alt=r.mediaAlt||r.title;
    const table=elem('table','byt-facts');
    const cap=elem('caption','',r.factsTitle);table.append(cap);
    const body=table.createTBody();
    for(const f of r.edition.facts){
      const row=body.insertRow(),head=elem('th','',f.label);head.scope='row';row.append(head,elem('td','',f.value));
    }
    if(r.imageData)$('reader-detail').before(table);
    else $('reader-media').replaceChildren(table,elem('figcaption','',r.edition.caption));
  }
  const attachments=mergeAttachments([...(source.media||[]),...(source.links||[])]);
  if(!attachments.length){container.hidden=true;return}
  container.hidden=false;
  const h=elem('h2','','К этой записи');
  const list=elem('ul','source-roll');
  for(const item of attachments){
    const li=elem('li');const file=item.file;
    if(file){
      const fig=elem('figure');const image=elem('img');image.src=file;image.loading='lazy';
      image.alt=item.alt||item.label||r.shortTitle;
      const cap=elem('figcaption','',[item.caption,item.credit].filter(Boolean).join(' '));
      fig.append(image,cap);li.append(fig);
    }
    const kind=elem('span','source-genre',archiveKinds[item.kind]||'Источник');
    const link=external(item.url,item.label||'Открыть оригинал');
    li.append(kind,link);
    if(item.note)li.append(elem('p','',item.note));
    list.append(li);
  }
  container.append(h);
  if(r.code===121){
    const framebox=elem('div','archive-player-box');
    const play=elem('button','archive-play-button','Смотреть телеобращение на этой странице');
    play.type='button';
    play.addEventListener('click',()=>{
      const iframe=elem('iframe','history-player');
      iframe.title='Обращение Бориса Ельцина, 21 сентября 1993 года';
      iframe.allowFullscreen=true;iframe.allow='encrypted-media; picture-in-picture';
      iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.src='https://www.youtube-nocookie.com/embed/h9juTns736s';
      framebox.replaceChildren(iframe);
    });
    framebox.append(play);container.append(framebox);
  }
  container.append(list);
}
function cleanRecordMedia(){
  for(const table of document.querySelectorAll('.reader-text>.byt-facts'))table.remove();
  for(const video of document.querySelectorAll('#reader video'))video.pause();
}
function renderMediaShelf() {
  const shelf=$('media-shelf');shelf.replaceChildren();
  const head=elem('header','shelf-head');
  head.append(elem('h1','','Медиатека'),elem('p','','Кинохроника, фотографии и документы из записей архива.'));
  const filters=elem('div','shelf-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Вид источника');
  const types={all:'Всё',video:'Видео',photo:'Фото',scan:'Сканы'};
  const validKind=k=>k==='document'?'scan':k;
  const included=Object.values(archiveKinds);
  for(const [key,label] of Object.entries(types)){
    const button=elem('button','',label);button.type='button';button.setAttribute('aria-pressed',String(key===state.medium));
    button.addEventListener('click',()=>{if(state.medium!==key){setRoute({...state,medium:key});$('media-shelf').querySelector('[aria-pressed="true"]').focus({preventScroll:true})}});
    filters.append(button);
  }
  shelf.append(head,filters);
  const rows=elem('ul','shelf-list');
  for(const r of [...items].sort((a,b)=>a.code-b.code)){
    const assets=recordAttachments(r).filter(x=>included.includes(archiveKinds[x.kind]) && (state.medium==='all'||validKind(x.kind)===state.medium));
    if(!assets.length)continue;
    const li=elem('li','shelf-row');
    const recordLink=elem('a','shelf-record',r.code+'  '+r.shortTitle);
    recordLink.href='#'+r.code+'?from=700'+(state.medium==='all'?'':'&media='+state.medium);
    recordLink.addEventListener('click',event=>{if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();readCode(r.code)});
    const preview=assets.find(a=>a.file);
    if(preview){
      const picture=elem('img','shelf-thumb');picture.src=preview.file;picture.alt='';picture.loading='lazy';
      recordLink.prepend(picture);
    }
    li.append(recordLink);
    const files=elem('ul','shelf-files');
    for(const a of assets){
      const f=elem('li');
      f.append(elem('span','source-genre',archiveKinds[a.kind]),external(a.url,a.label||a.caption||r.title));
      if(a.note)f.append(elem('p','',a.note));
      files.append(f);
    }
    li.append(files);rows.append(li);
  }
  shelf.append(rows);
}

