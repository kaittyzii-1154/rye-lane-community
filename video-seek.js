// A keyboard-accessible seek bar alongside the browser's video controls.
document.querySelectorAll('video').forEach(video => {
  const bar = document.createElement('div');
  bar.className = 'video-seek';
  const position = document.createElement('input');
  position.type = 'range';
  position.min = '0'; position.max = '0'; position.step = '0.1'; position.value = '0';
  position.setAttribute('aria-label', 'Video position');
  position.disabled = true;
  const clock = document.createElement('output');
  clock.setAttribute('aria-live', 'off');
  const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  let dragging = false;
  function refresh() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    position.max = String(duration); position.disabled = !duration;
    if (!dragging) position.value = String(video.currentTime);
    clock.textContent = `${format(Number(position.value))} / ${format(duration)}`;
    position.setAttribute('aria-valuetext', clock.textContent);
  }
  position.addEventListener('pointerdown', () => { dragging = true; });
  position.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Number(position.value);
    refresh();
  });
  const release = () => { dragging = false; refresh(); };
  position.addEventListener('change', release);
  position.addEventListener('pointerup', release);
  position.addEventListener('pointercancel', release);
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(event => video.addEventListener(event, refresh));
  bar.append(position, clock); video.after(bar); refresh();
});
