"""Slice generated animation sheets; draw exact geometric ground warning masks.

Original RGBA sheets stay in art/combat-v4. Only cropping/nearest resampling:
no recoloring, invented in-between frames, or alpha removal.
"""
import copy, json, math
from PIL import Image, ImageDraw
from import_core_art import ROOT, animation, save_json

def main():
    path=ROOT/'objectTypes/TestEnemy.json';obj=json.loads(path.read_text())
    states=[('Idle',[0,1]),('Walk',[2,3,4]),('Windup',[5]),('Attack',[6,7])]
    names=['Shooter','Hunter','Warden','Echo','Regent']
    keep=[a for a in obj['animations']['items'] if not any(a['name'].startswith(n) for n in names)]
    anims=[]
    for filename,rows,total_rows in [('enemy-animations.png',names[:2],3),('boss-animations.png',names[2:],3)]:
        with Image.open(ROOT/'art/combat-v4'/filename) as sheet:
            # A common crop/scale for every pose prevents body size changing when a weapon extends.
            for row,name in enumerate(rows):
                idx=names.index(name);boss=idx>=2;size=(96,128) if boss else (64,64)
                # Explicit bands prevent the hunter crop including the next row's halo.
                bands=[(0,224),(224,420)] if filename=='enemy-animations.png' else [(0,256),(256,512),(512,768)]
                top,bottom=bands[row]
                cells=[sheet.crop((round(c*sheet.width/8),top,round((c+1)*sheet.width/8),bottom)) for c in range(8)]
                # Bounding-box detection ignores near-transparent generator edge noise; alpha itself is preserved.
                boxes=[cell.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox() for cell in cells]
                assert all(boxes),filename
                box=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
                frames=[]
                for cell in cells:
                    cell=cell.crop(box);cell.thumbnail((size[0]-4,size[1]-8 if boss else 48),Image.Resampling.NEAREST)
                    frame=Image.new('RGBA',size);frame.alpha_composite(cell,((size[0]-cell.width)//2,size[1]-5-cell.height));frames.append(frame)
                for state_index,(state,cols) in enumerate(states):
                    a=animation(name+state,880000000000100+idx*10+state_index,9800000+idx*100,size[0],size[1]);a['frames']=[];a['isLooping']=state in ['Idle','Walk']
                    for j,col in enumerate(cols):
                        frames[col].save(ROOT/f'images/testenemy-{name.lower()}{state.lower()}-{j:03}.png')
                        f=animation('temp',1,9800000+idx*100+state_index*10+j,*size)['frames'][0];f['originY']=.86 if boss else .72;a['frames'].append(f)
                    anims.append(a)
                # Static palette entry for editor and asset browsers, same design as animated runtime.
                frames[0].save(ROOT/f'images/testenemy-{name.lower()}-000.png')
                a=animation(name,880000000000200+idx,9801000+idx,*size);a['frames'][0]['originY']=.86 if boss else .72;anims.append(a)
    obj['animations']['items']=keep+anims;save_json(path,obj)
    with Image.open(ROOT/'art/combat-v4/vfx.png') as sheet:
        for row,(type_name,name) in enumerate([('Projectile','Arrow'),('Projectile','Petal'),('CombatFx','RoseSweep'),('CombatFx','Bloom')]):
            path=ROOT/f'objectTypes/{type_name}.json';obj=json.loads(path.read_text());a=animation(name,880000000000300+row,9810000+row*10,128,128);a['frames']=[]
            for col in range(6):
                cell=sheet.crop((round(col*sheet.width/6),round(row*sheet.height/4),round((col+1)*sheet.width/6),round((row+1)*sheet.height/4))).resize((128,128),Image.Resampling.NEAREST)
                cell.save(ROOT/f'images/{type_name.lower()}-{name.lower()}-{col:03}.png')
                f=animation('temp',1,9810000+row*10+col,128,128)['frames'][0]
                if type_name=='Projectile':f['originX']=.8 if name=='Arrow' else .75
                a['frames'].append(f)
            obj['animations']['items']=[old for old in obj['animations']['items'] if old['name']!=name]+[a];save_json(path,obj)
    # Small hunter cut uses the same six authored sweep poses, distinct from the player's cyan slash.
    path=ROOT/'objectTypes/CombatFx.json';obj=json.loads(path.read_text());a=copy.deepcopy(next(a for a in obj['animations']['items'] if a['name']=='RoseSweep'));a.update(name='HunterCut',sid=880000000000310)
    for i,f in enumerate(a['frames']):
        f['imageSpriteId']=9810100+i
        with Image.open(ROOT/f'images/combatfx-rosesweep-{i:03}.png') as im:im.save(ROOT/f'images/combatfx-huntercut-{i:03}.png')
    obj['animations']['items']=[old for old in obj['animations']['items'] if old['name']!='HunterCut']+[a];save_json(path,obj)
    path=ROOT/'objectTypes/CombatMarker.json';obj=json.loads(path.read_text())
    for idx,name in enumerate(['Lane','Sweep','Bloom']):
        im=Image.new('RGBA',(128,128));d=ImageDraw.Draw(im)
        if name=='Lane':
            d.polygon([(1,48),(106,48),(126,64),(106,80),(1,80)],fill=(219,58,117,65),outline=(249,151,181,200),width=3)
            for x in [28,62,96]:d.line([(x-7,57),(x,64),(x-7,71)],fill=(255,195,211,200),width=3)
        elif name=='Sweep':
            angle=math.degrees(math.acos(.35));d.pieslice((1,1,126,126),-angle,angle,fill=(210,46,111,60),outline=(245,132,166,210),width=2)
            d.arc((7,7,120,120),-angle,angle,fill=(255,183,205,220),width=4)
        else:
            d.ellipse((2,2,125,125),fill=(194,40,101,58),outline=(242,130,173,215),width=3)
            for i in range(6):
                a=i*math.pi/3;pts=[]
                for r,offset in [(6,0),(33,-.35),(52,0),(33,.35)]:pts.append((64+math.cos(a+offset)*r,64+math.sin(a+offset)*r))
                d.polygon(pts,fill=(231,88,148,90),outline=(255,164,198,190),width=2)
        im.save(ROOT/f'images/combatmarker-{name.lower()}-000.png');a=animation(name,880000000000400+idx,9820000+idx,128,128)
        obj['animations']['items']=[old for old in obj['animations']['items'] if old['name']!=name]+[a]
    save_json(path,obj)
    for filename in ['Tutorial.json','Макет 1.json']:
        path=ROOT/'layouts'/filename;obj=json.loads(path.read_text())
        for layer in obj['layers']:
            for item in layer['instances']:
                if item['type']=='TestEnemy':item['properties']['initial-animation']='ShooterIdle';item['world']['width']=46;item['world']['height']=46
        save_json(path,obj)
if __name__=='__main__':main()
