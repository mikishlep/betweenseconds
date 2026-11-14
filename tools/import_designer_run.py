"""Losslessly import the four original designer running strips; preserve all other animations."""
from pathlib import Path
import json,copy
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=ROOT/'objectTypes/HeroVisual.json';obj=json.loads(p.read_text())
 for index,(direction,name) in enumerate([('Up','бег_зад.png'),('Down','бег_анфас.png'),('Left','бег_влево.png'),('Right','бег.png')]):
  anim=next(a for a in obj['animations']['items'] if a['name']=='Walk'+direction)
  with Image.open(ROOT/'art/hero/run-source'/name) as sheet:
   assert sheet.size==(256,64) and sheet.mode=='RGBA'
   template=copy.deepcopy(anim['frames'][0]);anim['frames']=[]
   for i in range(4):
    sheet.crop((i*64,0,(i+1)*64,64)).save(ROOT/f'images/herovisual-walk{direction.lower()}-{i:03}.png')
    f=copy.deepcopy(template);f.update(width=64,height=64,originX=.5,originY=.5,imageSpriteId=9600000+index*4+i);anim['frames'].append(f)
 p.write_text(json.dumps(obj,ensure_ascii=False,indent='\t')+'\n')
if __name__=='__main__':main()
