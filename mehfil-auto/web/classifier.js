/* Mehfil Auto • local rule-based library classification (no uploads, no AI claims).
   Classify EVERY indexed audio track: semantic themes + dynamic artists/albums/folders.
   Matching is intentionally conservative, and an Other/Review playlist is retained. */
(function(root){
'use strict';
const PRESETS=[
 ['allah','Allah & Hamd','☪','Praise, remembrance and Hamd'],
 ['nabi','Nabi ﷺ & Naat','✦','Naat, Madina and Durood'],
 ['khwaja','Khwaja Garib Nawaz','✧','Ajmer and Chishti kalaam'],
 ['data','Data & Ghaus','❖','Ghaus-e-Azam and Data'],
 ['ali','Ali & Qalandar','◈','Moula Ali and Qalandar'],
 ['ahl','Ahl-e-Bait','☾','Panjtan and Karbala'],
 ['quran','Quran & Tilawat','۞','Surahs, Quran recitation'],
 ['dua','Dua & Zikr','🤲','Dua, dhikr and supplications'],
 ['manqabat','Manqabat','✧','Praise for revered personalities'],
 ['qawwali','Qawwali & Sufi','♫','Qawwali and Sama'],
 ['ghazal','Ghazal & Shayari','❦','Ghazal and classical poetry'],
 ['nasheed','Nasheed','♪','Spiritual vocals and nasheeds'],
 ['marsiya','Noha & Marsiya','☾','Elegies and marsiya'],
 ['bayan','Bayan & Lectures','⌁','Religious talks and lectures'],
 ['folk','Folk & Regional','♮','Folk and regional music'],
 ['instrumental','Instrumental','♬','Instrument-only recordings'],
 ['nusrat','Nusrat Fateh Ali Khan','♬','Legendary performances'],
 ['aziz','Aziz Mian','♬','Live qawwali classics'],
 ['sabri','Sabri Brothers','♬','Ghulam Farid, Maqbool and Amjad'],
 ['farid','Farid Ayaz & Abu Muhammad','♬','Classical qawwali'],
 ['reshma','Reshma','♬','Folk classics'],
 ['sartaj','Satinder Sartaaj','♬','Punjabi poetry and songs']
];
const RULES={
 allah:[/\b(allah|allah hu|hamd|khuda|khudaya|ya rab|ya rabb|rabbul|ya ilahi|subhanallah|alhamdulillah|parwardigar|bari taala|maabood)\b/u,/اللہ|الله|الحمد|خدا|رب|پروردگار|अल्लाह|खुदा|हम्द|रब(?:्|\b)/u],
 nabi:[/\b(nabi|rasool|rasul|rasoolallah|muhammad|mohammad|mustafa|madina|madine|madinah|naat|durood|darood|salawat|sallallah|taiba|taibah|tajdar e haram|bhar do jholi|sarkar e do alam|aamina ke laal|rehamat ul aalameen)\b/u,/محمد|محمّد|مصطفی|رسول|نبی|مدینہ|درود|نعت|मदीना|मदीने|नबी|मुहम्मद|मोहम्मद|मुस्तफा|नात/u],
 khwaja:[/\b(khwaja|khaja|khwajah|gharib nawaz|garib nawaz|gareeb nawaz|ajmer|chishti|chishtiya|khwajagaan|moinuddin|moin ud din)\b/u,/خواجہ|غریب نواز|چشتی|अजमेर|ख्वाजा|गरीब नवाज/u],
 data:[/\b(data sahib|daata|data darbar|ghaus|ghous|ghause azam|ghous e azam|ghaus e azam|ganj bakhsh|jilani|jeelani|peerane peer|pirane pir|baghdad|ali hajweri|hajveri)\b/u,/داتا|غوث|گیلانی|गौस|दातागंज/u],
 ali:[/\b(ali|haider|haydar|qalandar|kalandar|shahbaz|maula ali|moula ali|mushkil kusha|damadam mast|dama dam mast)\b/u,/علی|حیدر|قلندر|अली|हैदर|क़लंदर|कलंदर/u],
 ahl:[/\b(hussain|husain|hussein|hasan|hassan|karbala|fatima|fatimah|panjtan|ahl e bait|ahle bait|abbas alamdar|ya zahra|shah e karbala)\b/u,/حسین|حسن|کربلا|فاطمہ|اہل بیت|हुसैन|कर्बला|फातिमा/u],
 quran:[/\b(quran|qur'an|quraan|tilawat|tilawah|surah|surat|sura|ayat ul kursi|ayatul kursi|al fatiha|al mulk|yaseen|yasin|sur e rahman|surah rahman|recitation)\b/u,/القرآن|قرآن|سورة|سورۃ|تلاوت|क़ुरआन|कुरान|सूरह/u],
 dua:[/\b(dua|duaa|du'a|zikr|dhikr|azkar|adhkar|istighfar|astaghfirullah|tasbeeh|tasbih|supplication)\b/u,/دعا|ذکر|اذکار|استغفار|दुआ|ज़िक्र|जिक्र/u],
 manqabat:[/\b(manqabat|manqib|munqabat|munajat|mankabat)\b/u,/منقبت|مناجات|मनकबत|मनक़बत/u],
 qawwali:[/\b(qawwali|qawwal|qawali|quwwali|sama|sufiana|mehfil e sama|qawaali)\b/u,/قوالی|قوّالی|سماع|कव्वाली|क़व्वाली/u],
 ghazal:[/\b(ghazal|gazal|ghalib|jagjit|mehdi hassan|mehedi hassan|farida khanum|begum akhtar|shayari|nazm|urdu poetry)\b/u,/غزل|شاعری|ग़ज़ल|गजल|शायरी/u],
 nasheed:[/\b(nasheed|nasid|nashid|anashid|naseed|islamic vocal)\b/u,/نشید|أناشيد|नशीद/u],
 marsiya:[/\b(noha|nauha|marsiya|matam|salam e karbala|soz khwani)\b/u,/نوحہ|مرثیہ|मर्सिया|नौहा/u],
 bayan:[/\b(bayan|bayaan|lecture|khutba|khutbah|taqreer|waaz|wa'z|islamic speech)\b/u,/بیان|خطبہ|تقریر|बयान|तक़रीर/u],
 folk:[/\b(folk|lok geet|lokgit|bulleh shah|punjabi folk|sufi folk|lok sangeet)\b/u,/लोकगीत|लोक गीत|لوک گیت/u],
 instrumental:[/\b(instrumental|piano|violin solo|flute solo|sitar solo|harmonium solo|tabla solo|no vocals)\b/u,/इंस्ट्रुमेंटल/u],
 nusrat:[/\b(nusrat|nfak|fateh ali khan)\b/u,/نصرت فتح|नुसरत फतेह/u],
 aziz:[/\b(aziz mian|aziz miyan|aziz ali|aziz qawwal)\b/u,/عزیز میاں|अज़ीज़ मियाँ|अजीज मियां/u],
 sabri:[/\b(sabri|amjad sabri|ghulam farid sabri|maqbool sabri)\b/u,/صابری|صابری برادران|अमजद साबरी|साबरी/u],
 farid:[/\b(farid ayaz|fareed ayaz|abu muhammad qawwal|abu muhammad)\b/u,/فرید ایاز|फ़रीद अयाज़/u],
 reshma:[/\b(reshma|lambi judai)\b/u,/ریشما|रेशमा/u],
 sartaj:[/\b(satinder sartaaj|satinder sartaj|sartaaj|satinder)\b/u,/सतिंदर सरताज/u]
};
function clean(s){return String(s??'').normalize('NFKC').replace(/[\u0300-\u036f\u064b-\u065f]/g,'').replace(/[_.\-–—]+/g,' ').replace(/\.(mp3|flac|wav|m4a|aac|ogg|opus|wma|alac)$/i,'').replace(/\s+/g,' ').toLowerCase().trim();}
function isKnown(s){const x=clean(s);return x && !/^(<unknown>|unknown|unknown artist|various artists|none|null|untitled|track|music|audio|no artist|artist)$/i.test(x);}
function shortName(s,max=65){return String(s||'').trim().replace(/[\x00-\x1f]/g,'').slice(0,max);}
function slug(s){const ascii=clean(s).replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,80);return ascii || 'unknown';}
const specials=[['nusrat','Nusrat Fateh Ali Khan'],['aziz','Aziz Mian'],['sabri','Sabri Brothers'],['farid','Farid Ayaz & Abu Muhammad'],['reshma','Reshma'],['sartaj','Satinder Sartaaj']];
const arts=new Set(specials.map(x=>x[0]));
function likelyArtistFromFile(s){let t=String(s.title||s.name||'').replace(/\.[a-z0-9]{2,5}$/i,'');const x=t.match(/^(.{3,60}?)\s+[-–—|]\s+(.{3,100})$/);if(!x)return '';const a=shortName(x[1]);if(/^(track|song|audio|unknown|part \d+)$/i.test(a))return ''; // Only trust known performers, never confuse song titles with artist names.
for(const [k,label] of specials)if(RULES[k].some(p=>p.test(clean(a))))return label;return '';
}
function detect(s){const title=String(s.title||s.name||''),artist=String(s.artist||''),album=String(s.album||''),path=String(s.path||'');const semanticText=clean([title,s.name,album,s.genre].join(' '));const artistText=clean([artist,title,s.name,path].join(' '));const categories=[];
for(const [key,patterns] of Object.entries(RULES))if(patterns.some(rx=>rx.test(arts.has(key)?artistText:semanticText)))categories.push(key);
const semantic=categories.some(k=>!arts.has(k));
if(!semantic)categories.push('other');
const actualArtist=isKnown(artist)?shortName(artist,110):likelyArtistFromFile(s);
if(actualArtist){categories.push('artist:'+slug(actualArtist));}
if(isKnown(album))categories.push('album:'+slug(album));
let folder=path.replace(/\\/g,'/').replace(/^content:\/\//,'').split('/').filter(Boolean);
if(folder.length>1){let f=folder[folder.length-2];if(isKnown(f)&&!/^\d+$/.test(f))categories.push('folder:'+slug(f));}
return {categories:[...new Set(categories)],semantic,artist:actualArtist||'Unknown artist',album:isKnown(album)?album:'',folder:folder.length>1?folder[folder.length-2]:''};
}
function buildCategories(tracks){const counts=new Map(), labels=new Map();for(const t of tracks){for(const key of t.categories||[]){counts.set(key,(counts.get(key)||0)+1);if(key.startsWith('artist:'))labels.set(key,t.artist);if(key.startsWith('album:'))labels.set(key,t.album);if(key.startsWith('folder:'))labels.set(key,t.folder);}}const presets=PRESETS.filter(([k])=>counts.has(k)).map(x=>({...toObj(x),count:counts.get(x[0]),group:'curated'}));if(counts.has('other'))presets.push({id:'other',title:'Other / Review',icon:'◇',description:'Tracks without a confident theme',count:counts.get('other'),group:'curated'});
const dyn=[];for(const [key,count]of counts)if(key.includes(':')){const kind=key.split(':')[0],label=shortName(labels.get(key)||key.slice(kind.length+1));dyn.push({id:key,title:label,icon:kind==='artist'?'♬':kind==='album'?'▣':'▤',description:kind==='artist'?'Artist':kind==='album'?'Album':'Folder',count,group:kind});}
dyn.sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'}));return presets.concat(dyn);}
function toObj(x){return {id:x[0],title:x[1],icon:x[2],description:x[3]};}
root.MehfilClassifier={detect,buildCategories,PRESETS,RULES,clean,isKnown,slug};
if(typeof module==='object'&&module.exports)module.exports=root.MehfilClassifier;
})(typeof window!=='undefined'?window:globalThis);
