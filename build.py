#!/usr/bin/env python3
"""Build the offline, single-file app using only the Python standard library."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
source = ROOT / 'src'
html = (source / 'template.html').read_text(encoding='utf-8')
html = html.replace('<!-- APP_STYLES -->', '<style>\n' + (source / 'styles.css').read_text(encoding='utf-8') + '</style>')
html = html.replace('<!-- APP_SCRIPT -->', '<script>\n' + (source / 'app.js').read_text(encoding='utf-8') + '</script>')
(ROOT / 'index.html').write_text(html, encoding='utf-8')
print('Built index.html')
