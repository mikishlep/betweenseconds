"""Losslessly split the designer's four 5x64x64 strips into Construct frames."""
import copy
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/hero/source'
STRIPS = {'Up': 'атака_зад.png', 'Right': 'атака_право.png', 'Left': 'атака_лево.png', 'Down': 'атака_анфас.png'}
def main():
    template = json.loads((ROOT/'objectTypes/Player.json').read_text())['animations']['items'][-1]
    animations = []
    for direction_index, (direction, filename) in enumerate(STRIPS.items()):
        with Image.open(SOURCE/filename) as image:
            assert image.size == (320, 64) and image.mode == 'RGBA'
            for kind, count in [('Idle', 1), ('Attack', 5)]:
                animation = copy.deepcopy(template)
                animation.update(name=kind+direction, sid=820000000000200+direction_index*2+(kind=='Attack'), speed=0, isLooping=False)
                animation['frames'] = []
                for index in range(count):
                    frame = copy.deepcopy(template['frames'][0])
                    frame.update(width=64,height=64,originX=0.5,originY=0.5,imageSpriteId=9200000+direction_index*20+(10 if kind=='Attack' else 0)+index,useCollisionPoly=False)
                    animation['frames'].append(frame)
                    image.crop((index*64,0,(index+1)*64,64)).save(ROOT/'images'/f'herovisual-{kind.lower()}{direction.lower()}-{index:03}.png')
                animations.append(animation)
    existing = ROOT/'objectTypes/HeroVisual.json'
    if existing.exists():
        animations += [a for a in json.loads(existing.read_text())['animations']['items'] if a['name'].startswith(('Breathe', 'Walk'))]
    visual = {'name':'HeroVisual','plugin-id':'Sprite','sid':820000000000100,'isGlobal':False,'editorNewInstanceIsReplica':True,'instanceVariables':[],'behaviorTypes':[],'effectTypes':[],'animations':{'items':animations,'subfolders':[]}}
    (ROOT/'objectTypes/HeroVisual.json').write_text(json.dumps(visual,ensure_ascii=False,indent='\t')+'\n')
if __name__ == '__main__':
    main()
