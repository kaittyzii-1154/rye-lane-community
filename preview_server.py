"""Local preview with a public, allowlisted RSS adapter."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json,time,urllib.parse
from news_feed import collect
ROOT=Path(__file__).resolve().parent
SNAPSHOT=ROOT/'community-news.json'
try:cache=json.loads(SNAPSHOT.read_text())
except (OSError,ValueError):cache={'items':[],'checked':None,'available':False}
attempted=0
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
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
