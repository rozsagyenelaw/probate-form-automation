"""Dev tool: list every AcroForm widget of a PDF with page, rect, type and nearby text.
Usage: python3 -I dump_fields.py form.pdf > form.fields.txt"""
import sys, pdfplumber
from pypdf import PdfReader

path = sys.argv[1]
r = PdfReader(path)
pl = pdfplumber.open(path)
for pi, page in enumerate(r.pages):
    H = float(page.mediabox.height)
    words = pl.pages[pi].extract_words(keep_blank_chars=False, use_text_flow=False)
    annots = page.get('/Annots') or []
    rows = []
    for a in annots:
        a = a.get_object()
        if a.get('/Subtype') != '/Widget':
            continue
        # full name
        names = []; node = a; ft = None; ff = 0; opts = None; tu = ''
        while node is not None:
            if '/T' in node: names.append(str(node['/T']))
            if ft is None and '/FT' in node: ft = node['/FT']
            if not tu and '/TU' in node: tu = str(node['/TU'])[:120]
            if '/Ff' in node and not ff: ff = int(node['/Ff'])
            node = node.get('/Parent').get_object() if '/Parent' in node else None
        name = '.'.join(reversed(names))
        x0, y0, x1, y1 = [float(v) for v in a['/Rect']]
        top = H - y1; bottom = H - y0
        states = ''
        if ft == '/Btn' and '/AP' in a and '/N' in a['/AP']:
            states = ','.join(k for k in a['/AP']['/N'].keys() if k != '/Off')
        # nearby words: same band, to the left within 260pt; and words just above
        left = [w for w in words if abs(((w['top']+w['bottom'])/2) - ((top+bottom)/2)) < 6 and w['x1'] <= x0 + 2 and w['x1'] > x0 - 260]
        left = ' '.join(w['text'] for w in sorted(left, key=lambda w: w['x0']))[-110:]
        above = [w for w in words if w['bottom'] <= top + 1 and w['bottom'] > top - 12 and w['x0'] < x1 and w['x1'] > x0 - 20]
        above = ' '.join(w['text'] for w in sorted(above, key=lambda w: w['x0']))[:90]
        flags = int(a.get('/F', 0))
        rows.append((top, x0, f"p{pi+1} y={top:6.1f} x={x0:6.1f} w={x1-x0:5.1f} h={y1-y0:4.1f} {str(ft)[1:] if ft else '?'}{'[' + states + ']' if states else ''}{' ML' if ff & 4096 else ''}{' F'+str(flags) if flags != 4 else ''} {name}\n      T: {tu}\n      L: {left}\n      A: {above}"))
    for row in sorted(rows):
        print(row[2])
