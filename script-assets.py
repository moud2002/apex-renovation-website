from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parent
assets = root / 'public/assets'
archive = Path('/home/user/workspace/apex-website-private/original-concepts')
archive.mkdir(parents=True, exist_ok=True)
for name in ['hero','kitchen','living','bath','investment']:
    src = assets / f'{name}-concept.png'
    if not src.exists():
        src = archive / src.name
    im = Image.open(src).convert('RGB')
    im.thumbnail((1600,1200))
    im.save(assets / f'{name}-concept.webp','WEBP',quality=86,method=6)
    if name == 'hero':
        crop=ImageOps.fit(im,(850,1150),centering=(0.72,0.5))
        crop.save(assets / 'hero-concept-mobile.webp','WEBP',quality=83,method=6)
    if src.parent == assets:
        src.rename(archive / src.name)
fontpath = root/'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'
font=TTFont(fontpath);font.flavor=None
font.save(archive/'manrope.ttf')
card=Image.new('RGB',(1200,630),(23,23,20))
hero=ImageOps.fit(Image.open(assets/'hero-concept.webp'),(780,630),centering=(.7,.5)).convert('RGB')
card.paste(hero,(420,0))
overlay=Image.new('RGBA',card.size,(0,0,0,0));d=ImageDraw.Draw(overlay)
for x in range(1200):
    alpha=255 if x<340 else max(0,int(255*(1-(x-340)/570)))
    d.line([(x,0),(x,630)],fill=(23,23,20,alpha))
card=Image.alpha_composite(card.convert('RGBA'),overlay)
logo=Image.open(assets/'apex-logo-gold-light.png').convert('RGBA');logo.thumbnail((400,150))
card.alpha_composite(logo,(64,70))
d=ImageDraw.Draw(card)
display=ImageFont.truetype(str(archive/'manrope.ttf'),54)
small=ImageFont.truetype(str(archive/'manrope.ttf'),18)
d.text((64,277),"Your property's\nnext chapter.",font=display,fill=(244,241,233),spacing=4)
d.line((64,474,436,474),fill=(180,149,80),width=1)
d.text((64,497),"PROPERTY RENOVATION / NORTH ALABAMA",font=small,fill=(210,187,134))
card.convert('RGB').save(assets/'share-card.jpg',quality=92,optimize=True)
print('Optimized five concept images, mobile hero, and branded share card.')
