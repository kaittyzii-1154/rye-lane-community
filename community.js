(()=>{
const list=document.querySelector('#live-news'),more=document.querySelector('#load-more-news');
if(!list||!more)return;
const message=document.createElement('p');message.className='feed-status';message.setAttribute('role','status');document.querySelector('.feed-header').after(message);
let items=[],visible=3;
function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
function render(){list.replaceChildren();for(const item of items.slice(0,visible)){
 const card=document.createElement('article');card.className='news-card';
 const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=item.source+' · '+formatDate(item.date);
 const h=document.createElement('h3'),link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title;h.append(link);card.append(meta,h);
 if(item.summary){const p=document.createElement('p');p.textContent=item.summary;card.append(p)}
 const read=document.createElement('a');read.href=item.url;read.target='_blank';read.rel='noopener noreferrer';read.className='news-read';read.textContent='Read the original report';card.append(read);list.append(card)
}more.hidden=visible>=items.length;more.textContent=`Load more (${Math.min(3,Math.max(0,items.length-visible))})`;}
async function getData(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('News unavailable');const data=await response.json();if(!Array.isArray(data.items))throw Error('Invalid news');return data}
async function loadNews(){message.textContent='Loading local news…';try{
 let data;
 if(['localhost','127.0.0.1'].includes(location.hostname)){try{data=await getData('/api/community')}catch{data=await getData('community-news.json')}}else data=await getData('community-news.json');
 const unique=new Map();for(const item of data.items){try{const url=new URL(item.url);if(url.protocol!=='https:'||!item.title||!formatDate(item.date)||new Date(item.date)>new Date())continue;unique.set(url.href,item)}catch{}}
 items=[...unique.values()].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);visible=3;render();
 message.textContent=(data.checked?'News checked '+formatDate(data.checked)+'. ':'')+(items.length?'Listed newest first. Open a report for the publisher’s full account.':'No matching reports are currently available.');
}catch{items=[];render();message.textContent='News is temporarily unavailable. Please try again later.'}}
more.addEventListener('click',()=>{const previous=visible;visible+=3;render();list.children[previous]?.querySelector('h3 a')?.focus()});
let userMoved=false;
for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,()=>{userMoved=true},{once:true,passive:true});
loadNews().then(async()=>{
 if(document.fonts)await document.fonts.ready;if(userMoved)return;
 const id=location.hash.slice(1);
 if(['local-connections','street-history'].includes(id))requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}));
});
})();
