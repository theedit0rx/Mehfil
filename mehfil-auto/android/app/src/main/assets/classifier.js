/* MEHFIL AURA – category engine v5.
   No audio transcription, upload, or remote classifier.
   Evidence: title, raw filename, artist, album, genre, parent folder,
   plus explicit user-learned rules. A song may belong to many themes. */
(function(root){
'use strict';
const PRESETS=[
 ['allah','Allah & Hamd','☪','Hamd, Allah and divine remembrance'],
 ['nabi','Nabi ﷺ & Naat','✦','Naat, Madina, Durood and Milad'],
 ['khwaja','Khwaja Garib Nawaz','✧','Ajmer Sharif and Chishti kalaam'],
 ['data','Data & Ghaus','❖','Data Sahib and Ghaus-e-Azam'],
 ['ali','Ali & Qalandar','◈','Maula Ali and Qalandar'],
 ['ahl','Ahl-e-Bait','☾','Panjtan, Karbala and Ahle Bait'],
 ['quran','Quran & Tilawat','۞','Surahs and recitation'],
 ['dua','Dua & Zikr','✴','Dua, dhikr, tasbeeh'],
 ['manqabat','Manqabat','✧','Manqabat for the awliya'],
 ['qawwali','Qawwali & Sufi','♫','Qawwali, sama and Sufi kalaam'],
 ['ghazal','Ghazal & Shayari','❦','Ghazal, poetry and nazm'],
 ['nasheed','Nasheed','♪','Nasheeds and spiritual vocals'],
 ['marsiya','Noha & Marsiya','☾','Noha, marsiya and soz'],
 ['bayan','Bayan & Lectures','⌁','Taqreer, khutba and talks'],
 ['folk','Folk & Regional','♮','Regional folk and geet'],
 ['instrumental','Instrumental','♬','Instrument-only music'],
 ['nusrat','Nusrat Fateh Ali Khan','♬','Nusrat performances'],
 ['aziz','Aziz Mian','♬','Aziz Mian recordings'],
 ['sabri','Sabri Brothers','♬','Sabri recordings'],
 ['farid','Farid Ayaz & Abu Muhammad','♬','Classical qawwali'],
 ['reshma','Reshma','♬','Reshma classics'],
 ['sartaj','Satinder Sartaaj','♬','Satinder Sartaaj']
];
const TERMS={
 allah:['allah','allaah','allahu','allah hu','allaho','allah hoo','ya allah','allah ke','hamd','hamad','khuda','khudaya','khudawand','khudavand','rabb','rab','rabbul','ya rab','ya rabb','subhanallah','alhamdulillah','parwardigar','bari tala','bari taala','mabood','maabood','ya ilahi','sana e ilahi','رب','اللہ','الله','الحمد','خدا','پروردگار','अल्लाह','खुदा','हम्द','रब'],
 nabi:['nabi','nabi pak','nabee','nabiyy','rasool','rasul','rasulallah','rasoolallah','rasul e pak','rasool e paak','muhammad','mohammad','mohammed','mohamed','mustafa','musta fa','madina','madinah','madine','madine wale','madni','makkah','makka','kaaba','naat','nat sharif','naat sharif','naat e pak','sarkar e madina','sarkar do alam','sarkar e do alam','sarwar e konain','aamina ke laal','durood','darood','durud','salawat','sallallah','sallallahu','taiba','taibah','tajdar e haram','tajdar e madina','bhar do jholi','milad','meelad','rabi ul awwal','rehamat ul aalameen','rahmatul lil aalameen','sarkar ka karam','مصطفی','محمد','محمّد','رسول','نبی','مدینہ','درود','نعت','میلاد','मदीना','मदीने','नबी','मोहम्मद','मुहम्मद','मुस्तफा','नात','रसूल'],
 khwaja:['khwaja','khwajah','khaja','khwaja garib','khwaja gareeb','garib nawaz','gareeb nawaz','gharib nawaz','garib navaz','gareeb nawaaz','ajmer','ajmer sharif','chishti','chishtiya','chishty','moinuddin','moin ud din','moeinuddin','moinuddeen','khwajagaan','sultan e hind','خواجہ','غریب نواز','چشتی','معین الدین','अजमेर','ख्वाजा','ख़्वाजा','गरीब नवाज'],
 data:['data sahib','data saab','data darbar','data ganj','daata','datar','ghaus','ghous','gaus e azam','gaus paak','ghause azam','ghous e azam','ghaus e azam','ghaus paak','ganj bakhsh','ganj baksh','jilani','jeelani','jilaani','gilani','peeran e peer','peerane peer','pirane pir','baghdad','hajveri','hajweri','علی ہجویری','داتا','غوث','گیلانی','गौस','ग़ौस','दाता गंज'],
 ali:['ali','moula ali','maula ali','mola ali','mawla ali','haider','haydar','haidar','qalandar','kalandar','shahbaz','lal shahbaz','damadam mast','dama dam mast','mushkil kusha','ya ali','علی','حیدر','قلندر','अली','हैदर','क़लंदर','कलंदर'],
 ahl:['hussain','husain','hussein','imam hussain','hasan','hassan','karbala','karbla','fatima','fatimah','zahra','ya zahra','panjtan','panj tan','ahl e bait','ahle bait','ahlebait','abbas alamdar','alamdar','shabbir','shah e karbala','حسین','حسن','کربلا','فاطمہ','اہل بیت','हुसैन','कर्बला','फातिमा','पंजतन'],
 quran:['quran','qur an','qur aan','quraan','alquran','holy quran','tilawat','tilaawat','tilawah','qirat','qiraat','surah','surat','sura','ayatul kursi','ayat ul kursi','yaseen','yasin','surah rahman','surah rehman','surah mulk','surah fatiha','surah ikhlas','recitation','قرآن','القرآن','سورۃ','سورة','تلاوت','कुरान','क़ुरआन','सूरह','तिलावत'],
 dua:['dua','duaa','dua e','doa','zikr','dhikr','zikir','zikar','azkar','adhkar','istighfar','astaghfirullah','tasbeeh','tasbih','wazifa','wazifah','supplication','masnoon dua','دعا','ذکر','اذکار','استغفار','दुआ','ज़िक्र','जिक्र','तस्बीह'],
 manqabat:['manqabat','mankabat','munqabat','manqabath','manqib','manaqib','munajat','auliya','awliya','wali allah','اولیاء','منقبت','مناجات','मनकबत','मनक़बत'],
 qawwali:['qawwali','qawali','kawwali','qawaali','qawaali','qawwal','qawwaal','qaval','quwwali','qawwalis','sufi','sufiana','sufiyani','sama','sama mehfil','samaa','mehfil e sama','قوالی','قوّالی','سماع','कव्वाली','क़व्वाली','सूफी'],
 ghazal:['ghazal','gazal','ghazals','ghalib','jagjit','mehdi hassan','mehedi hassan','farida khanum','begum akhtar','shayari','shaayari','nazm','urdu poetry','poetry','غزل','شاعری','ग़ज़ल','गजल','शायरी','नज़्म'],
 nasheed:['nasheed','nashid','nasid','naseed','anashid','islamic vocal','vocal only','نشید','أناشيد','नशीद'],
 marsiya:['noha','nauha','marsiya','marsia','matam','soz khwani','sozkhwani','salam e karbala','نوحہ','مرثیہ','मर्सिया','नौहा'],
 bayan:['bayan','bayaan','lecture','dars','khutba','khutbah','taqreer','taqrir','waaz','waz','waiz','islamic speech','religious speech','speech by','تقریر','خطبہ','بیان','बयान','तक़रीर','तकरीर'],
 folk:['folk','lok geet','lokgit','lok sangeet','bulleh shah','punjabi folk','sufi folk','punjabi song','bhojpuri','لوک گیت','लोकगीत','लोक गीत'],
 instrumental:['instrumental','piano','violin solo','flute solo','sitar solo','harmonium solo','tabla solo','no vocals','इंस्ट्रुमेंटल'],
 nusrat:['nusrat','nussrat','nfak','fateh ali khan','nusrath fateh','نصرت فتح','नुसरत फतेह'],
 aziz:['aziz mian','aziz miyan','aziz ali','aziz qawwal','عزیز میاں','अज़ीज़ मियाँ','अजीज मियां'],
 sabri:['sabri','sabrri','sabiri','amjad sabri','ghulam farid sabri','maqbool sabri','صابری','साबरी','अमजद साबरी'],
 farid:['farid ayaz','fareed ayaz','abu muhammad qawwal','abu muhammad','فرید ایاز','फरीद अयाज़'],
 reshma:['reshma','lambi judai','ریشما','रेशमा'],
 sartaj:['satinder sartaj','satinder sartaaj','sartaaj','sartaj','ستندر','सतिंदर सरताज']
};
const ARTISTS=new Set(['nusrat','aziz','sabri','farid','reshma','sartaj']);
const PERFORMERS=[['nusrat','Nusrat Fateh Ali Khan'],['aziz','Aziz Mian'],['sabri','Sabri Brothers'],['farid','Farid Ayaz & Abu Muhammad'],['reshma','Reshma'],['sartaj','Satinder Sartaaj']];
const EXCLUSIONS=/^(<unknown>|unknown|unknown artist|various artists|none|null|untitled|track|music|audio|no artist|artist|whatsapp audio|recording|voice note|downloads|download|songs|song)$/i;
function clean(value) {
 return String(value??'').normalize('NFKC').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u200c\u200d]/g,'')
  .replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_.\-–—\\/|()[\]{}!?@:]+/g,' ')
  .replace(/\.(mp3|flac|wav|m4a|aac|ogg|opus|wma|alac|amr)$/i,'')
  .replace(/\s+/g,' ').trim().toLowerCase();
}
function isKnown(s){const v=clean(s);return Boolean(v && !EXCLUSIONS.test(v)&& !/^track\s*\d+$/i.test(v));}
function shortName(s,max=75){return String(s||'').trim().replace(/[\x00-\x1f]/g,'').slice(0,max)}
function slug(s){return clean(s).replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,80)||'unknown'}
const PATTERNS=Object.fromEntries(Object.entries(TERMS).map(([k,arr])=>[k,arr.map(v=>clean(v)).filter(Boolean)]));
function tokenMatch(hay,term){
 if(!hay||!term)return false;
 // Word boundaries \b do not work for Unicode/Urdu/Devanagari.
 const i=hay.indexOf(term);
 if(i<0)return false;
 let at=i;
 while(at>=0){
  const before=at===0?' ':hay[at-1],after=at+term.length>=hay.length?' ':hay[at+term.length];
  if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;
  at=hay.indexOf(term,at+1);
 }
 return false;
}
function readableParent(path){
 let p=String(path||'').replace(/\\/g,'/');
 if(p.startsWith('content://'))return ''; // Document tree IDs aren't real directories.
 p=p.replace(/^\/+/,'');
 const bits=p.split('/').filter(Boolean);
 return bits.length>1?bits[bits.length-2]:'';
}
function likelyArtistFromFile(s){
 const raw=String(s.name||s.title||'').replace(/\.[a-z0-9]{2,5}$/i,'');
 const match=raw.match(/^(.{3,64}?)\s+[-–—|]\s+(.{3,100})$/);if(!match)return '';
 const leader=clean(match[1]);
 for(const [key,label] of PERFORMERS)if(PATTERNS[key].some(t=>tokenMatch(leader,t)))return label;
 return '';
}
function detect(s,options){
 options=options||{};
 const rawTitle=String(s.title||'');
 const fileName=String(s.name||'');
 const album=String(s.album||'');
 const genre=String(s.genre||'');
 const artist=String(s.artist||'');
 const parent=readableParent(s.path||s.relativePath||'');
 const parts=[
  [clean(rawTitle),3,'title'],
  [clean(fileName),3,'file'],
  [clean(album),2,'album'],
  [clean(genre),3,'genre'],
  [clean(parent),2,'folder']
 ];
 const performerTexts=[clean(artist),clean(rawTitle),clean(fileName)];
 const scores={};const reasons={};
 const push=(id,points,reason)=>{if(!scores[id]||points>scores[id]){scores[id]=points;reasons[id]=reason}};
 for(const [id,pats] of Object.entries(PATTERNS)){
  if(ARTISTS.has(id)){
   for(const [idx,t] of performerTexts.entries())
    if(pats.some(term=>tokenMatch(t,term))){push(id,idx===0?4:3,idx===0?'artist tag':'recording title');break;}
  }else{
   for(const [text,weight,source] of parts)if(pats.some(term=>tokenMatch(text,term)))push(id,weight,source);
  }
 }
 // Learning: users can teach the app custom phrases to recognize on future scans.
 const rules=Array.isArray(options.rules)?options.rules.slice(0,150):[];
 const searchable=parts.map(x=>x[0]).join(' ');
 for(const rule of rules){
  if(!rule||typeof rule.term!=='string'||typeof rule.category!=='string')continue;
  const term=clean(rule.term),key=rule.category;
  if(term.length>=2&&term.length<100&&(PRESETS.some(x=>x[0]===key)||key.startsWith('custom:'))&&tokenMatch(searchable,term))
   push(key,5,'your learned rule');
 }
 const categories=Object.keys(scores).filter(k=>scores[k]>=2);
 const semantic=categories.some(k=>!ARTISTS.has(k));
 if(!semantic)categories.push('other');
 const actualArtist=isKnown(artist)?shortName(artist,120):likelyArtistFromFile(s);
 if(actualArtist)categories.push('artist:'+slug(actualArtist));
 if(isKnown(album))categories.push('album:'+slug(album));
 if(isKnown(genre))categories.push('genre:'+slug(genre));
 if(isKnown(parent)&&!/^\d+$/.test(parent))categories.push('folder:'+slug(parent));
 return {categories:[...new Set(categories)],semantic,artist:actualArtist||'Unknown artist',
  album:isKnown(album)?album:'',genre:isKnown(genre)?genre:'',folder:parent,
  reasons,confidence:semantic?'metadata matched':'needs review'};
}
function buildCategories(tracks,custom){
 const counts=new Map(),labels=new Map();
 for(const t of tracks)for(const key of t.categories||[]){
  counts.set(key,(counts.get(key)||0)+1);
  if(key.startsWith('artist:'))labels.set(key,t.artist);
  if(key.startsWith('album:'))labels.set(key,t.album);
  if(key.startsWith('genre:'))labels.set(key,t.genre);
  if(key.startsWith('folder:'))labels.set(key,t.folder);
 }
 const built=PRESETS.filter(([id])=>counts.has(id)).map(x=>({id:x[0],title:x[1],icon:x[2],description:x[3],count:counts.get(x[0]),group:'curated'}));
 for(const x of Array.isArray(custom)?custom:[]){
  if(!x||typeof x.id!=='string'||!x.id.startsWith('custom:'))continue;
  built.push({id:x.id,title:shortName(x.title),icon:'♡',description:'Your playlist',count:counts.get(x.id)||0,group:'curated'});
 }
 if(counts.has('other'))built.push({id:'other',title:'Other / Review',icon:'◇',description:'Review these names to improve accuracy',count:counts.get('other'),group:'curated'});
 const dynamic=[];
 for(const [id,count]of counts){
  const match=/^(artist|album|genre|folder):/.exec(id);if(!match)continue;
  const type=match[1];dynamic.push({id,title:shortName(labels.get(id)||id.slice(type.length+1)),icon:type==='artist'?'♬':type==='album'?'▣':type==='genre'?'◈':'▤',description:type[0].toUpperCase()+type.slice(1),count,group:type});
 }
 dynamic.sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base',numeric:true}));
 return built.concat(dynamic);
}
root.MehfilClassifier={detect,buildCategories,PRESETS,TERMS,ARTISTS,clean,isKnown,slug,tokenMatch};
if(typeof module==='object'&&module.exports)module.exports=root.MehfilClassifier;
})(typeof window!=='undefined'?window:globalThis);
