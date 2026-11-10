from PIL import Image, ImageDraw
import sys, os
OUT = sys.argv[1]
def draw(size, maskable):
    S = 4*size; sc = S/512
    im = Image.new('RGBA', (S, S), (0,0,0,0)); d = ImageDraw.Draw(im)
    bg = (138,75,30,255)
    if maskable: d.rectangle([0,0,S,S], fill=bg)
    else: d.rounded_rectangle([0,0,S-1,S-1], radius=int(104*sc), fill=bg)
    k = 0.80 if maskable else 1.0
    c = 256*sc
    def circ(r, col):
        r = r*k*sc; d.ellipse([c-r, c-r, c+r, c+r], fill=col+(255,))
    circ(170,(244,233,214)); circ(160,(74,36,16)); circ(146,(107,52,18)); circ(104,(168,96,42)); circ(62,(215,154,85))
    r = 18*k*sc; x = c-20*k*sc
    d.ellipse([x-r, x-r, x+r, x+r], fill=(232,188,130,255))
    return im.resize((size,size), Image.LANCZOS)
for name,size,mask in [('icon-192.png',192,False),('icon-512.png',512,False),('maskable-512.png',512,True),('apple-touch-icon.png',180,True)]:
    draw(size, mask).save(os.path.join(OUT,name))
print('ok')
