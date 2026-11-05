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
  # Keep subscription notices explicit instead of inventing an article summary.
  summary=description[:200].rsplit(' ',1)[0]+'…' if len(description)>200 else description
  if re.search(r'premium content|subscribers only',description,re.I):summary='Subscription article. Read the original report on the publisher’s website.'
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
 items.extend([
  dict(title='Update on the current position towards Rye Lane',url='https://www.treeshepherd.org.uk/update-on-the-current-position-towards-rye-lane/',date='2026-10-16T00:00:00+00:00',source='Tree Shepherd',summary='A council letter dated 14 October, published by Tree Shepherd on 16 October, describes business-rates relief following the closure and the support being considered for traders.'),
  dict(title='Letter to businesses on Rye Lane',url='https://www.southwark.gov.uk/news/2026/letter-businesses-rye-lane',date='2026-09-23T00:00:00+00:00',source='Southwark Council',summary='A council update about the impact of the closure on local trade and support options under consideration at the time.'),
  dict(title='Rye Lane – updates and statement',url='https://www.southwark.gov.uk/news/2026/rye-lane-updates-and-statement',date='2026-09-11T00:00:00+00:00',source='Southwark Council',summary='Published 11 September and updated 12 September: the council reported that Rye Lane had reopened after emergency stabilisation works at 114–116 Rye Lane.')
 ])
 unique={i['url']:i for i in items}
 return dict(items=sorted(unique.values(),key=lambda i:i['date'],reverse=True)[:10],checked=datetime.now(timezone.utc).isoformat(),available=True)
