"""Local preview with a public, allowlisted RSS adapter."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json,time,urllib.parse,re,os
from news_feed import collect
ROOT=Path(__file__).resolve().parent
SNAPSHOT=ROOT/'community-news.json'
try:cache=json.loads(SNAPSHOT.read_text())
except (OSError,ValueError):cache={'items':[],'checked':None,'available':False}
attempted=0
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def send_head(self):
  self.byte_range=None
  path=Path(self.translate_path(self.path))
  if path.suffix.lower() not in {'.mp4','.mov','.webm','.mp3','.m4a','.wav'} or not path.is_file():
   return super().send_head()
  f=path.open('rb');stat=os.fstat(f.fileno());size=stat.st_size
  start,end=0,size-1
  requested=self.headers.get('Range') if not self.headers.get('If-Range') else None
  if requested:
   match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested.strip())
   try:
    if not match or not any(match.groups()):raise ValueError()
    first,last=match.groups()
    if first:
     start=int(first);end=min(int(last),size-1) if last else size-1
    else:
     length=int(last)
     if length<=0:raise ValueError()
     start=max(0,size-length)
    if start>=size or start>end:raise ValueError()
   except ValueError:
    f.close();self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
   self.byte_range=(start,end);f.seek(start)
  self.send_response(206 if requested else 200)
  self.send_header('Content-Type',self.guess_type(str(path)))
  self.send_header('Accept-Ranges','bytes')
  self.send_header('Content-Length',str(end-start+1))
  self.send_header('Last-Modified',self.date_time_string(stat.st_mtime))
  if requested:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
  self.end_headers();return f
 def copyfile(self,source,outputfile):
  if not getattr(self,'byte_range',None):
   try:return super().copyfile(source,outputfile)
   except (BrokenPipeError,ConnectionResetError):return
  remaining=self.byte_range[1]-self.byte_range[0]+1
  try:
   while remaining:
    block=source.read(min(65536,remaining))
    if not block:break
    outputfile.write(block);remaining-=len(block)
  except (BrokenPipeError,ConnectionResetError):pass
 def do_GET(self):
  global cache,attempted
  if urllib.parse.urlparse(self.path).path!='/api/community':return super().do_GET()
  if time.time()-attempted>900:
   attempted=time.time()
   try:
    cache=collect();SNAPSHOT.write_text(json.dumps(cache,ensure_ascii=False))
   except Exception:cache={**cache,'available':False}
  body=json.dumps(cache).encode();self.send_response(200);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
if __name__=='__main__':
 print('Rye Lane preview: http://127.0.0.1:8765',flush=True)
 ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
