"""Import generated atlas cells and author simple geometric combat indicators."""
import copy,json
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def save_json(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent='\t')+'\n')
def animation(name,sid,image_id,width=64,height=64):
    template=json.loads((ROOT/'objectTypes/Player.json').read_text())['animations']['items'][-1]
    a=copy.deepcopy(template);a.update(name=name,sid=sid,speed=0,isLooping=False)
    f=a['frames'][0];f.update(width=width,height=height,originX=.5,originY=.5,imageSpriteId=image_id,useCollisionPoly=False)
    return a
def object_type(name,index,anims):
    return {'name':name,'plugin-id':'Sprite','sid':840000000000100+index,'isGlobal':False,'editorNewInstanceIsReplica':True,'instanceVariables':[],'behaviorTypes':[],'effectTypes':[],'animations':{'items':anims,'subfolders':[]}}
def shape(name,kind):
    im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
    if kind=='Slash':
        d.arc((2,2,61,61),-68,68,fill='#80efff',width=5);d.arc((8,8,55,55),-60,60,fill='#edffff',width=2)
    elif kind=='Hit':
        d.line((15,15,49,49),fill='#b9ffff',width=4);d.line((15,49,49,15),fill='#6ceaff',width=4);d.ellipse((26,26,38,38),fill='#ffffff')
    elif kind=='Aim':d.line((0,32,63,32),fill='white',width=3);d.polygon([(55,26),(63,32),(55,38)],fill='white')
    else:d.ellipse((3,3,60,60),outline='#7ceeff' if kind=='Pulse' else 'white',width=3)
    im.save(ROOT/f'images/{name.lower()}-{kind.lower()}-000.png')
def main():
    floor=[]
    with Image.open(ROOT/'art/core/arena-atlas.png') as im:
        for i,name in enumerate(['Color','Frozen']):
            im.crop((0,round(i*im.height/2),im.width,round((i+1)*im.height/2))).resize((1200,720),Image.Resampling.NEAREST).save(ROOT/f'images/arenafloor-{name.lower()}-000.png')
            floor.append(animation(name,840000000000200+i,9400000+i,1200,720))
    save_json(ROOT/'objectTypes/ArenaFloor.json',object_type('ArenaFloor',0,floor))
    path=ROOT/'objectTypes/TestEnemy.json';enemy=json.loads(path.read_text());enemy['animations']['items']=[a for a in enemy['animations']['items'] if a['name'] not in ['Shooter','Hunter','Warden']]
    with Image.open(ROOT/'art/core/enemy-atlas.png') as sheet:
        for i,name in enumerate(['Shooter','Hunter','Warden']):
            cell=sheet.crop((round(i*sheet.width/3),0,round((i+1)*sheet.width/3),sheet.height));bbox=cell.getbbox();assert bbox
            cell=cell.crop(bbox);cell.thumbnail((60,60),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(64,64));frame.alpha_composite(cell,((64-cell.width)//2,62-cell.height));frame.save(ROOT/f'images/testenemy-{name.lower()}-000.png')
            enemy['animations']['items'].append(animation(name,840000000000210+i,9400010+i))
    save_json(path,enemy)
    for type_index,(name,kinds) in enumerate([('CombatFx',['Slash','Pulse','Hit']),('CombatMarker',['Ring','Aim'])],1):
        anims=[]
        for i,kind in enumerate(kinds):
            shape(name,kind);anims.append(animation(kind,840000000000220+type_index*10+i,9400020+type_index*10+i))
        save_json(ROOT/f'objectTypes/{name}.json',object_type(name,type_index,anims))
    for name in ['Projectile','ProjectileGuide']:
        p=ROOT/f'objectTypes/{name}.json';obj=json.loads(p.read_text());obj['animations']['items']=[a for a in obj['animations']['items'] if a['name']!='Core']
        im=Image.new('RGBA',(32,16));d=ImageDraw.Draw(im)
        if name=='Projectile':d.polygon([(1,5),(22,5),(22,1),(31,8),(22,15),(22,11),(1,11)],fill='#ff4fbd');d.polygon([(24,5),(29,8),(24,11)],fill='#fff0ff')
        else:d.rectangle((0,6,31,9),fill='white')
        im.save(ROOT/f'images/{name.lower()}-core-000.png');idx=0 if name=='Projectile' else 1
        obj['animations']['items'].append(animation('Core',840000000000260+idx,9400060+idx,32,16));save_json(p,obj)
if __name__=='__main__':main()
