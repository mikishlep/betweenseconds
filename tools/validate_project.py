"""Validate Construct resource contracts and a byte-exact distributable."""
import hashlib,json,zipfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def validate():
 project=json.loads((ROOT/'project.c3proj').read_text());ids={};sids={};uids={};referenced=set();frames=0
 def unique(store,value,where):
  assert value not in store,(value,store.get(value),where)
  store[value]=where
 def walk(o,path):
  if isinstance(o,dict):
   if 'sid'in o:unique(sids,o['sid'],path)
   if 'uid'in o:unique(uids,o['uid'],path)
   for k,v in o.items():walk(v,path+'/'+k)
  elif isinstance(o,list):
   for i,v in enumerate(o):walk(v,path+'/'+str(i))
 for folder in ['objectTypes','layouts','eventSheets']:
  for p in (ROOT/folder).glob('*.json'):
   if not p.name.endswith('.uistate.json'):walk(json.loads(p.read_text()),str(p.relative_to(ROOT)))
 for name in project['objectTypes']['items']:
  obj=json.loads((ROOT/f'objectTypes/{name}.json').read_text())
  for a in obj.get('animations',{}).get('items',[]):
   for i,f in enumerate(a['frames']):
    p=ROOT/f"images/{name.lower()}-{a['name'].lower()}-{i:03}.png"
    assert p.is_file(),p
    with Image.open(p)as im:assert im.size==(f['width'],f['height']),(p,im.size,f['width'],f['height'])
    unique(ids,f['imageSpriteId'],str(p));referenced.add(p);frames+=1
 for direction,filename in [('Up','бег_зад.png'),('Down','бег_анфас.png'),('Left','бег_влево.png'),('Right','бег.png')]:
  with Image.open(ROOT/'art/hero/run-source'/filename)as sheet:
   for i in range(4):
    with Image.open(ROOT/f'images/herovisual-walk{direction.lower()}-{i:03}.png')as frame:assert sheet.crop((64*i,0,64*(i+1),64)).tobytes()==frame.tobytes()
 for direction,filename in [('Up','атака_зад.png'),('Right','атака_право.png'),('Left','атака_лево.png'),('Down','атака_анфас.png')]:
  with Image.open(ROOT/'art/hero/source'/filename)as sheet:
   for i in range(5):
    with Image.open(ROOT/f'images/herovisual-attack{direction.lower()}-{i:03}.png')as frame:assert sheet.crop((64*i,0,64*(i+1),64)).tobytes()==frame.tobytes()
 layouts=[json.loads(p.read_text())for p in (ROOT/'layouts').glob('*.json')if not p.name.endswith('.uistate.json')]
 assert len(layouts)==2 and all(len(l['layers'])==2 for l in layouts)
 assert len((ROOT/'scripts/main.js').read_text().splitlines())<250
 archive=ROOT/'dist/BetweenSeconds-Prototype7.c3p'
 with zipfile.ZipFile(archive)as z:
  assert z.testzip()is None
  for name in z.namelist():assert z.read(name)==(ROOT/name).read_bytes(),name
  assert all(str(p.relative_to(ROOT))in z.namelist()for p in referenced)
  entries=len(z.namelist())
 return {'version':project['properties']['version'],'referenced_frames':frames,'archive_entries':entries,'object_types':len(project['objectTypes']['items']),'layouts':len(layouts),'layers_each':2,'unique_uid_sid_image_ids':True,'designer_run_frames_pixel_identical':16,'designer_attack_frames_pixel_identical':20,'package_byte_exact':True,'c3p_sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
if __name__=='__main__':print(json.dumps(validate(),ensure_ascii=False,indent=2))
