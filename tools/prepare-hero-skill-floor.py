"""Extract the one original terrain tile used by the standalone review scene."""
from pathlib import Path
from PIL import Image

source=Path('public/assets/optimized-textures/texture-25ba5722f5ed88ca76c689e1a793d62b.webp')
output=Path('.cache/hero-skill-lab/metal-floor.webp')
output.parent.mkdir(parents=True,exist_ok=True)
with Image.open(source) as image:
    assert image.size==(2048,4096),image.size
    tile=image.crop((0,1024,1024,2048))
    tile.save(output,format='WEBP',lossless=True,method=6,exact=True)
    with Image.open(output) as saved:
        assert tile.convert('RGBA').tobytes()==saved.convert('RGBA').tobytes()
print(output,output.stat().st_size,'bytes; exact original tile pixels')

