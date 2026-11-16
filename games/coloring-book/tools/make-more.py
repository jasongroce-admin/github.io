import sys, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image
# Run from any directory after installing numpy, Pillow, and opencv-python-headless.
root=Path(__file__).resolve().parent.parent
configs=[('valley-fire', 'Valley of Fire · Nevada', 'Destinations', 'Hard', ['State Parks', 'Nature']), ('valley-fire', 'Valley of Fire · Medium', 'Destinations', 'Medium', ['State Parks', 'Nature']), ('valley-fire', 'Valley of Fire · Easy', 'Destinations', 'Easy', ['State Parks', 'Nature']), ('yellowstone-geyser', 'Old Faithful · Yellowstone', 'Destinations', 'Hard', []), ('yellowstone-geyser', 'Old Faithful · Medium', 'Destinations', 'Medium', []), ('yellowstone-prismatic', 'Grand Prismatic · Yellowstone', 'Destinations', 'Hard', []), ('yellowstone-bison', 'Bison in Lamar Valley', 'Destinations', 'Hard', ['Nature']), ('yellowstone-bison', 'Bison in the meadow', 'Destinations', 'Medium', ['Nature']), ('dog-meadow', 'Golden retriever in a meadow', 'Dogs & Cats', 'Medium', ['Kids']), ('cat-window', 'Tabby by the window', 'Dogs & Cats', 'Medium', ['Kids']), ('dogs-flowers', 'Dogs in the garden', 'Dogs & Cats', 'Hard', ['Kids']), ('cats-garden', 'Cats in the garden', 'Dogs & Cats', 'Hard', ['Kids']), ('cozy-cottage', 'Woodland cottage', 'Cozy', 'Hard', []), ('cozy-cottage', 'Woodland cottage · Medium', 'Cozy', 'Medium', []), ('garden-mandala', 'Wildflower mandala', 'Patterns', 'Hard', []), ('red-rock', 'Red Rock Canyon - Nevada', 'Destinations', 'Hard', ['Nature']), ('bryce', 'Bryce Canyon · Utah', 'Destinations', 'Hard', ['Nature']), ('grand-canyon', 'Grand Canyon at sunset', 'Destinations', 'Hard', ['Nature']), ('death-valley', 'Death Valley - California', 'Destinations', 'Hard', ['Nature']), ('joshua-tree', 'Joshua Tree - California', 'Destinations', 'Hard', ['Nature']), ('redwoods', 'Among the redwoods', 'Destinations', 'Hard', ['Nature', 'State Parks']), ('san-andreas', 'San Andreas Fault overlook', 'Destinations', 'Hard', ['Nature']), ('alien-highway', 'Extraterrestrial Highway - Rachel', 'Destinations', 'Hard', []), ('turkey-run', 'Turkey Run - Indiana', 'State Parks', 'Hard', ['Nature']), ('palo-duro', 'Palo Duro Canyon - Texas', 'State Parks', 'Hard', ['Nature']), ('custer', 'Custer - South Dakota', 'State Parks', 'Hard', ['Nature']), ('watkins-glen', 'Watkins Glen - New York', 'State Parks', 'Hard', ['Nature']), ('red-rock', 'Red Rock Canyon - Medium', 'Destinations', 'Medium', ['Nature']), ('bryce', 'Bryce Canyon · Medium', 'Destinations', 'Medium', ['Nature']), ('turkey-run', 'Turkey Run - Medium', 'State Parks', 'Medium', ['Nature']), ('palo-duro', 'Palo Duro Canyon - Medium', 'State Parks', 'Medium', ['Nature']), ('fire-wave', 'Fire Wave - Valley of Fire', 'State Parks', 'Hard', ['Destinations', 'Nature']), ('fire-wave', 'Fire Wave - Medium', 'State Parks', 'Medium', ['Destinations', 'Nature']), ('bryce-sunrise-point', 'Sunrise Point - Bryce Canyon', 'Destinations', 'Hard', ['Nature']), ('bryce-sunrise-point', 'Sunrise Point - Medium', 'Destinations', 'Medium', ['Nature']), ('mather-point', 'Mather Point - Grand Canyon', 'Destinations', 'Hard', ['Nature']), ('artist-point', 'Artist Point, Yellowstone - Hard', 'Destinations', 'Hard', ['Nature']), ('artist-point', 'Artist Point, Yellowstone - Medium', 'Destinations', 'Medium', ['Nature'])]
size=320
pages=[]
for source,title,cat,level,tags in configs:
 id=source+('-easy' if level=='Easy' else '-medium' if level=='Medium' else '-hard')
 path=root/'art-source'/(source+'.png')
 image=Image.open(path).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
 color_count=9 if level=='Easy' else 14 if level=='Medium' else 24 if source in {'red-rock','bryce','grand-canyon','death-valley','joshua-tree','redwoods','san-andreas','alien-highway','turkey-run','palo-duro','custer','watkins-glen','fire-wave','bryce-sunrise-point','mather-point','artist-point'} else 20
 quant=image.quantize(colors=color_count,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
 pal=quant.getpalette(); data=np.array(quant,dtype=np.uint8)
 # Merge small islands into the most common neighboring color. Recompute between passes.
 for iteration in range(8):
  small=[]
  for color in np.unique(data):
   n,labels,stats,_=cv2.connectedComponentsWithStats((data==color).astype(np.uint8),8)
   for j in range(1,n):
    if stats[j,cv2.CC_STAT_AREA]<(450 if level=='Easy' else 160 if level=='Medium' else 32):
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
 shapes=[]; masks=[]; scale=400/size
 preview=np.full((size,size,3),250,dtype=np.uint8)
 for color in sorted(np.unique(data)):
  count,labels,stats,_=cv2.connectedComponentsWithStats((data==color).astype(np.uint8),8)
  for j in range(1,count):
   if stats[j,cv2.CC_STAT_AREA]<4:continue
   mask=(labels==j).astype(np.uint8)
   dist=cv2.distanceTransform(mask,cv2.DIST_L2,5);_,_,_,pt=cv2.minMaxLoc(dist)
   # Expand half a pixel into shared edges to prevent hairline gaps in exports.
   expanded=cv2.dilate(mask,np.ones((3,3),np.uint8),iterations=1)
   contours,hier=cv2.findContours(expanded,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
   paths=[]; polygons=[]
   for contour in contours:
    if cv2.contourArea(contour)<1:continue
    pts=cv2.approxPolyDP(contour,.55,True).reshape(-1,2)
    if len(pts)<3:continue
    polygons.append(pts.astype(np.int32))
    coords=[(round(float(x)*scale,1),round(float(y)*scale,1)) for x,y in pts]
    paths.append('M'+' L'.join(f'{x} {y}' for x,y in coords)+'Z')
   if paths:
    cv2.drawContours(preview,contours,-1,(120,120,120),1)
    path_mask=np.zeros((size,size),dtype=np.uint8)
    cv2.fillPoly(path_mask,polygons,1)
    masks.append(path_mask)
    shapes.append({'tag':'path','a':{'d':' '.join(paths),'fill-rule':'evenodd'},'x':round(pt[0]*scale,1),'y':round(pt[1]*scale,1),'n':int(color)+1})
 # Only keep regions with a visible area after neighboring panes overlap, and
 # put each number on the visible part of its own pane.
 owner=np.full((size,size),-1,dtype=np.int32)
 for index,part in enumerate(masks):owner[part>0]=index
 kept=[]
 for index,shape in enumerate(shapes):
  visible=(owner==index).astype(np.uint8)
  if not np.any(visible):continue
  distance=cv2.distanceTransform(visible,cv2.DIST_L2,5);_,_,_,pt=cv2.minMaxLoc(distance)
  shape['x']=round(pt[0]*scale,1);shape['y']=round(pt[1]*scale,1)
  kept.append(shape)
 shapes=kept
 palette=['#%02x%02x%02x'%tuple(pal[i*3:i*3+3]) for i in range(color_count)]
 pages.append({'id':id,'title':title,'category':cat,'level':level,'tags':tags,'shapes':shapes,'palette':palette,'firstLabel':True,'detail':True})
 preview_dir=root/'previews';preview_dir.mkdir(exist_ok=True)
 cv2.imwrite(str(preview_dir/(id+'.png')),preview)
 print(id, 'regions',len(shapes),'palette',len(set(p['n'] for p in shapes)))
(root/'more-art.js').write_text('const morePages='+json.dumps(pages,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
