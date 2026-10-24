/* Mehfil Aura v5: genre browser, user-taught keyword rules, Lark-style player and queue. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const read=(key)=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}};
const rules=read('mehfil_learned_rules_v1'),custom=read('mehfil_custom_playlists_v1');
let sort='az',limit=120,shuffle=false,repeat='all',expandGenres=false,totalShown=0;
const desk=document.createElement('section');desk.className='music-desk';desk.id='music-desk';
desk.innerHTML="<div class='eyebrow'>YOUR LIBRARY, YOUR RULES</div><h2>Explore your music <span class='gold'>✦</span></h2><div class='desk-tabs'><button data-mehtab='songs'>♫ Songs</button><button data-mehtab='playlists'>▣ Playlists</button><button data-mehtab='artists'>♬ Artists</button><button data-mehtab='albums'>▤ Albums</button><button data-mehtab='genres'>◈ Genres</button><button data-mehtab='folders'>▥ Folders</button><button data-mehtab='review'>◇ Review</button></div><div class='desk-actions'><button class='btn' id='desk-shuffle'>⇄ Shuffle</button><button class='btn alt' id='desk-teach'>✧ Teach Mehfil</button><button class='btn alt' id='desk-custom'>＋ Playlist</button><button class='btn alt' id='desk-refresh'>↻ Sort again</button><select id='desk-sort' aria-label='Sort songs'><option value='az'>A–Z</option><option value='za'>Z–A</option><option value='artist'>Artist</option><option value='long'>Longest</option></select></div><p class='muted small'>All accessible songs stay visible. Teach Mehfil unfamiliar title words; they will match future scans.</p>";
document.querySelector('.banner').after(desk);
const genres=document.createElement('section');genres.id='genre-section';genres.innerHTML="<div class='section-heading'><h2>All genres</h2><button class='btn alt' id='desk-genres'>Show all</button></div><div id='desk-genre-list' class='categories compact-categories'></div>";
el('dynamic-folders').after(genres);
const modal=document.createElement('section');modal.id='desk-teach-modal';modal.className='modal hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
modal.innerHTML="<div class='desk-teach-card'><h2>Teach Mehfil ✧</h2><p class='muted'>Choose a phrase in a song title, filename, album or folder. It will be applied to other matching songs automatically.</p><label>Keyword<input id='desk-word' maxlength='90' placeholder='Example: Sarkar e Madina'></label><label>Category<select id='desk-category'></select></label><p id='desk-learn-status' class='small' aria-live='polite'></p><div class='modal-actions'><button class='btn alt' id='desk-close'>Close</button><button class='btn' id='desk-learn'>Save rule</button></div><div id='desk-rules' class='desk-rules'></div></div>";
document.body.append(modal);
const sheet=document.createElement('section');sheet.id='desk-now';sheet.className='desk-now hidden';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Music player');
sheet.innerHTML="<div class='desk-now-inner'><div class='desk-now-top'><span class='eyebrow'>MEHFIL AURA · NOW PLAYING</span><button id='desk-minimize'>↓ Minimize</button></div><div class='desk-record'><span>MEHFIL</span><small>YOUR KALAAM, YOUR STORY</small></div><h2 id='desk-song'>Nothing playing</h2><p class='muted' id='desk-artist'>Choose a song</p><input id='desk-seek' type='range' class='progress' min='0' max='1000' value='0'><div class='desk-times'><span id='desk-elapsed'>0:00</span><span id='desk-duration'>0:00</span></div><div class='desk-buttons'><button id='desk-mode-shuffle'>⇄</button><button id='desk-back'>⏮</button><button id='desk-play' class='desk-main'>▶</button><button id='desk-forward'>⏭</button><button id='desk-mode-repeat'>↻</button></div><div class='desk-now-actions'><button id='desk-fav'>♡ Favorite</button><button id='desk-queue-toggle'>☷ Up next</button></div><div class='desk-queue hidden' id='desk-queue'></div></div>";
document.body.append(sheet);
const oldFix=fix;
fix=function(s){
 const t=oldFix(s),id=t.id,detected=MehfilClassifier.detect(s,{rules});
 if(!Object.prototype.hasOwnProperty.call(overrides,id))t.categories=detected.categories;
 else t.categories=[...new Set([...(Array.isArray(overrides[id])?overrides[id]:[]),...detected.categories.filter(x=>/^(artist|album|genre|folder):/.test(x))])];
 if(t.categories.some(x=>x!=='other'&&!x.includes(':')&&!MehfilClassifier.ARTISTS.has(x)))t.categories=t.categories.filter(x=>x!=='other');
 else if(!t.categories.includes('other'))t.categories.push('other');
 t.genre=detected.genre;t.artist=detected.artist;t.album=detected.album;t.folder=detected.folder;t.confidence=detected.confidence;
 return t;
};
const oldCats=renderCats;
renderCats=function(){
 oldCats();const entries=MehfilClassifier.buildCategories(tracks,custom);
 CATS=entries.map(e=>[e.id,e.title,e.icon,e.description]);
 fillGroup('categories',CATS.filter(x=>!x[0].includes(':')),99,true,'curated-toggle');
 fillGroup('desk-genre-list',CATS.filter(x=>x[0].startsWith('genre:')),8,expandGenres,'desk-genres');
 el('collectionCount').textContent=entries.length+' playlists · '+tracks.length+' tracks';
};
el('desk-genres').onclick=()=>{expandGenres=!expandGenres;renderCats()};
const oldSelect=select;select=function(id){limit=120;oldSelect(id)};
function fullSelection(){
 const out=tracks.filter(t=>(selected==='all'||selected==='favorites'&&liked[t.id]||selected==='unclassified'&&t.categories.includes('other')||t.categories.includes(selected))&&n([t.title,t.artist,t.album,t.name,t.folder,t.genre].join(' ')).includes(q));
 if(sort==='za')out.sort((a,b)=>b.title.localeCompare(a.title));
 if(sort==='artist')out.sort((a,b)=>a.artist.localeCompare(b.artist)||a.title.localeCompare(b.title));
 if(sort==='long')out.sort((a,b)=>b.duration-a.duration);
 return out;
}
selectedTracks=function(){const all=fullSelection();totalShown=all.length;return all.slice(0,limit)};
const oldList=renderList;
renderList=function(){
 oldList();el('track-count').textContent=totalShown+' tracks';
 if(totalShown>limit){const more=document.createElement('button');more.className='desk-more';more.textContent='Show more · '+(totalShown-limit)+' remaining';more.onclick=()=>{limit+=120;renderList()};el('song-list').append(more);}
};
editTrack=function(t){
 editing=t;el('edit-title').textContent=t.title;el('edit-checks').replaceChildren();
 for(const [id,title] of CATS.filter(x=>!/^(artist|album|genre|folder):/.test(x[0]))){const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.value=id;check.checked=t.categories.includes(id);label.append(check,document.createTextNode(title));el('edit-checks').append(label)}
 el('editor').classList.remove('hidden');
};
el('edit-save').onclick=()=>{
 if(!editing)return;let picked=[...el('edit-checks').querySelectorAll('input:checked')].map(x=>x.value);
 if(picked.some(x=>x!=='other'))picked=picked.filter(x=>x!=='other');
 const dyn=editing.categories.filter(x=>/^(artist|album|genre|folder):/.test(x));editing.categories=[...new Set([...picked,...dyn])];
 if(!picked.length)editing.categories.push('other');
 overrides[editing.id]=picked;localStorage.setItem('mehfil_overrides_v1',JSON.stringify(overrides));el('editor').classList.add('hidden');renderCats();renderList();
};
function reclassify(){tracks=tracks.map(fix);update();msg(tracks.length+' songs organized. '+tracks.filter(t=>t.categories.includes('other')).length+' still need review.');}
el('desk-refresh').onclick=reclassify;
el('desk-sort').onchange=e=>{sort=e.target.value;limit=120;renderList()};
el('search').addEventListener('input',()=>{limit=120},true);
el('desk-custom').onclick=()=>{
 const title=prompt('New playlist name:');if(!title||!title.trim())return;
 if(custom.length>=60){msg('Playlist limit: 60.');return;}
 const id='custom:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);custom.push({id,title:title.trim().slice(0,48)});
 localStorage.setItem('mehfil_custom_playlists_v1',JSON.stringify(custom));renderCats();select(id);msg('Playlist created. Tap Edit on any track to add it.');
};
function renderRules(){
 const node=el('desk-rules');node.replaceChildren();
 for(const rule of rules){const row=document.createElement('div');row.className='desk-rule';const span=document.createElement('span');span.textContent=rule.term+' → '+rule.category;
 const del=document.createElement('button');del.textContent='Remove';del.onclick=()=>{const i=rules.indexOf(rule);if(i>=0){rules.splice(i,1);localStorage.setItem('mehfil_learned_rules_v1',JSON.stringify(rules));renderRules();reclassify()}};
 row.append(span,del);node.append(row);}
}
el('desk-teach').onclick=()=>{
 const s=el('desk-category');s.replaceChildren();
 for(const x of MehfilClassifier.PRESETS.concat(custom.map(c=>[c.id,c.title]))){const o=document.createElement('option');o.value=x[0];o.textContent=x[1];s.append(o)}
 renderRules();modal.classList.remove('hidden');el('desk-word').focus();
};
el('desk-close').onclick=()=>modal.classList.add('hidden');
el('desk-learn').onclick=()=>{
 const term=el('desk-word').value.trim(),category=el('desk-category').value;
 if(term.length<2||term.length>90||rules.length>=150){el('desk-learn-status').textContent='Use a 2–90 character phrase (150-rule limit).';return;}
 if(rules.some(x=>MehfilClassifier.clean(x.term)===MehfilClassifier.clean(term)&&x.category===category)){el('desk-learn-status').textContent='Rule already exists.';return;}
 rules.push({term,category});localStorage.setItem('mehfil_learned_rules_v1',JSON.stringify(rules));el('desk-word').value='';el('desk-learn-status').textContent='Saved! Your library has been reorganized.';renderRules();reclassify();
};
for(const btn of document.querySelectorAll('[data-mehtab]'))btn.onclick=()=>{
 const k=btn.dataset.mehtab;
 if(k==='songs'){select('all');return}if(k==='review'){select('unclassified');return}
 const dest={playlists:'categories',artists:'dynamic-artists',albums:'dynamic-albums',genres:'genre-section',folders:'dynamic-folders'}[k];el(dest)?.scrollIntoView({behavior:'smooth',block:'start'});
};
skip=function(dir){
 const all=fullSelection().length?fullSelection():tracks;if(!all.length)return;
 const idx=all.findIndex(t=>t.id===playingId);
 if(shuffle&&all.length>1){const k=1+Math.floor(Math.random()*(all.length-1));playTrack(all[(idx+k+all.length)%all.length]);return}
 playTrack(all[(idx+dir+all.length)%all.length]);
};
function modes(){
 webAudio.loop=repeat==='one';if(native){if(AndroidBridge.setShuffle)AndroidBridge.setShuffle(shuffle);if(AndroidBridge.setRepeat)AndroidBridge.setRepeat(repeat)}
 el('desk-mode-shuffle').classList.toggle('enabled',shuffle);el('desk-mode-repeat').classList.toggle('enabled',repeat!=='all');
 el('desk-mode-repeat').textContent=repeat==='one'?'↻¹':repeat==='off'?'→':'↻';
}
el('desk-mode-shuffle').onclick=()=>{shuffle=!shuffle;modes()};
el('desk-mode-repeat').onclick=()=>{repeat=repeat==='all'?'one':repeat==='one'?'off':'all';modes()};
el('desk-shuffle').onclick=()=>{if(!tracks.length){msg('Scan your audio files first.');return}shuffle=true;modes();playTrack(tracks[Math.floor(Math.random()*tracks.length)])};
el('desk-minimize').onclick=()=>sheet.classList.add('hidden');
el('now-title').onclick=()=>{paintPlayer();sheet.classList.remove('hidden')};
el('desk-play').onclick=()=>{toggle();paintPlayer()};
el('desk-back').onclick=()=>{skip(-1);paintPlayer()};
el('desk-forward').onclick=()=>{skip(1);paintPlayer()};
el('desk-fav').onclick=()=>{const t=current();if(!t)return;liked[t.id]=!liked[t.id];localStorage.setItem('mehfil_favorites_v1',JSON.stringify(liked));renderList();paintPlayer()};
el('desk-queue-toggle').onclick=()=>{el('desk-queue').classList.toggle('hidden');paintQueue()};
el('desk-seek').onchange=e=>{const bar=el('seek');bar.value=e.target.value;bar.onchange({target:bar})};
sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){modal.classList.add('hidden');sheet.classList.add('hidden')}});
function paintPlayer(){
 const t=current(),s=playerState();el('desk-song').textContent=t?.title||'Nothing playing';el('desk-artist').textContent=t?.artist||'Choose a song';
 el('desk-elapsed').textContent=format(s.position);el('desk-duration').textContent=format(s.duration);
 if(s.duration>0)el('desk-seek').value=Math.max(0,Math.min(1000,Math.round(s.position/s.duration*1000)));
 el('desk-play').textContent=s.playing?'Ⅱ':'▶';el('desk-fav').textContent=t&&liked[t.id]?'♥ Liked':'♡ Favorite';
 if(!el('desk-queue').classList.contains('hidden'))paintQueue();
}
function paintQueue(){
 const node=el('desk-queue');node.replaceChildren();const songs=fullSelection().length?fullSelection():tracks;const ix=songs.findIndex(t=>t.id===playingId);
 const list=songs.slice(Math.max(0,ix-3),Math.max(32,ix+30));
 for(const t of list){const row=document.createElement('button');row.className='desk-queue-row'+(t.id===playingId?' active':'');
 const name=document.createElement('strong');name.textContent=t.title;const artist=document.createElement('span');artist.textContent=t.artist;
 row.append(name,artist);row.onclick=()=>{playTrack(t);paintPlayer()};node.append(row)}
}
setInterval(()=>{if(!sheet.classList.contains('hidden'))paintPlayer()},1200);modes();
})();