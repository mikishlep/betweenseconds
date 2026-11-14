"""Import the generated atlas. Pixel art is not repainted: grid slicing and NN resize only.
Frame origins align the white head with the original designer sprite without changing pixels.
"""
import copy
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = [('Down', 'анфас'), ('Up', 'зад'), ('Left', 'лево'), ('Right', 'право')]
def head_center(image):
    pixels = image.load()
    white = {(x,y) for y in range(image.height) for x in range(image.width)
             if min(pixels[x,y][:3]) >= 220 and pixels[x,y][3] >= 200}
    components = []
    while white:
        stack = [white.pop()]; part=[]
        while stack:
            x,y=stack.pop(); part.append((x,y))
            for point in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if point in white: white.remove(point); stack.append(point)
        components.append(part)
    head=max(components,key=len)
    assert len(head)>100, 'No coherent white head found'
    return ((min(x for x,y in head)+max(x for x,y in head))/2,
            (min(y for x,y in head)+max(y for x,y in head))/2)
def main():
    path=ROOT/'objectTypes/HeroVisual.json'; obj=json.loads(path.read_text())
    original=[a for a in obj['animations']['items'] if not a['name'].startswith(('Breathe','Walk'))]
    animations=[]
    with Image.open(ROOT/'art/hero/generated/hero-locomotion-v2.png') as sheet:
        assert sheet.mode=='RGBA' and sheet.getpixel((0,0))[3]==0
        for row,(direction,reference) in enumerate(DIRECTIONS):
            with Image.open(ROOT/f'art/hero/source/атака_{reference}.png') as source:
                cx,cy=head_center(source.crop((0,0,64,64)))
            for group,kind in enumerate(['Breathe','Walk']):
                anim=copy.deepcopy(original[0]);anim.update(name=kind+direction,sid=830000000000200+row*2+group,isLooping=True,speed=0);anim['frames']=[]
                for frame_index in range(4):
                    col=group*4+frame_index
                    box=(round(col*sheet.width/8),round(row*sheet.height/4),round((col+1)*sheet.width/8),round((row+1)*sheet.height/4))
                    image=sheet.crop(box).resize((64,64),Image.Resampling.NEAREST)
                    hx,hy=head_center(image)
                    frame=copy.deepcopy(original[0]['frames'][0]);frame.update(width=64,height=64,originX=0.5+(hx-cx)/64,originY=0.5+(hy-cy)/64,imageSpriteId=9300000+row*20+group*4+frame_index)
                    anim['frames'].append(frame)
                    image.save(ROOT/f'images/herovisual-{kind.lower()}{direction.lower()}-{frame_index:03}.png')
                animations.append(anim)
    obj['animations']['items']=original+animations
    path.write_text(json.dumps(obj,ensure_ascii=False,indent='\t')+'\n')
if __name__=='__main__':main()
