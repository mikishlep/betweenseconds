"""Author small geometric test sprites. Keep vector descriptions beside PNGs."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
def sprite(name, shapes):
    image = Image.new('RGBA', (32, 32))
    draw = ImageDraw.Draw(image)
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">']
    for kind, coords, color in shapes:
        if kind == 'polygon':
            draw.polygon(coords, fill=color)
            svg.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in coords)}" fill="{color}"/>')
        else:
            draw.rectangle(coords, fill=color)
            x,y,x2,y2=coords
            svg.append(f'<rect x="{x}" y="{y}" width="{x2-x+1}" height="{y2-y+1}" fill="{color}"/>')
    svg.append('</svg>')
    (ROOT/'art/prototype'/f'{name}.svg').write_text('\n'.join(svg)+'\n')
    image.save(ROOT/'images'/f'{name}-prototype-000.png')
sprite('player', [('polygon',[(16,1),(29,10),(26,26),(16,31),(6,26),(3,10)],'#c9e9f4'),('polygon',[(16,5),(24,12),(21,23),(11,23),(8,12)],'#508fa9'),('polygon',[(16,7),(20,15),(12,15)],'#f0fcff')])
sprite('testenemy', [('polygon',[(7,2),(25,2),(31,9),(31,25),(24,31),(7,31),(1,24),(1,9)],'#ed514e'),('rect',(9,9,23,23),'#822d35'),('rect',(13,1,19,15),'#ffc1a2')])
sprite('wall', [('rect',(0,0,31,31),'#273443'),('rect',(1,1,30,2),'#405268')])
sprite('projectile', [('polygon',[(1,11),(20,11),(20,4),(31,16),(20,28),(20,21),(1,21)],'#ff925d'),('polygon',[(22,10),(29,16),(22,22)],'#fff0ce')])
sprite('projectileguide', [('rect',(0,13,31,18),'#ffb17c')])
