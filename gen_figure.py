#!/usr/bin/env python3
"""Generates the anatomy SVG block (original artwork, CC0). Output: figure.svg.html"""
CX = 200.0          # design-space centre line
SHIFT = 15          # whole body group is translated by this much
def g(y):           # torso/leg vertical proportion map (design y -> drawn y)
    if y <= 110: return y
    if y <= 398: return 110 + (y-110)*0.84
    if y <= 526: return 352 + (y-398)*(114/128)
    return 466 + (y-526)*1.5
def mx(x): return 2*CX - x
def f(v): return f"{v:.1f}".rstrip('0').rstrip('.')

# ---- silhouette: right half, segments flagged 't' (torso/legs, y mapped) or 'a' (head/arm, identity)
R = [
 ('C','a',(216,16),(228,28),(228,50)),
 ('C','a',(229,60),(229,70),(225,82)),
 ('C','a',(222,92),(213,96),(212,104)),
 ('L','a',(212,110)),
 ('C','a',(228,114),(246,118),(258,130)),
 ('C','a',(266,135),(269,152),(269,170)),
 ('C','a',(270,200),(274,232),(278,262)),
 ('C','a',(280,296),(283,322),(285,346)),
 ('C','a',(288,358),(293,372),(292,388)),
 ('C','a',(291,399),(279,402),(277,391)),
 ('C','a',(275,378),(273,362),(271,348)),
 ('C','a',(269,322),(265,294),(260,264)),
 ('C','a',(256,238),(252,208),(248,184)),
 ('C','t',(248,214),(242,250),(240,284)),
 ('C','t',(239,316),(248,344),(252,376)),
 ('C','t',(255,404),(251,444),(247,482)),
 ('C','t',(245,498),(245,512),(243,526)),
 ('C','t',(247,556),(245,582),(237,606)),
 ('C','t',(235,616),(235,622),(237,626)),
 ('L','t',(252,636)),
 ('C','t',(256,642),(248,646),(240,646)),
 ('L','t',(214,646)),
 ('C','t',(209,646),(209,640),(210,632)),
 ('C','t',(210,626),(211,620),(211,612)),
 ('C','t',(209,586),(209,556),(206,528)),
 ('C','t',(205,516),(205,506),(205,496)),
 ('C','t',(204,460),(204,430),(202,404)),
 ('L','t',(200,398)),
]
def tp(pt,mode,mirror=False):
    x,y = pt
    if mode=='t': y = g(y)
    if mirror: x = mx(x)
    return (x,y)
def silhouette():
    # forward (right) pass
    pts=[]; cur=(200,16)
    out=[f"M{f(cur[0])} {f(cur[1])}"]
    segs=[]  # store transformed segments for mirror pass
    p0=cur
    for s in R:
        kind,mode=s[0],s[1]
        if kind=='C':
            c1,c2,p3=[tp(p,mode) for p in s[2:5]]
            out.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p3[0])} {f(p3[1])}")
            segs.append(('C',p0,c1,c2,p3)); p0=p3
        else:
            p3=tp(s[2],mode)
            out.append(f"L{f(p3[0])} {f(p3[1])}")
            segs.append(('L',p0,p3)); p0=p3
    # mirrored reverse pass
    m=lambda p:(mx(p[0]),p[1])
    for s in reversed(segs):
        if s[0]=='C':
            _,P0,c1,c2,P3=s
            a,b,c=m(c2),m(c1),m(P0)
            out.append(f"C{f(a[0])} {f(a[1])} {f(b[0])} {f(b[1])} {f(c[0])} {f(c[1])}")
        else:
            _,P0,P3=s; c=m(P0); out.append(f"L{f(c[0])} {f(c[1])}")
    out.append("Z")
    return " ".join(out)

def shifted(points_path, anchor_y):
    """Translate an organ drawn in design space by g(anchor)-anchor so shape keeps its proportions."""
    return g(anchor_y)-anchor_y
def path_from(cmds, dy):
    """cmds: list like ['M',x,y] / ['C',x1,y1,x2,y2,x,y] / ['L',x,y] / ['Z'] in design space."""
    out=[]
    for c in cmds:
        k=c[0]; nums=c[1:]
        vals=[]
        for i,v in enumerate(nums):
            vals.append(v if i%2==0 else v+dy)
        out.append(k+" ".join(f(v) for v in vals))
    return " ".join(out)
def mirror_cmds(cmds, ydelta=0):
    out=[]
    for c in cmds:
        k=c[0]; nums=c[1:]
        vals=[(mx(v) if i%2==0 else v+ydelta) for i,v in enumerate(nums)]
        out.append([k]+vals)
    return out

# ---- organs (design space; each shifted by its own dy)
heart_dy=shifted(None,196)
heart=[['M',205,184],['C',199,175,185,178,187,192],['C',189,203,199,210,205,218],
       ['C',211,210,221,203,223,192],['C',225,178,211,175,205,184],['Z']]
liver_dy=shifted(None,242)
liver=[['M',163,236],['C',170,225,196,222,212,228],['C',220,233,216,247,205,253],
       ['C',191,261,172,263,165,255],['C',160,249,160,241,163,236],['Z']]
stomach_dy=shifted(None,256)
stomach=[['M',203,238],['C',214,227,233,233,235,251],['C',237,269,227,283,211,281],
         ['C',201,279,199,269,205,263],['C',211,257,212,249,206,245],['C',201,242,199,239,203,238],['Z']]
kid_dy=shifted(None,285)
kidR=[['M',222,266],['C',232,266,237,278,236,290],['C',235,302,228,306,223,302],
      ['C',220,298,223,293,222,288],['C',221,282,216,278,217,272],['C',218,268,220,266,222,266],['Z']]
kidL=mirror_cmds(kidR, ydelta=6)
int_dy=shifted(None,330)
intestine=[['M',184,306],['C',184,298,216,298,216,306],['C',226,314,228,334,220,350],
           ['C',212,362,188,362,180,350],['C',172,334,174,314,184,306],['Z']]
folds=[['M',188,312],['C',198,308,208,310,212,316],['M',184,324],['C',194,320,210,324,218,328],
       ['M',184,336],['C',196,332,208,336,216,340],['M',188,348],['C',198,344,206,348,212,352]]
bl_dy=shifted(None,372)
bladder=[['M',187,364],['C',191,357,209,357,213,364],['C',217,374,208,386,200,386],
         ['C',192,386,183,374,187,364],['Z']]

def kid_both():
    return path_from(kidR,kid_dy)+" "+path_from(kidL,kid_dy)

# ---- vessels: pairs of lines. Trunk/leg points use g(); arm points identity.
def Lg(x,y): return f"{f(x)} {f(g(y))}"
vessels=" ".join([
 # neck (both sides) up from the heart
 f"M191 {f(g(178))} L191 106", f"M209 {f(g(178))} L209 106",
 # trunk
 f"M200 {f(g(214))} L200 {f(g(376))}",
 # to the legs
 f"M200 {f(g(376))} C214 {f(g(396))} 224 {f(g(430))} 225 {f(g(480))} L224 {f(g(526))} L223 {f(g(612))}",
 f"M200 {f(g(376))} C186 {f(g(396))} 176 {f(g(430))} 175 {f(g(480))} L176 {f(g(526))} L177 {f(g(612))}",
 # to the arms (identity y)
 "M197 160 C222 146 244 150 257 164 C262 205 266 262 274 300 L279 346",
 "M203 160 C178 146 156 150 143 164 C138 205 134 262 126 300 L121 346",
])

oesoph_y=lambda y:f(g(y))
oesoph=(f"M197 100 H203 V{oesoph_y(226)} C203 {oesoph_y(233)} 206 {oesoph_y(236)} 209 {oesoph_y(238)}"
        f" L205 {oesoph_y(244)} C199 {oesoph_y(240)} 197 {oesoph_y(233)} 197 {oesoph_y(226)} Z")
lips="M189 77 Q200 72 211 77 Q200 85 189 77 Z"

# skin patch on the arm (viewer's left upper arm) ; identity coordinates
patch="M132 178 H150 V206 H132 Z"


# ---- leader targets (group coordinates, after dy)
def T(x,y,dy): return (x, y+dy)
t_mouth=(188,77)
t_skin=(132,190)
t_liver=T(166,246,liver_dy)
t_int=T(180,332,int_dy)
t_heart=T(224,194,heart_dy)
t_stomach=T(235,258,stomach_dy)
t_kid=T(236,284,kid_dy)
t_bladder=T(213,372,bl_dy)

# ---- label boxes (absolute coords). Left x=0..112, right x=318..430.
BW,BH=112,68
def label(key,name,lines,x,y):
    cy=y+BH/2
    n=len(lines); first=cy-(n-1)*10+5
    texts="".join(f'<text x="{x+BW/2}" y="{f(first+i*20)}" text-anchor="middle">{t}</text>' for i,t in enumerate(lines))
    return (f'<g id="anatomy-{key}" class="anatomy-region" role="button" tabindex="0" aria-pressed="false" '
            f'aria-label="{name}" data-anatomy="{key}"><rect class="region-hit" x="{x}" y="{y}" width="{BW}" height="{BH}" rx="12"/>{texts}</g>')
L=[ ('mouth','Mouth &amp; oesophagus',['Mouth &amp;','oesophagus'],0,43),
    ('skin','Skin &amp; subcutaneous tissue',['Skin &amp;','tissue under','the skin'],0,138),
    ('liver','Liver',['Liver'],0,214),
    ('intestine','Small intestine',['Small','intestine'],0,308),
    ('heart','Heart &amp; blood vessels',['Heart &amp;','blood','vessels'],318,126),
    ('stomach','Stomach',['Stomach'],318,214),
    ('urinary','Kidneys &amp; bladder',['Kidneys','&amp; bladder'],318,300) ]
labels="".join(label(*a) for a in L)
def mid(x,y): return (x, y+BH/2)
lead=[]
def add(box_x_edge,box_y,target):
    ex=box_x_edge; ey=box_y+BH/2
    lead.append(f"M{ex} {f(ey)} L{f(target[0])} {f(target[1])}")
LEFT=112-SHIFT; RIGHT=318-SHIFT      # box edges expressed in body-group coordinates
add(LEFT,43,t_mouth); add(LEFT,138,t_skin); add(LEFT,214,t_liver); add(LEFT,308,t_int)
add(RIGHT,126,t_heart); add(RIGHT,214,t_stomach)
lead.append(f"M{RIGHT} {f(300+BH/2-12)} L{f(t_kid[0])} {f(t_kid[1])}")
lead.append(f"M{RIGHT} {f(300+BH/2+12)} L{f(t_bladder[0])} {f(t_bladder[1])}")
dots="".join(f'<circle class="leader-dot" cx="{f(p[0])}" cy="{f(p[1])}" r="3"/>' for p in
    [t_mouth,t_skin,t_liver,t_int,t_heart,t_stomach,t_kid,t_bladder])

navel_y=f(g(326)-8)
svg=f'''<svg id="anatomy-body" role="group" viewBox="0 0 430 660" aria-labelledby="anatomySvgTitle anatomySvgDesc">
<title id="anatomySvgTitle">Front view of a standing human figure with seven selectable regions</title>
<desc id="anatomySvgDesc">Simplified front view, not to scale. Left and right on this picture are the viewer’s left and right, so the liver appears on the picture’s left. A matching button list follows the diagram.</desc>
<!-- Original illustration for this app, dedicated to CC0 1.0. Generated by gen_figure.py; no external asset, no traced or copied artwork. -->
<g class="body-outline" aria-hidden="true" transform="translate({SHIFT} 0)">
<ellipse class="ear" cx="171.5" cy="55" rx="5" ry="9"/><ellipse class="ear" cx="228.5" cy="55" rx="5" ry="9"/>
<path class="silhouette" d="{silhouette()}"/>
<path class="detail" d="M200 {f(g(122))} C216 120 238 124 255 131 M200 {f(g(122))} C184 120 162 124 145 131"/>
<circle class="detail-dot" cx="190" cy="50" r="2.4"/><circle class="detail-dot" cx="210" cy="50" r="2.4"/>
<path class="detail" d="M200 56 V64 Q196 68 201 68"/>
<circle class="detail-dot" cx="200" cy="{navel_y}" r="2.6"/>
<path id="shape-vessels" class="vessels" data-organ-tap="heart" d="{vessels}"/>
<g id="shape-mouth" class="organ-group" data-organ-tap="mouth"><path class="lips" d="{lips}"/><path class="oesophagus" d="{oesoph}"/></g>
<path id="shape-urinary" class="organ-kidney" data-organ-tap="urinary" d="{kid_both()}"/>
<path id="shape-stomach" class="organ-stomach" data-organ-tap="stomach" d="{path_from(stomach,stomach_dy)}"/>
<path id="shape-liver" class="organ-liver" data-organ-tap="liver" d="{path_from(liver,liver_dy)}"/>
<path id="shape-intestine" class="organ-intestine" data-organ-tap="intestine" d="{path_from(intestine,int_dy)}"/>
<path class="organ-line fold" d="{path_from(folds,int_dy)}"/>
<path class="organ-line ureter" d="M{f(182)} {f(g(306)+2)} C186 {f(g(334))} 191 {f(g(352))} 193 {f(g(368))} M218 {f(g(300)+2)} C214 {f(g(330))} 209 {f(g(352))} 207 {f(g(368))}"/>
<path id="shape-bladder" class="organ-bladder" data-organ-tap="urinary" d="{path_from(bladder,bl_dy)}"/>
<path id="shape-heart" class="organ-heart" data-organ-tap="heart" transform="rotate(-18 205 {f(g(196))})" d="{path_from(heart,heart_dy)}"/>
<path id="shape-skin" class="skin-patch" data-organ-tap="skin" d="{patch}"/>
<path class="label-leader" d="{" ".join(lead)}"/>{dots}
</g>
{labels}
</svg>'''
open('figure.svg.html','w').write(svg)
print(len(svg))
