'use strict';
const opening=document.querySelector('#opening');
const enterMap=document.querySelector('#enter-map');
const openingImage=enterMap.querySelector('.opening-art');
const streetHotspot=enterMap.querySelector('.street-hotspot');
const mapMain=document.querySelector('main');
const mapHeader=document.querySelector('header');
mapMain.inert=true;mapHeader.inert=true;
let progress=0,desiredProgress=0,openingFrame=0,finished=false,returning=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
function drawOpening(){
 openingFrame=0;
 progress=reduced?desiredProgress:progress+(desiredProgress-progress)*.18;
 if(Math.abs(progress-desiredProgress)<.0005)progress=desiredProgress;
 const blend=smooth((progress-.68)/.17);
 const pullback=smooth((progress-.85)/.15);
 const fit=Math.min(innerWidth/1528.4,innerHeight/1078.4);
 const zoom=reduced?1:Math.exp(Math.min(progress/.72,1)*Math.log(3.2));
 // This point and width describe the open carriageway in the source SVG.
 const svgStreet={x:890,y:540,width:100,angle:29};
 const alignment=smooth((progress-.36)/.32);
 const map=window.alignOpeningStreet?.(svgStreet.width*fit*zoom,pullback);
 const imageX=innerWidth/2+(svgStreet.x-1528.4/2)*fit;
 const imageY=innerHeight/2+(svgStreet.y-1078.4/2)*fit;
 const rect=document.querySelector('main').getBoundingClientRect();
 const destX=map?map.x:innerWidth/2,destY=map?map.y+rect.top:innerHeight/2;
 const tx=(destX-imageX)*alignment,ty=(destY-imageY)*alignment;
 openingImage.style.transformOrigin=`${imageX}px ${imageY}px`;
 openingImage.style.transform=`translate(${tx}px,${ty}px) scale(${zoom})`;
 opening.style.opacity=1-blend;
 document.body.classList.toggle('opening',progress<=.68);
 mapMain.style.opacity=blend;
 mapHeader.style.opacity=smooth((progress-.85)/.15);
 if(returning&&progress===0){returning=false;window.openingReturnMode=false;}
 if(progress===1&&!returning){
  finished=true;opening.hidden=true;
  document.body.classList.remove('opening');
  mapMain.inert=false;mapHeader.inert=false;
  mapMain.style.removeProperty('opacity');mapMain.style.removeProperty('transform');mapMain.style.removeProperty('transform-origin');mapHeader.style.removeProperty('opacity');
  if(document.activeElement===enterMap)document.querySelector('#reset').focus({preventScroll:true});
  return;
 }
 if(progress!==desiredProgress)openingFrame=requestAnimationFrame(drawOpening);
}
function advance(amount){
 if(finished)return;
 desiredProgress=clamp(desiredProgress+(returning?-amount:amount));
 if(!openingFrame)openingFrame=requestAnimationFrame(drawOpening);
}
opening.addEventListener('wheel',e=>{
 e.preventDefault();
 const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 advance(-Math.max(-160,Math.min(160,delta))/(e.ctrlKey?450:1400));
},{passive:false});
// Touchscreen pinch and upward swipe both scrub the same reversible transition.
const fingers=new Map();let pinchDistance=null,lastY=null;
opening.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse')return;
 opening.setPointerCapture(e.pointerId);fingers.set(e.pointerId,[e.clientX,e.clientY]);
 lastY=e.clientY;pinchDistance=null;
});
opening.addEventListener('pointermove',e=>{
 if(!fingers.has(e.pointerId))return;
 fingers.set(e.pointerId,[e.clientX,e.clientY]);
 if(fingers.size===2){
  const [a,b]=[...fingers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(pinchDistance)advance(Math.log(distance/pinchDistance)/Math.log(3.8));
  pinchDistance=distance;lastY=null;
 }else{
  if(lastY!==null)advance((lastY-e.clientY)/900);
  lastY=e.clientY;
 }
});
function releaseFinger(e){fingers.delete(e.pointerId);pinchDistance=null;lastY=null}
opening.addEventListener('pointerup',releaseFinger);opening.addEventListener('pointercancel',releaseFinger);
enterMap.addEventListener('keydown',e=>{
 const forward=['ArrowDown','ArrowRight','+','=','Enter',' '].includes(e.key);
 const backward=['ArrowUp','ArrowLeft','-'].includes(e.key);
 if(forward||backward){e.preventDefault();advance(forward?.12:-.12)}
});

// Continuing to zoom at Rye Lane reveals the original drawing again.
window.returnToStreetDrawing=()=>{
 if(!finished)return;
 returning=true;window.openingReturnMode=true;finished=false;
 progress=1;desiredProgress=.98;
 opening.hidden=false;opening.style.opacity=0;
 mapMain.inert=true;mapHeader.inert=true;
 if(!openingFrame)openingFrame=requestAnimationFrame(drawOpening);
};

// Only the carriageway highlighted in the drawing responds to hovering/clicking.
streetHotspot.addEventListener('pointerenter',()=>openingImage.classList.add('street-hover'));
streetHotspot.addEventListener('pointerleave',()=>openingImage.classList.remove('street-hover'));
let clickStart=null;
opening.addEventListener('pointerdown',e=>{clickStart={x:e.clientX,y:e.clientY,time:performance.now()}});
streetHotspot.addEventListener('click',e=>{
 if(finished||!clickStart||Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y)>8||performance.now()-clickStart.time>700)return;
 returning=false;window.openingReturnMode=false;
 if(openingFrame)cancelAnimationFrame(openingFrame);
 openingFrame=0;progress=desiredProgress=1;
 openingImage.classList.remove('street-hover');
 drawOpening();
});
