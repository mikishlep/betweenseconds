"""Normalize menacing NPC art, using small pixel frames and a common foot anchor."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=ROOT/'objectTypes/TestEnemy.json';obj=json.loads(p.read_text())
 atlases=[('enemies-simple.png',['Shooter','Hunter','Warden']),('bosses-simple.png',['Echo','Regent'])]
 for filename,names in atlases:
  source=ROOT/'art/polish'/filename
  if not source.exists():continue
  with Image.open(source) as sheet:
   for index,name in enumerate(names):
    cell=sheet.crop((round(index*sheet.width/len(names)),0,round((index+1)*sheet.width/len(names)),sheet.height));cell=cell.crop(cell.getbbox());cell.thumbnail((90,116),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',(96,128));canvas.alpha_composite(cell,((96-cell.width)//2,122-cell.height));canvas.save(ROOT/f'images/testenemy-{name.lower()}-000.png')
    a=next((a for a in obj['animations']['items'] if a['name']==name),None)
    if a is None:
     import copy
     a=copy.deepcopy(obj['animations']['items'][-1]);a.update(name=name,sid=870000000000200+index);obj['animations']['items'].append(a)
    f=a['frames'][0];f.update(width=96,height=128,originX=.5,originY=.82,imageSpriteId=9700000+(['Shooter','Hunter','Warden','Echo','Regent'].index(name)))
 order=['Animation 1','Prototype','Shooter','Hunter','Warden','Echo','Regent']
 obj['animations']['items'].sort(key=lambda a:order.index(a['name']) if a['name'] in order else 99)
 p.write_text(json.dumps(obj,ensure_ascii=False,indent='\t')+'\n')
 # The spell's visible white core is the hit position; its tail stays behind it.
 p=ROOT/'objectTypes/Projectile.json';obj=json.loads(p.read_text())
 for a in obj['animations']['items']:
  if a['name']=='Core':
   for f in a['frames']:f['originX']=.85
 p.write_text(json.dumps(obj,ensure_ascii=False,indent='\t')+'\n')
if __name__=='__main__':main()
