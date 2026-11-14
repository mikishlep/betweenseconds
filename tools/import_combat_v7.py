"""Import dedicated neon cores/seals/complete beams and two ordinary enemy roles.

Source art is preserved. Extraction only crops and uniformly resamples with
nearest neighbour; light textures below are code-authored masks.
"""
import json,math,copy
from PIL import Image
from import_core_art import ROOT,animation,save_json
from import_combat_v6 import put

def row_frames(sheet,row,rows,size,crop_y=None):
 cells=[]
 for i in range(6):
  cell=sheet.crop((round(i*sheet.width/6),round(row*sheet.height/rows),round((i+1)*sheet.width/6),round((row+1)*sheet.height/rows)))
  if crop_y:cell=cell.crop((0,round(cell.height*crop_y[0]),cell.width,round(cell.height*crop_y[1])))
  # Uniform fit preserves shape. Do not squash square projectile art into beams.
  cell.thumbnail(size,Image.Resampling.NEAREST);frame=Image.new('RGBA',size);frame.alpha_composite(cell,((size[0]-cell.width)//2,(size[1]-cell.height)//2));cells.append(frame)
 return cells

def store_frames(typ,name,frames,index):
 a=animation(name,910000000000000+index,11000000+index*10,*frames[0].size);a['frames']=[]
 for i,frame in enumerate(frames):
  frame.save(ROOT/f'images/{typ.lower()}-{name.lower()}-{i:03}.png');a['frames'].append(animation('tmp',1,11000000+index*10+i,*frame.size)['frames'][0])
 put(typ,a)

def main():
 with Image.open(ROOT/'art/combat-v7/energy.png')as sheet:
  for index,row,typ,name in [(0,0,'Projectile','EchoOrb'),(1,1,'Projectile','VoidOrb'),(4,4,'CombatFx','EchoBurst'),(5,5,'CombatFx','VoidBurst')]:
   size=(64,64)if typ=='Projectile'else(96,96);store_frames(typ,name,row_frames(sheet,row,6,size),index)
  store_frames('CombatFx','VoidWell',row_frames(sheet,1,6,(96,96)),6)
 with Image.open(ROOT/'art/combat-v7/seals.png')as sheet:
  for row,name in enumerate(['EchoSeal','RegentSeal','BloomSeal']):store_frames('CombatMarker',name,row_frames(sheet,row,3,(128,128)),10+row)
 with Image.open(ROOT/'art/combat-v7/complete-beams.png')as sheet:
  for col,name in enumerate(['EchoRay','RegentRay']):
   frames=[]
   for row in range(6):
    cell=sheet.crop((round(col*sheet.width/2),round(row*sheet.height/6),round((col+1)*sheet.width/2),round((row+1)*sheet.height/6)));cell.thumbnail((512,128),Image.Resampling.NEAREST);frame=Image.new('RGBA',(512,128));frame.alpha_composite(cell,((512-cell.width)//2,(128-cell.height)//2));frames.append(frame)
   store_frames('CombatFx',name,frames,70+col)
 # The old Sigil name is retained as an authored rune seal for any saved instances.
 p=ROOT/'objectTypes/CombatMarker.json';o=json.loads(p.read_text());o['animations']['items']=[a for a in o['animations']['items'] if a['name']!='Sigil'];save_json(p,o)
 with Image.open(ROOT/'art/combat-v7/physical.png')as sheet:
  arrow=row_frames(sheet,0,3,(128,32),(.32,.68))
  store_frames('Projectile','Arrow',arrow,20);store_frames('Projectile','PlayerArrow',arrow,21)
  store_frames('CombatFx','StoneWave',row_frames(sheet,1,3,(128,128)),22)
  store_frames('CombatFx','RoyalCut',row_frames(sheet,2,3,(128,128)),23)
 with Image.open(ROOT/'art/combat-v7/enemies.png')as sheet:
  for row,name in enumerate(['Acolyte','Sentinel']):
   cells=[sheet.crop((round(i*sheet.width/8),round(row*sheet.height/2),round((i+1)*sheet.width/8),round((row+1)*sheet.height/2)))for i in range(8)]
   boxes=[im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox()for im in cells];assert all(boxes)
   box=(min(b[0]for b in boxes),min(b[1]for b in boxes),max(b[2]for b in boxes),max(b[3]for b in boxes));frames=[]
   for cell in cells:
    cell=cell.crop(box);cell.thumbnail((60,56),Image.Resampling.NEAREST);frame=Image.new('RGBA',(64,64));frame.alpha_composite(cell,((64-cell.width)//2,59-cell.height));frames.append(frame)
   for k,(pose,columns)in enumerate([('Idle',[0,1]),('Walk',[2,3,4]),('Windup',[5]),('Attack',[6,7])]):
    store_frames('TestEnemy',name+pose,[frames[i]for i in columns],30+row*10+k)
    p=ROOT/'objectTypes/TestEnemy.json';o=json.loads(p.read_text());a=next(a for a in o['animations']['items'] if a['name']==name+pose)
    for f in a['frames']:f['originY']=.72
    save_json(p,o)
 # Soft illumination is separate from the sharp pixel core: white alpha mask,
 # tinted by runtime. One texture serves light pools, not gameplay warnings.
 glow=Image.new('RGBA',(64,64))
 for y in range(64):
  for x in range(64):
   distance=math.hypot((x-31.5)/31.5,(y-31.5)/31.5);alpha=round(max(0,1-distance)**2*220);glow.putpixel((x,y),(255,255,255,alpha))
 store_frames('CombatFx','Glow',[glow],60)
 p=ROOT/'project.c3proj';o=json.loads(p.read_text());o['properties']['version']='0.7.1.0';save_json(p,o)
if __name__=='__main__':main()
