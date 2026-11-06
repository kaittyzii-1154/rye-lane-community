document.querySelectorAll('.shop-interview').forEach(detail=>{detail.addEventListener('toggle',()=>{if(!detail.open)detail.querySelector('video')?.pause()})});

if(location.hash==='#cafe-interview')location.replace('daydreamer-cafe.html#cafe-interview');
