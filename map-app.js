'use strict';
try {
const T=THREE, host=document.querySelector('#canvas');
const scene=new T.Scene();scene.background=new T.Color(0xffffff);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const camera=new T.OrthographicCamera(-500,500,500,-500,.1,15000);
scene.add(new T.HemisphereLight(0xffffff,0xbbbbbb,2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(-400,800,300);scene.add(sun);
const floors=[],pick=[],buildings=new Map();
// The floor boundary follows the wall centreline: inner faces lie inside it.
const buildingFloors=new Map(window.BLEND_MODEL.filter(d=>d.building&&d.name.includes('FLOOR')).map(d=>[d.building.id,d.p]));
function insideFloor(x,z,positions){
 for(let i=0;i<positions.length;i+=9){
  const ax=positions[i],az=positions[i+2],bx=positions[i+3],bz=positions[i+5],cx=positions[i+6],cz=positions[i+8];
  const cross=(px,pz,qx,qz,rx,rz)=>(qx-px)*(rz-pz)-(qz-pz)*(rx-px);
  const u=cross(ax,az,bx,bz,x,z),v=cross(bx,bz,cx,cz,x,z),w=cross(cx,cz,ax,az,x,z);
  if(Math.abs(cross(ax,az,bx,bz,cx,cz))>1e-8&&((u>=-1e-7&&v>=-1e-7&&w>=-1e-7)||(u<=1e-7&&v<=1e-7&&w<=1e-7)))return true;
 }
 return false;
}
function wallColours(data){
 const colours=new Float32Array(data.p.length).fill(.58),floor=buildingFloors.get(data.building.id);
 if(!floor)return colours;
 for(let i=0;i<data.p.length;i+=9){
  const a=new T.Vector3().fromArray(data.p,i),b=new T.Vector3().fromArray(data.p,i+3),c=new T.Vector3().fromArray(data.p,i+6);
  const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  if(Math.abs(normal.y)>.1)continue;
  const midpoint=a.add(b).add(c).multiplyScalar(1/3);
  if(insideFloor(midpoint.x,midpoint.z,floor))colours.fill(0,i,i+9);
 }
 return colours;
}
for(const data of window.BLEND_MODEL){if(!data.building)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));g.setAttribute('color',new T.Float32BufferAttribute(wallColours(data),3));g.computeVertexNormals();const isFloor=data.name.includes('FLOOR');const mesh=new T.Mesh(g,isFloor?new T.MeshBasicMaterial({color:0x444444,side:T.DoubleSide}):new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide}));mesh.userData=data.building;pick.push(mesh);if(!buildings.has(data.building.id))buildings.set(data.building.id,{...data.building,meshes:[]});buildings.get(data.building.id).meshes.push(mesh);scene.add(mesh);if(data.name.includes('FLOOR'))floors.push(mesh)}
const mapData=window.REGISTERED_MAP;
const roadMaterial=new T.MeshBasicMaterial({color:0xf4f4f4,side:T.DoubleSide});
function roadRing(points){return points.map(p=>new T.Vector2(p[0],-p[1]))}
for(const poly of mapData.roads){const shape=new T.Shape(roadRing(poly.outer));for(const ring of poly.holes)shape.holes.push(new T.Path(roadRing(ring)));const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const mesh=new T.Mesh(g,roadMaterial);mesh.position.y=-.08;scene.add(mesh);const edges=[poly.outer,...poly.holes];for(const ring of edges){const g=new T.BufferGeometry().setFromPoints(ring.map(p=>new T.Vector3(p[0],-.06,p[1])));scene.add(new T.Line(g,new T.LineBasicMaterial({color:0x777777,transparent:true,opacity:.55})))}}
// Keep tracks near ground level, below building floors so buildings occlude them.
const railHeight=-.04,railPositions=[],deckPositions=[];
function railLine(a,b){railPositions.push(a[0],railHeight+.045,a[1],b[0],railHeight+.045,b[1])}
for(const points of mapData.rails){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(!length)continue;const nx=-dz/length,nz=dx/length;
const corners=[ [a[0]-nx*1.25,a[1]-nz*1.25],[a[0]+nx*1.25,a[1]+nz*1.25],[b[0]+nx*1.25,b[1]+nz*1.25],[b[0]-nx*1.25,b[1]-nz*1.25] ];
for(const j of [0,1,2,0,2,3])deckPositions.push(corners[j][0],railHeight,corners[j][1]);
for(const side of [-.58,.58])railLine([a[0]+nx*side,a[1]+nz*side],[b[0]+nx*side,b[1]+nz*side]);for(let t=0;t<length;t+=2.4){const x=a[0]+dx*t/length,z=a[1]+dz*t/length;railLine([x-nx,z-nz],[x+nx,z+nz])}}}
const deckGeometry=new T.BufferGeometry();deckGeometry.setAttribute('position',new T.Float32BufferAttribute(deckPositions,3));
const railDeck=new T.Mesh(deckGeometry,new T.MeshBasicMaterial({color:0xe5e5e5,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));scene.add(railDeck);
const railGeometry=new T.BufferGeometry();railGeometry.setAttribute('position',new T.Float32BufferAttribute(railPositions,3));const railway=new T.LineSegments(railGeometry,new T.LineBasicMaterial({color:0x333333}));scene.add(railway);
// Each street name stays anchored to its road midpoint, with the projected road angle.
const labelLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');labelLayer.id='street-labels';host.append(labelLayer);
const streetLabels=mapData.labels.filter(l=>l.name!=='Holly Grove'&&!l.name.startsWith('Moncrieff')).map(l=>{
 const group=document.createElementNS('http://www.w3.org/2000/svg','g');
 const el=document.createElementNS('http://www.w3.org/2000/svg','text');el.classList.add('street-name');if(l.name.startsWith('Moncrieff'))el.classList.add('street-name-small');el.textContent=l.name;el.setAttribute('text-anchor','middle');el.setAttribute('dominant-baseline','middle');group.append(el);labelLayer.append(group);
 const a=l.name==='Rye Lane'?new T.Vector3(-16,0,48):new T.Vector3(l.a[0],0,l.a[1]),b=l.name==='Rye Lane'?new T.Vector3(4,0,88):new T.Vector3(l.b[0],0,l.b[1]);
 // Move these anchors away from the shared junction once, in map coordinates.
 const anchorFraction=l.name==='Hanover Park'?2.2:l.name==='Copeland Road'?-.6:l.name==='Bournemouth Road'?1.25:.5;
 return {group,el,a,b,midpoint:a.clone().lerp(b,anchorFraction)};
});
function projectPoint(p){const q=p.clone().project(camera);return {x:(q.x+1)*width/2,y:(1-q.y)*height/2}}
function positionLabels(){
 // Scale labels with the map, using the initial view as the size reference.
 labelLayer.setAttribute('width',width);labelLayer.setAttribute('height',height);
 for(const {group,a,b,midpoint} of streetLabels){
  group.style.visibility='visible';
  const screen=projectPoint(midpoint),pa=projectPoint(a),pb=projectPoint(b);
  let angle=Math.atan2(pb.y-pa.y,pb.x-pa.x)*180/Math.PI;
  if(angle>90)angle-=180;if(angle< -90)angle+=180;
  group.setAttribute('transform',`translate(${screen.x} ${screen.y}) rotate(${angle}) scale(${initialSpan/span})`);
 }

}
// Place shared-building shop markers in evenly spaced rows along the nearest wall.
const shopPins=[];
function floorBoundary(positions){
 const edges=new Map(),key=p=>p.map(n=>n.toFixed(3)).join(',');
 for(let i=0;i<positions.length;i+=9){
  const points=[0,3,6].map(j=>[positions[i+j],positions[i+j+2]]);
  for(let j=0;j<3;j++){
   const a=points[j],b=points[(j+1)%3],id=[key(a),key(b)].sort().join('|');
   if(edges.has(id))edges.delete(id);else edges.set(id,{a,b});
  }
 }
 return [...edges.values()].map(e=>({...e,length:Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]),shops:[]})).filter(e=>e.length>1);
}
for(const b of buildings.values()){
 const shops=window.BUILDING_SHOPS[b.id]||[];
 b.box=new T.Box3();b.meshes.forEach(m=>b.box.expandByObject(m));
 if(shops.length<2)continue;
 const floor=buildingFloors.get(b.id),center=b.box.getCenter(new T.Vector3());
 const fallback=[{a:[b.box.min.x,b.box.min.z],b:[b.box.max.x,b.box.min.z],length:Math.max(1,b.box.max.x-b.box.min.x),shops:[]}];
 const boundary=floor?floorBoundary(floor):fallback;
 if(!boundary.length)boundary.push(...fallback);
 for(const shop of shops){
  const p=shop.p||[center.x,center.z];let best=null;
  for(const edge of boundary){
   const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1];
   const t=Math.max(0,Math.min(1,((p[0]-edge.a[0])*dx+(p[1]-edge.a[1])*dz)/(edge.length*edge.length)));
   const distance=Math.hypot(p[0]-edge.a[0]-t*dx,p[1]-edge.a[1]-t*dz);
   if(!best||distance<best.distance)best={edge,t,distance};
  }
  best.edge.shops.push({shop,t:best.t});
 }
 for(const edge of boundary){
  edge.shops.sort((a,b)=>a.t-b.t||a.shop.name.localeCompare(b.shop.name));
  const dx=(edge.b[0]-edge.a[0])/edge.length,dz=(edge.b[1]-edge.a[1])/edge.length;
  let nx=-dz,nz=dx;
  const mx=(edge.a[0]+edge.b[0])/2,mz=(edge.a[1]+edge.b[1])/2;
  if(floor&&insideFloor(mx+nx,mz+nz,floor)){nx=-nx;nz=-nz;}
  const radius=Math.min(.8,edge.length/(edge.shops.length+1)*.28);
  edge.shops.forEach(({shop},i)=>{
   const distance=edge.length*(i+1)/(edge.shops.length+1);
   const pin=new T.Mesh(new T.SphereGeometry(radius,12,8),new T.MeshBasicMaterial({color:0xed6729}));
   pin.position.set(edge.a[0]+dx*distance+nx*.6,b.box.max.y+1,edge.a[1]+dz*distance+nz*.6);
   pin.userData={building:b,shop};scene.add(pin);shopPins.push(pin);
  });
 }
}
let popupAnchor=null,selectedBuilding=null,selectedShop=null,activePin=null;
function positionPopup(){if(!popupAnchor||document.querySelector('#detail').hidden)return;const p=popupAnchor.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;const panel=document.querySelector('#detail'),link=document.querySelector('#popup-link');if(x<0||x>width||y<0||y>height){panel.style.visibility='hidden';link.style.visibility='hidden';return}panel.style.visibility='visible';link.style.visibility='visible';const pw=panel.offsetWidth,ph=panel.offsetHeight;const left=x+pw+36<width?x+26:x-pw-26,top=Math.max(12,Math.min(height-ph-12,y-ph*.35));panel.style.left=Math.max(12,Math.min(width-pw-12,left))+'px';panel.style.top=top+'px';const actualLeft=parseFloat(panel.style.left);const edgeX=actualLeft>x?actualLeft:actualLeft+pw,edgeY=Math.max(top+20,Math.min(top+ph-20,y));link.setAttribute('viewBox',`0 0 ${width} ${height}`);link.querySelector('line').setAttribute('x1',x);link.querySelector('line').setAttribute('y1',y);link.querySelector('line').setAttribute('x2',edgeX);link.querySelector('line').setAttribute('y2',edgeY);link.querySelector('circle').setAttribute('cx',x);link.querySelector('circle').setAttribute('cy',y)}
const bounds=new T.Box3();floors.forEach(m=>bounds.expandByObject(m));const center=bounds.getCenter(new T.Vector3());center.y=0;
const theta=-Math.PI/4,phi=Math.PI/4,offset=new T.Vector3(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta)).multiplyScalar(2500);
let target=center.clone(),desiredTarget=center.clone(),span=850,desiredSpan=850,initialSpan=850,width=1,height=1,frame=0,anchor=null;
// Keep the overview as the widest view and allow 5× street detail.
function clampSpan(value){return Math.max(initialSpan/5,Math.min(initialSpan,value))}
function cameraUpdate(){const aspect=width/height;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld()}
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
function groundAt(ndc){ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(plane,new T.Vector3())}
function schedule(){if(!frame)frame=requestAnimationFrame(tick)}
function tick(){frame=0;span+=(desiredSpan-span)*.18;target.lerp(desiredTarget,.22);cameraUpdate();if(anchor){const p=groundAt(anchor.ndc);if(p){const delta=anchor.world.clone().sub(p);target.add(delta);desiredTarget.add(delta);cameraUpdate()}}renderer.render(scene,camera);positionPopup();positionLabels();if(Math.abs(desiredSpan-span)>.01||target.distanceTo(desiredTarget)>.01)schedule()}
function resize(){const r=host.getBoundingClientRect();width=r.width;height=r.height;renderer.setSize(width,height);cameraUpdate();schedule()}
new ResizeObserver(resize).observe(host);resize();
// Fit only the actual model, keeping the context as a quiet surrounding line drawing.
const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const z of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,0,z).project(camera));const projectedWidth=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),projectedHeight=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));initialSpan=span*Math.max(projectedWidth/1.55,projectedHeight/1.55);span=desiredSpan=initialSpan;cameraUpdate();schedule();
// Opening scene shares an exact screen anchor and road width with the drawing.
window.alignOpeningStreet=(pixelWidth,pullback)=>{
 anchor=null;
 target.set(-6,0,68);desiredTarget.copy(target);
 span=1;cameraUpdate();
 const edgeA=projectPoint(new T.Vector3(-6-.8944*2.12,0,68+.4472*2.12));
 const edgeB=projectPoint(new T.Vector3(-6+.8944*4.05,0,68-.4472*4.05));
 const matchedSpan=Math.hypot(edgeB.x-edgeA.x,edgeB.y-edgeA.y)/pixelWidth;
 span=desiredSpan=matchedSpan+(initialSpan/(window.openingReturnMode?5:3)-matchedSpan)*pullback;
 cameraUpdate();renderer.render(scene,camera);positionLabels();
 const a=projectPoint(new T.Vector3(-16,0,48)),b=projectPoint(new T.Vector3(4,0,88)),point=projectPoint(new T.Vector3(-6,0,68));
 return {x:point.x,y:point.y,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};
};
const canvas=renderer.domElement,pointers=new Map();let drag=null,pinch=null,down=null,moved=false;
function ndc(x,y){const r=canvas.getBoundingClientRect();return new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1)}
canvas.oncontextmenu=e=>e.preventDefault();canvas.addEventListener('wheel',e=>{e.preventDefault();const point=ndc(e.clientX,e.clientY);anchor={ndc:point,world:groundAt(point)};const delta=e.deltaY*(e.deltaMode===1?16:1);if(delta<0&&desiredSpan<=initialSpan/5+.01&&anchor.world&&Math.hypot(anchor.world.x+6,anchor.world.z-68)<65){closeDetails();anchor=null;window.returnToStreetDrawing?.();return}desiredSpan=clampSpan(desiredSpan*Math.exp(Math.max(-120,Math.min(120,delta))*.0017));schedule()},{passive:false});
canvas.addEventListener('pointerdown',e=>{anchor=null;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag=[e.clientX,e.clientY];down=[e.clientX,e.clientY];moved=false});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)){if(e.pointerType!=='touch')hoverAt(e.clientX,e.clientY);return;}if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)moved=true;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){moved=true;const a=[...pointers.values()],dist=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch){const midpoint=[(a[0][0]+a[1][0])/2,(a[0][1]+a[1][1])/2],world=groundAt(ndc(...midpoint));if(dist>pinch&&desiredSpan<=initialSpan/5+.01&&world&&Math.hypot(world.x+6,world.z-68)<65){closeDetails();anchor=null;pointers.clear();pinch=null;drag=null;window.returnToStreetDrawing?.();return}desiredSpan=clampSpan(desiredSpan*pinch/dist);}pinch=dist;drag=null;schedule();return}if(!drag){drag=[e.clientX,e.clientY];return}const before=groundAt(ndc(...drag)),after=groundAt(ndc(e.clientX,e.clientY));if(before&&after)desiredTarget.add(before.sub(after));drag=[e.clientX,e.clientY];schedule()});
function identify(x,y){ray.setFromCamera(ndc(x,y),camera);const hits=ray.intersectObjects([...pick,...shopPins,railDeck]);const hit=hits[0];if(!hit||hit.object===railDeck)return null;if(hit.object.userData.shop)return {b:hit.object.userData.building,shop:hit.object.userData.shop,point:hit.object.position,pin:hit.object};const b=buildings.get(hit.object.userData.id),shops=b&&window.BUILDING_SHOPS[b.id];if(!shops?.length)return null;const shop=[...shops].sort((a,c)=>Math.hypot((a.p?.[0]??hit.point.x)-hit.point.x,(a.p?.[1]??hit.point.z)-hit.point.z)-Math.hypot((c.p?.[0]??hit.point.x)-hit.point.x,(c.p?.[1]??hit.point.z)-hit.point.z))[0];return {b,shop,point:hit.point,pin:shopPins.find(p=>p.userData.shop===shop)}}
let closeTimer=null;
function cancelClose(){clearTimeout(closeTimer)}
function deferClose(){cancelClose();closeTimer=setTimeout(closeDetails,220)}
function hoverAt(x,y){const hit=identify(x,y);if(hit){cancelClose();if(selectedBuilding!==hit.b||selectedShop!==hit.shop){select(hit.b,hit.point,hit.shop,hit.pin);detail.classList.add('peek')}}else deferClose()}
canvas.addEventListener('pointerleave',deferClose);
const detail=document.querySelector('#detail');detail.addEventListener('click',()=>{if(detail.classList.contains('peek'))detail.classList.remove('peek')});detail.addEventListener('pointerenter',cancelClose);detail.addEventListener('pointerleave',deferClose);
function release(e){const click=e.type==='pointerup'&&!moved&&pointers.size===1;pointers.delete(e.pointerId);drag=null;pinch=null;if(click){const hit=identify(e.clientX,e.clientY);if(hit){select(hit.b,hit.point,hit.shop,hit.pin);detail.classList.remove('peek')}else closeDetails()}else if(e.pointerType==='mouse')hoverAt(e.clientX,e.clientY)}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
function closeDetails(){cancelClose();detail.classList.remove('peek');selectedBuilding=null;selectedShop=null;popupAnchor=null;document.querySelector('#detail').hidden=true;document.querySelector('#popup-link').hidden=true;for(const m of pick)if(m.material.emissive){m.material.emissive.setHex(0);m.material.color.setHex(0xffffff)}if(activePin){activePin.scale.setScalar(1);activePin.material.color.setHex(0xed6729);activePin=null}schedule()}
function showShop(shop){document.querySelector('#building-name').textContent=shop.name;document.querySelector('#address').textContent=shop.address||selectedBuilding.address||'Rye Lane neighbourhood, Peckham';const category=document.querySelector('#category');category.textContent=shop.category?shop.category.replaceAll('_',' '):'Local business';const source=document.querySelector('#listing-source');source.textContent=shop.source==='Google Maps public search'?'Google Maps listing':'Mapped local business';const google=document.querySelector('#google');google.href=shop.googleUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(shop.name+' '+(shop.address||'Peckham London'));const website=document.querySelector('#website');website.hidden=!shop.website;if(shop.website){try{const u=new URL(shop.website);website.href=['https:','http:'].includes(u.protocol)?u.href:'#';website.textContent='Visit website ↗'}catch{website.hidden=true}}document.querySelectorAll('.shop-option').forEach(el=>el.classList.toggle('active',el.dataset.name===shop.name));schedule()}
function select(b,point,shop,pin){closeDetails();selectedBuilding=b;selectedShop=shop;popupAnchor=point.clone();for(const mesh of b.meshes)if(mesh.material.emissive){mesh.material.color.setHex(0xff883e);mesh.material.emissive.setHex(0xff651c);mesh.material.emissiveIntensity=.65}if(pin){activePin=pin;pin.scale.setScalar(1.7);pin.material.color.setHex(0x111111)}const shops=[...window.BUILDING_SHOPS[b.id]].sort((a,c)=>{const dist=g=>Math.hypot((g.p?.[0]||0)-point.x,(g.p?.[1]||0)-point.z);return dist(a)-dist(c)});const list=document.querySelector('#shop-list');list.replaceChildren();document.querySelector('#tenant-count').textContent=shops.length>1?shops.length+' businesses in this building':'';list.hidden=shops.length<2;for(const shop of shops){const button=document.createElement('button');button.className='shop-option';button.dataset.name=shop.name;button.textContent=shop.name;button.onclick=()=>{selectedShop=shop;showShop(shop)};list.append(button)}document.querySelector('#detail').hidden=false;document.querySelector('#popup-link').hidden=false;showShop(shop||shops[0]);detail.getAnimations().forEach(a=>a.cancel());if(!matchMedia('(prefers-reduced-motion: reduce)').matches)detail.animate([{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:180,easing:'ease-out'})}
document.querySelector('#close').onclick=closeDetails;
document.querySelector('#reset').onclick=()=>{closeDetails();anchor=null;desiredTarget.copy(center);desiredSpan=initialSpan;schedule()};document.querySelector('#status').hidden=true;if(location.hash)history.replaceState(null,'',location.pathname);
}catch(error){document.querySelector('#status').textContent='Unable to display model: '+error.message;console.error(error)}
