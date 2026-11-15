import sys, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image
# Run from any directory after installing numpy, Pillow, and opencv-python-headless.
root=Path(__file__).resolve().parent.parent
sources=[(root/'art-source/yosemite-sunrise.png','yosemite-detailed','Yosemite at sunrise','Destinations'),(root/'art-source/butterfly-wildflowers.png','butterfly-detailed','Butterfly & wildflowers','Nature')]
size=320
pages=[]
for path,id,title,cat in sources:
 image=Image.open(path).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
 quant=image.quantize(colors=20,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
 pal=quant.getpalette(); data=np.array(quant,dtype=np.uint8)
 # Merge small islands into the most common neighboring color. Recompute between passes.
 for iteration in range(8):
  small=[]
  for color in np.unique(data):
   n,labels,stats,_=cv2.connectedComponentsWithStats((data==color).astype(np.uint8),8)
   for j in range(1,n):
    if stats[j,cv2.CC_STAT_AREA]<32:
     x,y,w,h,area=stats[j];small.append((area,color,x,y,w,h,labels[y:y+h,x:x+w]==j))
  if not small:break
  changed=0
  for area,color,x,y,w,h,mask in small:
   # Skip an island changed since this pass began.
   crop=data[y:y+h,x:x+w]
   if np.any(crop[mask]!=color):continue
   xa=max(0,x-1);ya=max(0,y-1);xb=min(size,x+w+1);yb=min(size,y+h+1)
   local=np.zeros((yb-ya,xb-xa),np.uint8);local[y-ya:y-ya+h,x-xa:x-xa+w]=mask
   rim=(cv2.dilate(local,np.ones((3,3),np.uint8))>0)&(local==0)
   neighbors=data[ya:yb,xa:xb][rim];neighbors=neighbors[neighbors!=color]
   if len(neighbors):crop[mask]=np.bincount(neighbors,minlength=256).argmax();changed+=1
  if not changed:break
 shapes=[]; scale=400/size
 for color in sorted(np.unique(data)):
  count,labels,stats,_=cv2.connectedComponentsWithStats((data==color).astype(np.uint8),8)
  for j in range(1,count):
   if stats[j,cv2.CC_STAT_AREA]<4:continue
   mask=(labels==j).astype(np.uint8)
   dist=cv2.distanceTransform(mask,cv2.DIST_L2,5);_,_,_,pt=cv2.minMaxLoc(dist)
   # Expand half a pixel into shared edges to prevent hairline gaps in exports.
   expanded=cv2.dilate(mask,np.ones((3,3),np.uint8),iterations=1)
   contours,hier=cv2.findContours(expanded,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
   paths=[]
   for contour in contours:
    if cv2.contourArea(contour)<1:continue
    pts=cv2.approxPolyDP(contour,.55,True).reshape(-1,2)
    if len(pts)<3:continue
    coords=[(round(float(x)*scale,1),round(float(y)*scale,1)) for x,y in pts]
    paths.append('M'+' L'.join(f'{x} {y}' for x,y in coords)+'Z')
   if paths:shapes.append({'tag':'path','a':{'d':' '.join(paths),'fill-rule':'evenodd'},'x':round(pt[0]*scale,1),'y':round(pt[1]*scale,1),'n':int(color)+1})
 palette=['#%02x%02x%02x'%tuple(pal[i*3:i*3+3]) for i in range(20)]
 pages.append({'id':id,'title':title,'category':cat,'level':'Intricate','shapes':shapes,'palette':palette,'firstLabel':True,'detail':True})
 print(id, 'regions',len(shapes),'palette',len(set(p['n'] for p in shapes)))
(root/'detailed-art.js').write_text('const detailedPages='+json.dumps(pages,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
