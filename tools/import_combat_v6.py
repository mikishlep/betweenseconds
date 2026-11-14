"""Final import: distinct attacks, real boss forms, memory relics, physical gates."""
import copy,json,math
from PIL import Image,ImageDraw
from import_core_art import ROOT,animation,save_json

def put(type_name,a):
 p=ROOT/f'objectTypes/{type_name}.json';o=json.loads(p.read_text());o['animations']['items']=[old for old in o['animations']['items'] if old['name']!=a['name']]+[a];save_json(p,o)
def alias(type_name,name,source_type,source_name,index):
 source=json.loads((ROOT/f'objectTypes/{source_type}.json').read_text());a=copy.deepcopy(next(a for a in source['animations']['items'] if a['name']==source_name));a.update(name=name,sid=900000000001000+index)
 for i,f in enumerate(a['frames']):
  f['imageSpriteId']=10100000+index*10+i
  with Image.open(ROOT/f'images/{source_type.lower()}-{source_name.lower()}-{i:03}.png')as im:im.save(ROOT/f'images/{type_name.lower()}-{name.lower()}-{i:03}.png')
 put(type_name,a)
def main():
 for b,base in enumerate(['Warden','Echo','Regent']):
  with Image.open(ROOT/f'art/combat-v6/{base}-phases.png')as im:
   for row in range(2):
    cells=[im.crop((round(c*im.width/8),round(row*im.height/2),round((c+1)*im.width/8),round((row+1)*im.height/2)))for c in range(8)]
    boxes=[c.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox()for c in cells];assert all(boxes)
    box=(min(p[0]for p in boxes),min(p[1]for p in boxes),max(p[2]for p in boxes),max(p[3]for p in boxes));frames=[]
    for c in cells:
     c=c.crop(box);c.thumbnail((92,120),Image.Resampling.NEAREST);frame=Image.new('RGBA',(96,128));frame.alpha_composite(c,((96-c.width)//2,123-c.height));frames.append(frame)
    for state_index,(state,cols)in enumerate([('Idle',[0,1]),('Walk',[2,3,4]),('Windup',[5]),('Attack',[6,7])]):
     name=base+str(row+2)+state;a=animation(name,900000000000100+b*100+row*10+state_index,10000000,96,128);a['frames']=[];a['isLooping']=state in ['Idle','Walk']
     for i,c in enumerate(cols):
      frames[c].save(ROOT/f'images/testenemy-{name.lower()}-{i:03}.png');f=animation('tmp',1,10000000+b*1000+row*100+state_index*10+i,96,128)['frames'][0];f['originY']=.86;a['frames'].append(f)
     put('TestEnemy',a)
 with Image.open(ROOT/'art/combat-v6/distinct-fx.png')as im:
  for row,(typ,name)in enumerate([('CombatFx','SteelCut'),('CombatFx','StoneImpact'),('Projectile','EchoOrb'),('Projectile','RegentLance'),('Projectile','ShadowNeedle'),('TimeFragment','Memory')]):
   a=animation(name,900000000000500+row,10010000+row*10,128,128);a['frames']=[]
   for i in range(6):
    c=im.crop((round(i*im.width/6),round(row*im.height/6),round((i+1)*im.width/6),round((row+1)*im.height/6))).resize((128,128),Image.Resampling.NEAREST);c.save(ROOT/f'images/{typ.lower()}-{name.lower()}-{i:03}.png');f=animation('tmp',1,10010000+row*10+i,128,128)['frames'][0]
    if name in ['RegentLance','ShadowNeedle']:f['originX']=.85
    a['frames'].append(f)
   put(typ,a)
 for i,args in enumerate([
  ('CombatFx','RoseThrust','Projectile','Petal'),('CombatFx','EchoBurst','Projectile','EchoOrb'),('CombatFx','EchoBeam','Projectile','EchoOrb'),('CombatFx','RoyalCut','Projectile','RegentLance'),('CombatFx','RegentBeam','Projectile','RegentLance'),('CombatFx','VoidBurst','Projectile','RegentLance'),('CombatFx','ShadowCut','Projectile','ShadowNeedle'),('CombatFx','PlayerImpact','CombatFx','StoneImpact'),('CombatFx','PlayerRose','CombatFx','RoseSweep'),('Projectile','PlayerArrow','Projectile','Arrow'),('Projectile','PlayerLance','Projectile','RegentLance')]):alias(*args,i)
 # Geometric warning masks are code-authored and exactly match the danger footprint.
 for i,name in enumerate(['Sigil','Stone']):
  im=Image.new('RGBA',(128,128));d=ImageDraw.Draw(im)
  if name=='Sigil':
   d.polygon([(64,3),(124,64),(64,124),(3,64)],fill=(116,78,205,55),outline=(176,164,248,220),width=3);d.rectangle((31,31,96,96),outline=(125,211,255,210),width=3)
  else:
   d.ellipse((3,3,124,124),fill=(167,132,85,55),outline=(226,202,153,215),width=4)
   for a in range(0,360,60):
    angle=math.radians(a);d.line((64+math.cos(angle)*20,64+math.sin(angle)*20,64+math.cos(angle)*57,64+math.sin(angle)*57),fill=(225,199,152,190),width=3)
  im.save(ROOT/f'images/combatmarker-{name.lower()}-000.png');put('CombatMarker',animation(name,900000000002000+i,10200000+i,128,128))
 # A wide ground warning, with no 128px transparent padding squeezing it thin.
 lane=Image.new('RGBA',(128,32));d=ImageDraw.Draw(lane)
 d.polygon([(1,2),(105,2),(126,16),(105,29),(1,29)],fill=(160,42,92,83),outline=(225,119,163,185),width=2)
 for x in [28,58,88]:d.line([(x,8),(x+10,16),(x,24)],fill=(236,149,183,170),width=2)
 lane.save(ROOT/'images/combatmarker-lane-000.png');put('CombatMarker',animation('Lane',900000000002020,10200020,128,32))
 p=ROOT/'objectTypes/WorldProp.json';o=json.loads(p.read_text());o['animations']['items']=[a for a in o['animations']['items'] if a['name']!='Gate'];save_json(p,o)
 with Image.open(ROOT/'art/combat-v6/weapons.png')as im:
  for i,name in enumerate(['Blade','Maul','Bow','Rose','Lance']):
   cell=im.crop((round(i*im.width/5),0,round((i+1)*im.width/5),im.height));box=cell.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert box
   cell=cell.crop(box);cell.thumbnail((30,30),Image.Resampling.NEAREST);frame=Image.new('RGBA',(32,32));frame.alpha_composite(cell,(1,(32-cell.height)//2));frame.save(ROOT/f'images/worldprop-weapon{name.lower()}-000.png')
   a=animation('Weapon'+name,900000000002100+i,10200100+i,32,32);a['frames'][0]['originX']=.12;put('WorldProp',a)
 # Projectile anchors cannot be reused for centered area effects.
 p=ROOT/'objectTypes/CombatFx.json';o=json.loads(p.read_text())
 for a in o['animations']['items']:
  if a['name']in ['RoseThrust','EchoBurst','EchoBeam','RoyalCut','RegentBeam','VoidBurst','ShadowCut']:
   for f in a['frames']:f['originX']=.5;f['originY']=.5
 save_json(p,o)
 p=ROOT/'project.c3proj';o=json.loads(p.read_text());o['properties']['version']='0.6.0.0';save_json(p,o)
 for name in ['Tutorial','Макет 1']:
  p=ROOT/f'layouts/{name}.json';o=json.loads(p.read_text())
  for l in o['layers']:
   for inst in l['instances']:
    if inst['type']=='Exit':inst['properties']['initially-visible']=False
    if inst['type']=='TimeFragment':inst['properties']['initial-animation']='Memory';inst['world']['width']=18;inst['world']['height']=24
  save_json(p,o)
if __name__=='__main__':main()
