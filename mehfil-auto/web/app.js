/* Mehfil Aura 6 — purpose-built local music player. No cloud music upload. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const native=!!window.AndroidBridge;
const audio=new Audio();
audio.preload='metadata';
const history=MehfilHistory.create(localStorage);
const get=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v===null?fallback:v}catch(e){return fallback}};
const liked=get('mehfil_favorites_v1',{});
const overrides=get('mehfil_overrides_v1',{});
const rules=get('mehfil_learned_rules_v1',[]);
const custom=get('mehfil_custom_playlists_v1',[]);
let tracks=[],categories=[],playingId=null,currentPage='home',libraryMode='songs',activeCategory='all',libraryQuery='',sortBy='title',visibleLimit=90;
let queueContext=[],currentUri=null,lastObjectUrl=null,loading=false,shuffle=false,repeat='all';
let historySample=null,historyTrack=null,lastHistoryRender=0,period='daily',selectedMemory='',noticeTimeout=null,promptEvent=null,editingTrack=null;
const PAIRS=[['#596fe2','#1c2960'],['#dc7074','#653957'],['#6578d9','#273b61'],['#568d8d','#1c3856'],['#9571be','#38265e'],['#cc9a66','#58456b'],['#54739e','#192a4b'],['#d16890','#413a6b']];
function hash(s){let n=0;for(const char of String(s||''))n=(n*31+char.codePointAt(0))|0;return Math.abs(n)}
function tone(s){return PAIRS[hash(s)%PAIRS.length]}
function toneStyle(el,key){const [a,b]=tone(key);el.style.setProperty('--tone1',a);el.style.setProperty('--tone2',b)}
function icon(id){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');const u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#ic-'+id);s.append(u);return s}
function save(k,obj){try{localStorage.setItem(k,JSON.stringify(obj));return true}catch(e){notify('Storage unavailable. Export a backup to keep your changes.');return false}}
function pretty(s){s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function minutes(sec){sec=Math.max(0,Number(sec)||0);if(sec<60)return sec?'Less than 1m':'0m';const h=Math.floor(sec/3600),m=Math.round((sec%3600)/60);return h?h+'h '+m+'m':m+'m'}
function notify(message){const n=$('notice');n.textContent=String(message||'');n.classList.remove('hidden');if(noticeTimeout)clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>n.classList.add('hidden'),4700)}
function subtitle(t){return [t.artist&&t.artist!=='Unknown artist'?t.artist:'Unknown artist',t.album].filter(Boolean).join(' · ')}
function clean(s){return MehfilClassifier.clean(s)}
function hasTheme(categories){return categories.some(x=>x==='custom'||x.startsWith('custom:')||MehfilClassifier.PRESETS.some(p=>p[0]===x&&!MehfilClassifier.ARTISTS.has(x)))}
function fix(raw){
 const id=String(raw.id||raw.uri||raw.path||raw.name||Math.random());
 const match=MehfilClassifier.detect(raw,{rules});
 let cats=match.categories.slice();
 if(Object.prototype.hasOwnProperty.call(overrides,id)){
  cats=[...new Set([...(Array.isArray(overrides[id])?overrides[id]:[]),...cats.filter(c=>/^(artist|album|genre|folder):/.test(c))])];
 }
 if(hasTheme(cats))cats=cats.filter(c=>c!=='other');
 else if(!cats.includes('other'))cats.push('other');
 return {...raw,id,title:String(raw.title||raw.name||'Untitled').replace(/\.(mp3|flac|wav|m4a|opus|aac|ogg|wma)$/i,'').trim(),artist:match.artist||'Unknown artist',album:match.album||'',genre:match.genre||'',folder:match.folder||'',duration:Number(raw.duration)||0,categories:[...new Set(cats)],reasons:match.reasons||{}};
}
function reclassify(){tracks=tracks.map(fix);renderAll();if(native)shareNativeQueue();notify(tracks.length+' songs organized. '+tracks.filter(t=>t.categories.includes('other')).length+' need review.')}
function recentTracks(){
 const all=history.all().topTracks||[];
 return all.map(x=>tracks.find(t=>t.id===x.id)).filter(Boolean).slice(0,7);
}
function updateCategories(){categories=MehfilClassifier.buildCategories(tracks,custom);const exists=new Set(categories.map(x=>x.id));for(const id of ['allah','nabi','khwaja','data','ali','qawwali'])if(!exists.has(id)&&!tracks.length){const p=MehfilClassifier.PRESETS.find(x=>x[0]===id);if(p)categories.push({id,title:p[1],icon:p[2],description:p[3],count:0,group:'curated'})}}
function favoriteCount(){return tracks.filter(t=>liked[t.id]).length}
function addFeature(node,c){
 const btn=document.createElement('button');btn.className='feature';toneStyle(btn,c.id);
 const symbol=document.createElement('span');symbol.className='ornament';symbol.textContent=c.icon||'♫';
 const text=document.createElement('b');text.textContent=c.title;
 const count=document.createElement('small');count.textContent=(c.count||0)+' songs';
 btn.append(symbol,text,count);btn.onclick=()=>openCategory(c.id,c.title);node.append(btn);
}
function empty(container,title,desc,action){
 const n=document.createElement('div');n.className='empty-state';
 const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent='♫';
 const strong=document.createElement('strong');strong.textContent=title;
 const p=document.createElement('p');p.textContent=desc;n.append(emoji,strong,p);
 if(action){const btn=document.createElement('button');btn.textContent=native?'Scan my music':'Choose music folder';btn.onclick=scanMusic;n.append(btn)}
 container.append(n);
}
function songRow(t){
 const row=document.createElement('div');row.className='track-row'+(t.id===playingId?' playing':'');
 const art=document.createElement('button');art.className='track-art';art.textContent=t.id===playingId?'▶':'♫';art.setAttribute('aria-label','Play '+t.title);toneStyle(art,t.title);art.onclick=()=>playTrack(t);
 const name=document.createElement('button');name.className='track-name';const b=document.createElement('strong');b.textContent=t.title;const small=document.createElement('small');small.textContent=subtitle(t);name.append(b,small);name.onclick=()=>playTrack(t);
 const time=document.createElement('span');time.className='duration';time.textContent=t.duration?pretty(t.duration):'';
 const more=document.createElement('button');more.className='row-more';more.setAttribute('aria-label','Sort '+t.title);more.textContent='⋮';more.onclick=()=>openSort(t);
 row.append(art,name,time,more);return row;
}
function renderHome(){
 const c=$('home-collections');c.replaceChildren();
 const special=categories.filter(x=>['nabi','allah','khwaja','data','ali','qawwali','nusrat','sabri','aziz'].includes(x.id));
 for(const x of special.slice(0,6))addFeature(c,x);
 const recent=$('home-recent');recent.replaceChildren();const songs=recentTracks();
 if(!songs.length)empty(recent,'Your listening starts here','Play your first song and it will appear in Recently played.',!tracks.length);
 else for(const t of songs)recent.append(songRow(t));
 $('scan-subtitle').textContent=native?'Scan your phone automatically':'Choose a music folder';
}
function makeGroupRow(g){
 const row=document.createElement('button');row.className='artist-card';
 const badge=document.createElement('span');badge.className='artist-icon';badge.textContent=g.icon||'♫';toneStyle(badge,g.id);
 const text=document.createElement('span');const name=document.createElement('b');name.textContent=g.title;const small=document.createElement('small');small.textContent=(g.count||0)+' songs';text.append(name,small);
 row.append(badge,text,icon('chevron'));row.onclick=()=>openCategory(g.id,g.title);
 return row;
}
function filteredTracks(){
 let arr=tracks.filter(t=>(activeCategory==='all'||activeCategory==='liked'&&liked[t.id]||activeCategory==='other'&&t.categories.includes('other')||t.categories.includes(activeCategory))&&clean([t.title,t.name,t.artist,t.album,t.genre,t.folder].join(' ')).includes(clean(libraryQuery)));
 if(sortBy==='artist')arr.sort((a,b)=>a.artist.localeCompare(b.artist)||a.title.localeCompare(b.title));
 else if(sortBy==='duration')arr.sort((a,b)=>b.duration-a.duration);
 else if(sortBy==='newest')arr.reverse();
 else arr.sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'}));
 return arr;
}
function renderLibrary(){
 $('library-total').textContent=tracks.length+' songs';
 for(const b of $('library-tabs').querySelectorAll('button'))b.classList.toggle('selected',b.dataset.mode===libraryMode);
 const result=$('library-results');result.replaceChildren();$('show-more').classList.add('hidden');
 if(libraryMode==='songs'){
  const cat=categories.find(c=>c.id===activeCategory);$('library-subheading').textContent=activeCategory==='all'?'All songs':activeCategory==='liked'?'Favorites':activeCategory==='other'?'Needs sorting':cat?.title||'Playlist';
  const arr=filteredTracks();$('library-subheading').textContent+=' · '+arr.length;
  if(!arr.length)empty(result,tracks.length?'Nothing found':'No songs discovered yet',tracks.length?'Try a different search or playlist.':'Mehfil scans accessible audio on your phone. You can also add a folder.',!tracks.length);
  else{const frag=document.createDocumentFragment();for(const t of arr.slice(0,visibleLimit))frag.append(songRow(t));result.append(frag)}
  if(visibleLimit<arr.length){$('show-more').classList.remove('hidden');$('show-more').textContent='Show '+Math.min(90,arr.length-visibleLimit)+' more songs ↓'}
 }else{
  const prefix={artists:'artist:',albums:'album:',genres:'genre:',folders:'folder:'}[libraryMode];
  const rows=categories.filter(c=>c.id.startsWith(prefix)&&clean(c.title).includes(clean(libraryQuery)));
  $('library-subheading').textContent=libraryMode[0].toUpperCase()+libraryMode.slice(1)+' · '+rows.length;
  if(!rows.length)empty(result,'No '+libraryMode+' detected','Try rescanning your library. Some audio files are missing metadata.',false);
  else{const frag=document.createDocumentFragment();for(const r of rows)frag.append(makeGroupRow(r));result.append(frag)}
 }
}
function addPlaylistCard(node,c){
 const card=document.createElement('button');card.className='playlist-tile';const cover=document.createElement('div');cover.className='playlist-cover';toneStyle(cover,c.id);
 const symbol=document.createElement('span');symbol.textContent=c.icon||'♫';cover.append(symbol);
 const name=document.createElement('strong');name.textContent=c.title;const count=document.createElement('small');count.textContent=c.count+' tracks';card.append(cover,name,count);
 card.onclick=()=>openCategory(c.id,c.title);node.append(card);
}
function renderPlaylists(){
 const grid=$('playlist-grid');grid.replaceChildren();
 const fav={id:'liked',title:'Your favorites',icon:'♥',count:favoriteCount(),group:'curated'};
 addPlaylistCard(grid,fav);
 const curated=categories.filter(c=>c.group==='curated'&&c.id!=='other');
 for(const c of curated)addPlaylistCard(grid,c);
 const other=categories.find(c=>c.id==='other');if(other&&other.count)addPlaylistCard(grid,other);
 const artists=$('playlist-artists');artists.replaceChildren();for(const a of categories.filter(c=>c.group==='artist').slice(0,24)){const b=document.createElement('button');b.textContent=a.title;b.onclick=()=>openCategory(a.id,a.title);artists.append(b)}
 if(!artists.children.length){const x=document.createElement('p');x.className='subline';x.textContent='Your artists appear here after scanning.';artists.append(x)}
}
function renderAll(){updateCategories();renderHome();renderLibrary();renderPlaylists();$('review-count').textContent=tracks.filter(t=>t.categories.includes('other')).length+' songs need sorting';drawStory()}
function pageTo(id){
 if(!['home','library','playlists','story','settings'].includes(id))return;
 currentPage=id;for(const n of document.querySelectorAll('.page'))n.classList.toggle('page-active',n.dataset.screen===id);
 for(const n of document.querySelectorAll('[data-page]')){n.classList.toggle('active',n.dataset.page===id);n.setAttribute('aria-current',n.dataset.page===id?'page':'false')}
 document.querySelector('.main-scroll').scrollTo({top:0,behavior:'instant'});
 if(id==='library')renderLibrary();if(id==='story')drawStory();
}
function openCategory(id,title){activeCategory=id;libraryMode='songs';libraryQuery='';$('library-search').value='';visibleLimit=90;pageTo('library')}
function simplePlay(){
 if(!tracks.length){pageTo('library');scanMusic();return}
 if(playingId){openPlayer();return}
 const last=recentTracks()[0]||tracks[0];playTrack(last);
}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>pageTo(b.dataset.page)));
$('top-search').onclick=()=>{pageTo('library');$('library-search').focus()};
$('top-settings').onclick=()=>pageTo('settings');
$('quick-play').onclick=simplePlay;
$('quick-scan').onclick=scanMusic;$('setting-scan').onclick=scanMusic;
$('setting-folder').onclick=()=>{if(native&&window.AndroidBridge.chooseFolder)AndroidBridge.chooseFolder();else $('folder-picker').click()};
$('setting-rules').onclick=openLearn;
$('setting-review').onclick=()=>openCategory('other','Needs sorting');
for(const b of $('library-tabs').querySelectorAll('button'))b.onclick=()=>{libraryMode=b.dataset.mode;activeCategory='all';visibleLimit=90;renderLibrary()};
$('library-search').oninput=e=>{libraryQuery=e.target.value;visibleLimit=90;renderLibrary()};
$('library-sort').onchange=e=>{sortBy=e.target.value;renderLibrary()};
$('show-more').onclick=()=>{visibleLimit+=90;renderLibrary()};
$('new-playlist').onclick=()=>{
 const title=prompt('Name your playlist');
 if(!title||!title.trim())return;
 if(custom.length>=50){notify('Maximum 50 custom playlists.');return}
 const id='custom:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
 custom.push({id,title:title.trim().slice(0,45)});save('mehfil_custom_playlists_v1',custom);renderAll();openCategory(id,title);notify('Playlist created. Tap ⋮ next to a song to add it.');
};
function openSort(t){
 editingTrack=t;const node=$('sort-checks');node.replaceChildren();$('sort-title').textContent=t.title;
 const candidates=[...MehfilClassifier.PRESETS.map(x=>({id:x[0],title:x[1]})),...custom];
 for(const p of candidates){
  const row=document.createElement('label');row.className='check-label';const input=document.createElement('input');input.type='checkbox';input.value=p.id;input.checked=t.categories.includes(p.id);
  row.append(input,document.createTextNode(p.title));node.append(row)
 }
 $('sort-dialog').classList.remove('hidden');
}
function saveSort(){
 if(!editingTrack)return;
 const ids=[...$('sort-checks').querySelectorAll('input:checked')].map(x=>x.value);
 overrides[editingTrack.id]=ids;save('mehfil_overrides_v1',overrides);$('sort-dialog').classList.add('hidden');reclassify();
}
$('sort-save').onclick=saveSort;
$('sort-close').onclick=$('sort-cancel').onclick=()=>$('sort-dialog').classList.add('hidden');
$('now-categories').onclick=()=>{const t=current();if(t)openSort(t);else notify('Play a song to sort it.')};
function refreshLearn(){
 const list=$('learned-list');list.replaceChildren();
 for(const rule of rules){
  const row=document.createElement('div');row.className='learned-entry';
  const s=document.createElement('span');s.textContent=rule.term+' → '+(categories.find(c=>c.id===rule.category)?.title||MehfilClassifier.PRESETS.find(p=>p[0]===rule.category)?.[1]||rule.category);
  const btn=document.createElement('button');btn.textContent='Remove';btn.onclick=()=>{const i=rules.indexOf(rule);if(i>=0){rules.splice(i,1);save('mehfil_learned_rules_v1',rules);refreshLearn();reclassify()}};
  row.append(s,btn);list.append(row)
 }
}
function openLearn(){
 const dest=$('learn-destination');dest.replaceChildren();
 for(const cat of [...MehfilClassifier.PRESETS.map(p=>({id:p[0],title:p[1]})),...custom]){
  const option=document.createElement('option');option.value=cat.id;option.textContent=cat.title;dest.append(option)
 }
 refreshLearn();$('learn-dialog').classList.remove('hidden');$('learn-term').focus();
}
$('learn-close').onclick=$('learn-cancel').onclick=()=>$('learn-dialog').classList.add('hidden');
$('learn-save').onclick=()=>{
 const term=$('learn-term').value.trim(),category=$('learn-destination').value;
 if(term.length<2||term.length>90){notify('Enter a keyword at least 2 characters long.');return}
 if(rules.length>=150){notify('150 rules maximum. Remove an old rule first.');return}
 if(rules.some(r=>clean(r.term)===clean(term)&&r.category===category)){notify('That rule is already saved.');return}
 rules.push({term,category});save('mehfil_learned_rules_v1',rules);$('learn-term').value='';$('learn-dialog').classList.add('hidden');reclassify();notify('Mehfil learned "'+term+'" for future scans.');
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){for(const id of ['now-overlay','sort-dialog','learn-dialog','queue-drawer'])$(id).classList.add('hidden')}});
function applyTheme(theme){
 const value=theme==='chandni'?'chandni':'night';document.documentElement.dataset.theme=value;
 document.querySelector('meta[name=theme-color]').content=value==='chandni'?'#fff7e8':'#090d18';
 for(const b of document.querySelectorAll('[data-palette]'))b.classList.toggle('active',b.dataset.palette===value);
 try{localStorage.setItem('mehfil_theme_v6',value)}catch(e){}
}
document.querySelectorAll('[data-palette]').forEach(b=>b.onclick=()=>applyTheme(b.dataset.palette));
applyTheme(localStorage.getItem('mehfil_theme_v6')||'night');
function audioState(){
 if(native){try{
  const d=JSON.parse(AndroidBridge.position());return {id:d.id||'',uri:d.uri||'',playing:!!d.playing,position:Math.max(0,(Number(d.position)||0)/1000),duration:Math.max(0,(Number(d.duration)||0)/1000),ended:!!d.ended};
 }catch(e){return {playing:false,position:0,duration:0}}}
 return {playing:!audio.paused&&!audio.ended,position:Number(audio.currentTime)||0,duration:Number.isFinite(audio.duration)?audio.duration:0,ended:audio.ended};
}
function current(){return tracks.find(t=>t.id===playingId)||null}
function stopProgress(){
 const t=historyTrack;const s=audioState(),now=Date.now();
 if(t&&historySample&&historySample.playing&&s.position>historySample.position){
  const seconds=Math.min((now-historySample.at)/1000,s.position-historySample.position,20);
  if(seconds>0.1)history.recordSeconds(t,historySample.at,seconds);
 }
 historySample=null;
}
function trackListening(s){
 const t=current();if(!t){historySample=null;return}
 const now=Date.now();
 if(historyTrack?.id!==t.id){historyTrack=t;historySample=null;history.recordStart(t,now)}
 if(historySample&&historySample.playing&&s.position>historySample.position){
  const seconds=Math.min((now-historySample.at)/1000,s.position-historySample.position,15);
  if(seconds>0.1)history.recordSeconds(t,historySample.at,seconds)
 }
 historySample={id:t.id,at:now,position:s.position,playing:s.playing};
 if(now-lastHistoryRender>7000){lastHistoryRender=now;if(currentPage==='story')drawStory()}
}
function nativeQueue(){
 if(!native||!AndroidBridge.queueBegin)return;
 AndroidBridge.queueBegin();for(let i=0;i<tracks.length;i+=90){
  AndroidBridge.queueAppend(JSON.stringify(tracks.slice(i,i+90).filter(t=>t.uri).map(t=>({id:t.id,uri:t.uri,title:t.title,artist:t.artist}))));
 }AndroidBridge.queueFinish();
}
function playTrack(t,options){
 if(!t)return;
 stopProgress();historyTrack=null;
 if(!(native&&t.uri)&&!t.file){notify('Choose the audio file again to play this track.');return}
 playingId=t.id;currentUri=t.uri||null;loading=native;
 if(!options?.keepQueue){queueContext=filteredTracks().length?filteredTracks().map(x=>x.id):tracks.map(x=>x.id)}
 $('mini-player').classList.remove('hidden');
 if(native){try{AndroidBridge.play(t.uri,t.title,t.artist,t.id)}catch(e){notify('Playback could not start: '+e.message)}}
 else{
  audio.pause();if(lastObjectUrl){URL.revokeObjectURL(lastObjectUrl);lastObjectUrl=null}
  lastObjectUrl=URL.createObjectURL(t.file);audio.src=lastObjectUrl;
  audio.loop=repeat==='one';audio.play().catch(e=>notify('Unable to play audio: '+e.message));
 }
 paintPlayer();renderLibrary();renderHome();
}
function syncNative(){
 const s=audioState();
 if(native&&s.uri){
  const t=tracks.find(x=>x.uri===s.uri||x.id===s.id);
  if(t&&playingId!==t.id){stopProgress();playingId=t.id;historyTrack=null;currentUri=t.uri;renderLibrary();$('mini-player').classList.remove('hidden')}
 }
 if(playingId&&s.playing)trackListening(s);
 else if(historySample){stopProgress();historySample=null}
 paintPlayer(s);
}
function toggle(){
 const s=audioState();
 if(!playingId){simplePlay();return}
 if(native){if(s.playing)AndroidBridge.pause();else AndroidBridge.resume()}
 else if(s.playing)audio.pause();else audio.play().catch(e=>notify(e.message));
 setTimeout(syncNative,230);
}
function skip(dir){
 let ids=queueContext.length?queueContext:tracks.map(t=>t.id);
 if(!ids.length)return;
 const i=ids.indexOf(playingId);
 let next=(i+dir+ids.length)%ids.length;
 if(shuffle&&ids.length>1)next=(i+1+Math.floor(Math.random()*(ids.length-1)))%ids.length;
 const t=tracks.find(x=>x.id===ids[next]);if(t)playTrack(t,{keepQueue:true});
}
function changeMode(){
 if(native){try{AndroidBridge.setShuffle(shuffle);AndroidBridge.setRepeat(repeat)}catch(e){}}
 else audio.loop=repeat==='one';
 $('now-shuffle').classList.toggle('active',shuffle);$('now-repeat').classList.toggle('active',repeat!=='all');
 $('repeat-one').textContent=repeat==='one'?'1':repeat==='off'?'×':'';
}
function paintPlayer(state){
 const s=state||audioState(),t=current();
 if(!t)return;
 $('mini-player').classList.remove('hidden');
 $('mini-title').textContent=t.title;$('mini-artist').textContent=t.artist;
 toneStyle($('mini-art'),t.title);toneStyle($('now-art'),t.title);
 $('now-title').textContent=t.title;$('now-artist').textContent=t.artist;
 $('now-source').textContent=categories.find(c=>c.id===activeCategory)?.title||'Your library';
 const play=s.playing?'pause':'play';
 $('mini-toggle').replaceChildren(icon(play));$('now-toggle').replaceChildren(icon(play));
 const pct=s.duration?Math.max(0,Math.min(100,s.position/s.duration*100)):0;
 $('mini-progress').style.setProperty('--played',pct+'%');
 if(s.duration){$('now-seek').value=Math.round(pct*10);$('now-time').textContent=pretty(s.position);$('now-duration').textContent=pretty(s.duration)}
 else{$('now-time').textContent='0:00';$('now-duration').textContent=t.duration?pretty(t.duration):'0:00'}
 $('now-heart').classList.toggle('active',!!liked[t.id]);
}
function openPlayer(){if(!playingId){simplePlay();return}$('now-overlay').classList.remove('hidden');paintPlayer()}
$('mini-open').onclick=openPlayer;
$('mini-toggle').onclick=toggle;$('mini-prev').onclick=()=>skip(-1);$('mini-next').onclick=()=>skip(1);
$('now-down').onclick=()=>$('now-overlay').classList.add('hidden');
$('now-toggle').onclick=toggle;$('now-prev').onclick=()=>skip(-1);$('now-next').onclick=()=>skip(1);
$('now-heart').onclick=()=>{const t=current();if(!t)return;liked[t.id]=!liked[t.id];save('mehfil_favorites_v1',liked);renderPlaylists();renderLibrary();paintPlayer()};
$('now-shuffle').onclick=()=>{shuffle=!shuffle;changeMode()};
$('now-repeat').onclick=()=>{repeat=repeat==='all'?'one':repeat==='one'?'off':'all';changeMode()};
$('now-seek').onchange=e=>{const s=audioState(),fraction=Math.max(0,Math.min(1,Number(e.target.value)/1000));stopProgress();if(s.duration)native?AndroidBridge.seek(Math.floor(s.duration*1000*fraction)):audio.currentTime=s.duration*fraction};
$('now-list').onclick=$('now-queue-open').onclick=()=>{drawQueue();$('queue-drawer').classList.remove('hidden')};
$('queue-close').onclick=()=>$('queue-drawer').classList.add('hidden');
function drawQueue(){
 const box=$('queue-items');box.replaceChildren();const ids=queueContext.length?queueContext:tracks.map(t=>t.id);
 const at=ids.indexOf(playingId);for(const id of ids.slice(Math.max(0,at),Math.max(0,at)+65)){
  const t=tracks.find(x=>x.id===id);if(!t)continue;
  const b=document.createElement('button');b.className='queue-item'+(t.id===playingId?' active':'');
  const art=document.createElement('span');art.textContent=t.id===playingId?'♫':'›';const name=document.createElement('span');name.textContent=t.title;b.append(art,name);
  b.onclick=()=>{playTrack(t,{keepQueue:true});$('queue-drawer').classList.add('hidden')};box.append(b);
 }
}
audio.addEventListener('ended',()=>{if(repeat==='off'&&queueContext.indexOf(playingId)===queueContext.length-1)return;if(repeat!=='one')skip(1)});
audio.addEventListener('error',()=>notify('This audio format could not be played.'));
setInterval(syncNative,1050);
function drawStory(){
 const now=new Date();
 $('hours-today').textContent=minutes(history.day(MehfilHistory.dateKey(now)).seconds);
 $('hours-week').textContent=minutes(history.week(MehfilHistory.weekKey(now)).seconds);
 $('hours-month').textContent=minutes(history.month(MehfilHistory.monthKey(now)).seconds);
 $('hours-all').textContent=minutes(history.all().seconds);
 const month=$('memory-month'),prior=selectedMemory||month.value||MehfilHistory.monthKey(now);
 const months=[...new Set([MehfilHistory.monthKey(now),...history.recentMonths()])].sort().reverse();
 if([...month.options].map(o=>o.value).join('|')!==months.join('|')){
  month.replaceChildren();for(const key of months){const [y,m]=key.split('-').map(Number);const option=document.createElement('option');option.value=key;option.textContent=new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});month.append(option)}
 }
 selectedMemory=months.includes(prior)?prior:months[0];month.value=selectedMemory;
 const m=history.month(selectedMemory),body=$('memory-body');body.replaceChildren();
 const title=document.createElement('h2');const txt=document.createElement('p');
 if(!m.seconds){title.textContent='The best moments are ahead.';txt.textContent='Play your music and watch this space become your monthly listening memory.'}
 else{title.textContent=minutes(m.seconds)+' of music this month.';const best=m.topTracks[0];txt.textContent=best?'Your soundtrack: '+best.title+' — '+best.artist+'. '+(m.activeDays||1)+' listening days.':'Every play becomes part of your story.'}
 body.append(title,txt);
 const out=$('listening-bars');out.replaceChildren();const rows=[];
 for(let i=0;i<(period==='daily'?7:period==='weekly'?8:12);i++){
  const lag=(period==='daily'?6:period==='weekly'?7:11)-i;
  let d,label,val;
  if(period==='daily'){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-lag);label=d.toLocaleDateString(undefined,{weekday:'short'});val=history.day(MehfilHistory.dateKey(d)).seconds}
  else if(period==='weekly'){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7-7*lag);label=d.toLocaleDateString(undefined,{month:'short',day:'numeric'});val=history.week(MehfilHistory.dateKey(d)).seconds}
  else{d=new Date(now.getFullYear(),now.getMonth()-lag,1);label=d.toLocaleDateString(undefined,{month:'short'});val=history.month(MehfilHistory.monthKey(d)).seconds}
  rows.push({label,val});
 }
 const max=Math.max(1,...rows.map(r=>r.val));
 for(const row of rows){const line=document.createElement('div');line.className='bar-row';const label=document.createElement('span');label.textContent=row.label;const bar=document.createElement('div');bar.className='bar-track';const fill=document.createElement('div');fill.className='bar-value';fill.style.width=(row.val/max*100)+'%';bar.append(fill);const num=document.createElement('span');num.className='bar-time';num.textContent=minutes(row.val);line.append(label,bar,num);out.append(line)}
}
$('memory-month').onchange=e=>{selectedMemory=e.target.value;drawStory()};
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.classList.toggle('active',x===b));drawStory()});
function exportBackup(){
 const content=JSON.stringify({app:'Mehfil Aura',schema:6,history:history.exportData(),liked,overrides,rules,custom},null,2);
 const name='Mehfil-backup-'+new Date().toISOString().slice(0,10)+'.json';
 if(native&&AndroidBridge.exportBackup){AndroidBridge.exportBackup(content,name);return}
 const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),8000);notify('History backup saved.');
}
$('export-history').onclick=exportBackup;
$('import-history').onclick=()=>$('history-file').click();
$('history-file').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{const input=JSON.parse(await file.text());if(!input.history)throw Error('Not a Mehfil backup');history.importData(input.history);
  if(input.liked&&typeof input.liked==='object')Object.assign(liked,input.liked);
  if(input.overrides&&typeof input.overrides==='object')Object.assign(overrides,input.overrides);
  if(Array.isArray(input.rules)){rules.splice(0,rules.length,...input.rules.slice(0,150))}
  if(Array.isArray(input.custom)){custom.splice(0,custom.length,...input.custom.slice(0,50))}
  save('mehfil_favorites_v1',liked);save('mehfil_overrides_v1',overrides);save('mehfil_learned_rules_v1',rules);save('mehfil_custom_playlists_v1',custom);reclassify();notify('Your listening history and playlists have been restored.');
 }catch(e){notify('Cannot restore backup: '+e.message)}
 e.target.value='';
};
function receive(input){
 let songs=input;if(typeof songs==='string'){try{songs=JSON.parse(songs)}catch(e){notify('Scan returned invalid music data.');return}}
 if(!Array.isArray(songs))return;
 const seen=new Set();tracks=songs.map(fix).filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true});
 tracks.sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base',numeric:true}));
 loading=false;renderAll();if(native)nativeQueue();
 notify('Found '+tracks.length+' songs · '+tracks.filter(x=>x.categories.includes('other')).length+' may need sorting.');
 if(currentPage==='home'&&!tracks.length)pageTo('library');
}
let scanBuffer=[];
window.Mehfil={
 receiveSongs:receive,
 beginScan:()=>{scanBuffer=[];notify('Searching your music library…')},
 receiveChunk:payload=>{try{const batch=JSON.parse(payload);if(Array.isArray(batch))scanBuffer.push(...batch)}catch(e){notify('A scan batch could not be read.')}},
 endScan:()=>{receive(scanBuffer);scanBuffer=[]},
 onScanNotice:m=>notify(m),
 onPermissionDenied:()=>notify('Please allow Music and audio access in Android settings.'),
 onPlayerError:m=>{loading=false;notify('Cannot play this track: '+m)},
 onPlaying:()=>{loading=false;setTimeout(syncNative,350)},
 onServiceState:()=>setTimeout(syncNative,250),
 onBackupSaved:m=>notify(m)
};
function scanMusic(){
 if(native){try{AndroidBridge.requestAndScan();notify('Scanning device audio…')}catch(e){notify('Scan failed: '+e.message)}}
 else{$('folder-picker').click();notify('Select an audio folder on your device.')}
}
function id3text(data){
 if(data.length<2)return'';
 const type=data[0];let bytes=data.slice(1);
 try{
  if(type===1||type===2){const odd=bytes.length%2;if(odd)bytes=bytes.slice(0,-1);
   let le=type===1;if(bytes[0]===254&&bytes[1]===255){le=false;bytes=bytes.slice(2)}else if(bytes[0]===255&&bytes[1]===254){le=true;bytes=bytes.slice(2)}
   if(!le){const copy=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i+=2){copy[i]=bytes[i+1];copy[i+1]=bytes[i]}bytes=copy}
   return new TextDecoder('utf-16le').decode(bytes).replace(/\0/g,'').trim().slice(0,250);
  }
  return new TextDecoder(type===0?'iso-8859-1':'utf-8').decode(bytes).replace(/\0/g,'').trim().slice(0,250);
 }catch(e){return''}
}
async function metadata(file){
 if(!/\.mp3$/i.test(file.name))return{};
 const tags={};try{
  const raw=new Uint8Array(await file.slice(0,160000).arrayBuffer());
  if(raw.length<14||String.fromCharCode(...raw.slice(0,3))!=='ID3')return tags;
  const ver=raw[3];if(ver<3||ver>4)return tags;
  const length=((raw[6]&127)<<21)|((raw[7]&127)<<14)|((raw[8]&127)<<7)|(raw[9]&127);
  const end=Math.min(raw.length,10+length);let i=10;
  while(i+10<=end){
   const name=String.fromCharCode(...raw.slice(i,i+4));if(!/^[A-Z0-9]{4}$/.test(name))break;
   const len=ver===4?((raw[i+4]&127)<<21)|((raw[i+5]&127)<<14)|((raw[i+6]&127)<<7)|(raw[i+7]&127):((raw[i+4]*16777216)+(raw[i+5]<<16)+(raw[i+6]<<8)+raw[i+7]);
   i+=10;if(len<1||i+len>end)break;
   const map={TIT2:'title',TPE1:'artist',TALB:'album',TCON:'genre'};
   if(map[name]&&!tags[map[name]])tags[map[name]]=id3text(raw.slice(i,i+len));
   i+=len;
  }
 }catch(e){}return tags;
}
async function webImport(files){
 const audios=Array.from(files||[]).filter(f=>f.type.startsWith('audio/')||/\.(mp3|m4a|aac|ogg|wav|flac|opus|wma)$/i.test(f.name));
 if(!audios.length){notify('No audio files found in this selection.');return}
 notify('Reading '+audios.length+' audio files…');
 const list=[];for(let i=0;i<audios.length;i+=15){
  const batch=await Promise.all(audios.slice(i,i+15).map(async file=>{
   const tags=await metadata(file);
   return {id:'web:'+file.webkitRelativePath+':'+file.name+':'+file.size+':'+file.lastModified,uri:null,name:file.name,title:tags.title||file.name.replace(/\.[^.]+$/,''),artist:tags.artist||'',album:tags.album||'',genre:tags.genre||'',path:file.webkitRelativePath||file.name,file,duration:0}
  }));list.push(...batch);
 }
 receive(list);pageTo('library');
}
$('folder-picker').onchange=e=>webImport(e.target.files);
$('file-picker').onchange=e=>webImport(e.target.files);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e});
$('install-web').onclick=async()=>{
 if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();return}
 notify('In your browser menu, choose Install app or Add to Home screen.');
};
if(native){$('apk-download').parentElement.classList.add('hidden')}
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
let h=new Date().getHours();$('greeting').innerHTML=h<12?'Good morning,<br><em>your mehfil.</em>':h<17?'Good afternoon,<br><em>your mehfil.</em>':'Good evening,<br><em>your mehfil.</em>';
renderAll();changeMode();if(native)setTimeout(scanMusic,350);
})();