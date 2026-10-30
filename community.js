(()=>{
const list=document.querySelector('#live-news'),message=document.createElement('p'),refresh=document.createElement('button'),more=document.querySelector('#load-more-news');
const official={title:'Rye Lane reopening statement',source:'Southwark Council',date:'2026-09-12T00:00:00+00:00',url:'https://www.southwark.gov.uk/news/2026/rye-lane-updates-and-statement',summary:'The council reported that Rye Lane had reopened following emergency stabilisation works at 114–116 Rye Lane. This report describes the situation on its publication date.'};
function mergeNews(entries){const unique=new Map(entries.map(item=>[item.url,item]));unique.set(official.url,official);return [...unique.values()].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10)}
let items=[],visible=3;
function render(){list.replaceChildren();for(const item of items.slice(0,visible)){
 const card=document.createElement('article');card.className='news-card';
 const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=item.source+' · '+new Date(item.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 const h=document.createElement('h3'),link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title;h.append(link);card.append(meta,h);
 if(item.summary){const p=document.createElement('p');p.textContent=/premium content|subscribers only/i.test(item.summary)?"A report on the Rye Lane closure and its effects on local residents and businesses. Full article requires a subscription.":item.summary;card.append(p)}
 const read=document.createElement('a');read.href=item.url;read.target='_blank';read.rel='noopener noreferrer';read.className='news-read';read.textContent='Read the full story';card.append(read);list.append(card)
}more.hidden=visible>=items.length;more.textContent=`Load more (${Math.min(3,Math.max(0,items.length-visible))})`;}
async function loadNews(){refresh.disabled=true;message.textContent='Checking local news…';try{
 const response=await fetch('/api/community',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();items=mergeNews(data.items||[]);visible=3;render();
 message.textContent=(items.length?'Latest available Rye Lane news and council updates. Older reports describe events at the time of publication.':'No matching news is currently available.')+(data.available?'':' Live updates are unavailable; showing previously saved reports.');
}catch{try{const response=await fetch('community-news.json',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();items=mergeNews(data.items||[]);visible=3;render();message.textContent='Saved news selection. Live updates are unavailable; check each story’s publication date.'}catch{message.textContent='News is temporarily unavailable. Please try again later.';items=[];render()}}finally{refresh.disabled=false}}
more.addEventListener('click',()=>{const previous=visible;visible+=3;render();list.children[previous]?.querySelector('h3 a')?.focus()});
let userMoved=false;
for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,()=>{userMoved=true},{once:true,passive:true});
loadNews().then(async()=>{
 if(document.fonts)await document.fonts.ready;
 if(userMoved)return;
 const id=location.hash.slice(1);
 if(['local-connections','street-history'].includes(id))requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}));
});
})();
