"""Reproducible atlas slicing plus code-authored geometric depth sprites."""
import copy,json
from pathlib import Path
from PIL import Image,ImageDraw
from import_core_art import animation,object_type,save_json,ROOT

def main():
    # Slicing and nearest-neighbor conversion only; original generated atlases retained.
    with Image.open(ROOT/'art/core/arena-oblique-v2.png') as sheet:
        for row,name in enumerate(['Color','Frozen']):
            sheet.crop((0,round(row*sheet.height/2),sheet.width,round((row+1)*sheet.height/2))).resize((1200,720),Image.Resampling.NEAREST).save(ROOT/f'images/arenafloor-{name.lower()}-000.png')
    with Image.open(ROOT/'art/core/neon-vfx-v2.png') as sheet:
        for row,(type_name,name) in enumerate([('CombatFx','Slash'),('CombatFx','Pulse'),('Projectile','Core')]):
            p=ROOT/f'objectTypes/{type_name}.json';obj=json.loads(p.read_text());old=next(a for a in obj['animations']['items'] if a['name']==name)
            anim=copy.deepcopy(old);anim['frames']=[]
            for col in range(6):
                cell=sheet.crop((round(col*sheet.width/6),round(row*sheet.height/3),round((col+1)*sheet.width/6),round((row+1)*sheet.height/3))).resize((128,128),Image.Resampling.NEAREST)
                cell.save(ROOT/f'images/{type_name.lower()}-{name.lower()}-{col:03}.png')
                frame=copy.deepcopy(old['frames'][0]);frame.update(width=128,height=128,imageSpriteId=9500000+row*10+col,originX=.5,originY=.5)
                anim['frames'].append(frame)
            obj['animations']['items']=[anim if a['name']==name else a for a in obj['animations']['items']];save_json(p,obj)
    p=ROOT/'objectTypes/CombatFx.json';obj=json.loads(p.read_text());hit=copy.deepcopy(next(a for a in obj['animations']['items'] if a['name']=='Pulse'));hit.update(name='Hit',sid=850000000000260)
    for i,frame in enumerate(hit['frames']):
        frame['imageSpriteId']=9500040+i
        with Image.open(ROOT/f'images/combatfx-pulse-{i:03}.png') as image:image.save(ROOT/f'images/combatfx-hit-{i:03}.png')
    obj['animations']['items']=[hit if a['name']=='Hit' else a for a in obj['animations']['items']];save_json(p,obj)
    # Geometric runtime sprites, kept separate from generated art.
    shadow=Image.new('RGBA',(64,32));d=ImageDraw.Draw(shadow)
    d.ellipse((0,2,63,29),fill=(4,8,18,40));d.ellipse((5,6,58,26),fill=(4,8,18,90));d.ellipse((12,9,52,23),fill=(4,8,18,125));shadow.save(ROOT/'images/actorshadow-shadow-000.png')
    save_json(ROOT/'objectTypes/ActorShadow.json',object_type('ActorShadow',10,[animation('Shadow',850000000000200,9500100,64,32)]))
    face=Image.new('RGBA',(64,16),'#17202e');d=ImageDraw.Draw(face)
    d.rectangle((0,0,63,2),fill='#43536c');d.line((0,8,63,8),fill='#0e1622',width=1);d.line((22,3,22,8),fill='#101824');d.line((43,9,43,15),fill='#101824');d.line((0,15,63,15),fill='#080e18');face.save(ROOT/'images/wallface-stone-000.png')
    save_json(ROOT/'objectTypes/WallFace.json',object_type('WallFace',11,[animation('Stone',850000000000201,9500101,64,16)]))
    # Beveled top of the original collision wall. Physics dimensions are unchanged.
    top=Image.new('RGBA',(32,32),'#38475a');d=ImageDraw.Draw(top);d.line((0,0,31,0),fill='#7b91aa',width=2);d.line((0,0,0,31),fill='#5c718b',width=2);d.line((31,0,31,31),fill='#1a2739',width=2);d.line((0,31,31,31),fill='#152034',width=2);d.line((2,15,29,15),fill='#2e3c50');top.save(ROOT/'images/wall-core-000.png')
    p=ROOT/'objectTypes/Wall.json';obj=json.loads(p.read_text());obj['animations']['items']=[a for a in obj['animations']['items'] if a['name']!='Core']+[animation('Core',850000000000202,9500102,32,32)];save_json(p,obj)
    # Thin ground telegraph: flattened neon ellipse, no fireworks/star particles.
    ring=Image.new('RGBA',(64,64));d=ImageDraw.Draw(ring)
    d.ellipse((1,17,62,48),fill=(255,60,166,16),outline=(255,48,168,75),width=5);d.ellipse((3,19,60,46),outline='#ff6fc5',width=2);d.arc((5,21,58,44),190,350,fill='#fff2fc',width=1);ring.save(ROOT/'images/combatmarker-ring-000.png')
    # Upright, hollow portal reads as a shallow arch, so the actor remains visible inside.
    portal=Image.new('RGBA',(64,96));d=ImageDraw.Draw(portal)
    d.rounded_rectangle((9,6,54,90),radius=20,fill=(66,215,255,22),outline='#208ab8',width=5);d.rounded_rectangle((12,9,51,87),radius=18,outline='#81edff',width=3);d.arc((15,12,48,55),180,360,fill='#f0ffff',width=2);d.ellipse((4,78,59,93),outline='#63e3ff',width=2);portal.save(ROOT/'images/exit-core-000.png')
    p=ROOT/'objectTypes/Exit.json';obj=json.loads(p.read_text());obj['animations']['items']=[a for a in obj['animations']['items'] if a['name']!='Core']+[animation('Core',850000000000203,9500103,64,96)];save_json(p,obj)
if __name__=='__main__':main()
