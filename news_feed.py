"""Read public Southwark News RSS search results, preserving source dates."""
import urllib.request, xml.etree.ElementTree as ET, re, html
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from concurrent.futures import ThreadPoolExecutor

def fetch_page(page):
 url=f'https://southwarknews.co.uk/?s=Rye+Lane&feed=rss2&paged={page}'
 req=urllib.request.Request(url,headers={'User-Agent':'RyeLaneCommunityPreview/1.0 (RSS reader)'})
 with urllib.request.urlopen(req,timeout=15) as response: body=response.read(2_000_000)
 items=[]
 for item in ET.fromstring(body).findall('.//item'):
  title=html.unescape(item.findtext('title',''))
  description=' '.join(re.sub('<[^>]+>',' ',html.unescape(item.findtext('description',''))).split())
  if not re.search(r'\brye\s+lane\b',title+' '+description,re.I):continue
  url=item.findtext('link','')
  from urllib.parse import urlparse
  parsed=urlparse(url)
  if parsed.scheme!='https' or parsed.hostname not in ['southwarknews.co.uk','www.southwarknews.co.uk']:continue
  try: date=parsedate_to_datetime(item.findtext('pubDate','')).astimezone(timezone.utc)
  except (ValueError,TypeError):continue
  if date>datetime.now(timezone.utc):continue
  # A short source excerpt, not an invented synopsis.
  summary=description[:200].rsplit(' ',1)[0]+'…' if len(description)>200 else description
  items.append(dict(title=title,url=url,date=date.isoformat(),source='Southwark News',summary=summary))
 return items

def collect():
 items=[];success=False
 with ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(fetch_page,p) for p in range(1,4)]
  for f in futures:
   try:items.extend(f.result());success=True
   except Exception:pass
 if not success:raise RuntimeError('RSS unavailable')
 unique={i['url']:i for i in items}
 return dict(items=sorted(unique.values(),key=lambda i:i['date'],reverse=True)[:10],checked=datetime.now(timezone.utc).isoformat(),available=True)
