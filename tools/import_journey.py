"""Import the selected journey sheets; preserve designer/approved boss art."""
import json,copy
from PIL import Image
from import_core_art import ROOT,animation,object_type,save_json

def put(type_name,a):
 p=ROOT/f'objectTypes/{type_name}.json';o=json.loads(p.read_text());o['animations']['items']=[old for old in o['animations']['items'] if old['name']!=a['name']]+[a];save_json(p,o)
def main():
 for z,zone in enumerate(['Garden','City','Archive','Citadel','Source']):
  with Image.open(ROOT/f'art/journey/{zone}.png') as im:
   for row,state in enumerate(['Color','Frozen']):
    name=zone+state;im.crop((0,round(row*im.height/2),im.width,round((row+1)*im.height/2))).resize((1200,720),Image.Resampling.NEAREST).save(ROOT/f'images/arenafloor-{name.lower()}-000.png')
    put('ArenaFloor',animation(name,890000000000100+z*2+row,9900000+z*2+row,1200,720))
 save_json(ROOT/'objectTypes/WorldProp.json',object_type('WorldProp',40,[]))
 with Image.open(ROOT/'art/journey/props.png') as im:
  for col,(type_name,name,size) in enumerate([('WallFace','Barricade',(128,64)),('WorldProp','Chest',(64,56)),('WorldProp','ChestOpen',(64,56)),('CombatFx','Rift',(128,128))]):
   cell=im.crop((round(col*im.width/4),0,round((col+1)*im.width/4),im.height));box=cell.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert box
   cell=cell.crop(box);cell.thumbnail(size,Image.Resampling.NEAREST);frame=Image.new('RGBA',size);frame.alpha_composite(cell,((size[0]-cell.width)//2,size[1]-cell.height))
   a=animation(name,890000000000200+col,9900100+col,*size)
   if name=='Rift':
    a['frames']=[]
    for i in range(6):
     frame.save(ROOT/f'images/combatfx-rift-{i:03}.png');f=animation('tmp',1,9900200+i,*size)['frames'][0];a['frames'].append(f)
   else:frame.save(ROOT/f'images/{type_name.lower()}-{name.lower()}-000.png')
   put(type_name,a)
 p=ROOT/'project.c3proj';o=json.loads(p.read_text());o['properties']['version']='0.5.0.0'
 if 'WorldProp' not in o['objectTypes']['items']:o['objectTypes']['items'].append('WorldProp')
 save_json(p,o)
 for name in ['Tutorial','Макет 1']:
  p=ROOT/f'layouts/{name}.json';o=json.loads(p.read_text());scene=o['layers'][0]
  for inst in scene['instances']:
   if inst['type']=='ArenaFloor':inst['properties']['initial-animation']='GardenFrozen'
   if inst['type']=='TimeFragment' and inst['world']['y']<300:inst['world']['y']=270
   if inst['type']=='Wall' and not inst['properties']['initially-visible']:
    if inst['world']['y']<100:inst['world']['y']=80;inst['world']['height']=260
    elif inst['world']['y']>650:inst['world']['y']=690;inst['world']['height']=140
  if not any(i['type']=='WorldProp' for i in scene['instances']):
   seed=copy.deepcopy(next(i for i in scene['instances'] if i['type']=='WallFace'));seed.update(type='WorldProp',uid=20000001,sid=890000000000500+(0 if name=='Tutorial' else 1));seed['world'].update(x=-600,y=-600,width=64,height=56);seed['properties']['initial-animation']='Chest';scene['instances'].append(seed)
  for inst in scene['instances']:
   if inst['type']=='WorldProp':inst['uid']=20000001+(0 if name=='Tutorial' else 1)
  save_json(p,o)
 mini=ROOT/'art/journey/minibosses.png'
 if mini.exists():
  p=ROOT/'objectTypes/TestEnemy.json';o=json.loads(p.read_text())
  with Image.open(mini) as im:
   for row,base in enumerate(['Bulwark','Viper','Shade']):
    cells=[im.crop((round(c*im.width/8),round(row*im.height/3),round((c+1)*im.width/8),round((row+1)*im.height/3))) for c in range(8)]
    boxes=[c.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox() for c in cells];assert all(boxes)
    box=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    frames=[]
    for c in cells:
     c=c.crop(box);c.thumbnail((92,120),Image.Resampling.NEAREST);frame=Image.new('RGBA',(96,128));frame.alpha_composite(c,((96-c.width)//2,123-c.height));frames.append(frame)
    for state_index,(state,cols) in enumerate([('Idle',[0,1]),('Walk',[2,3,4]),('Windup',[5]),('Attack',[6,7])]):
     a=animation(base+state,890000000000600+row*10+state_index,9901000+row*100,96,128);a['frames']=[];a['isLooping']=state in ['Idle','Walk']
     for i,c in enumerate(cols):
      frames[c].save(ROOT/f'images/testenemy-{base.lower()}{state.lower()}-{i:03}.png');f=animation('tmp',1,9901000+row*100+state_index*10+i,96,128)['frames'][0];f['originY']=.86;a['frames'].append(f)
     o['animations']['items']=[old for old in o['animations']['items'] if old['name']!=a['name']]+[a]
  save_json(p,o)
if __name__=='__main__':main()
