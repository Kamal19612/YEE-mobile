import base64
from pathlib import Path

png = Path(r"c:\Users\DEV\Downloads\YEE\public\favicon-32.png").read_bytes()
b64 = base64.b64encode(png).decode("ascii")
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">\n'
    f'  <image href="data:image/png;base64,{b64}" width="32" height="32"/>\n'
    "</svg>\n"
)
Path(r"c:\Users\DEV\Downloads\YEE\public\favicon.svg").write_text(svg, encoding="utf-8")
print("ok", len(svg))
