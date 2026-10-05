"""Rebuilds the pictures the preview page ships with. Run from the project root. Needs Pillow (pip install pillow).

  python preview-src/tools/make-images.py photos
      The travel photos: every picture in public/images/hero becomes a 480 px WebP (for the page) and a
      1600 px JPEG (for the full-size viewer) in public/preview/img.

  python preview-src/tools/make-images.py earth <folder>
      The Earth maps in public/preview/earth. <folder> holds earth-blue-marble.jpg and earth-night.jpg:
      NASA's Blue Marble and Earth at Night, as shipped in the "three-globe" npm package under example/img
      (npm pack three-globe, then unpack the .tgz).

To add a photo to the page: put it in public/images/hero, add its file name and a short name to PHOTOS below,
run the first command, then list the short name under the right place in HERO in preview-src/js/app.js.
"""
import os
import sys

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERO = os.path.join(ROOT, 'public', 'images', 'hero')
OUT = os.path.join(ROOT, 'public', 'preview')

PHOTOS = {
    'hero-Albequerque.jpg': 'albuquerque', 'hero-carlsbad.jpg': 'carlsbad', 'hero-Colorado.jpg': 'colorado',
    'hero-cyprus.jpg': 'cyprus', 'hero-France.jpg': 'france', 'hero-greece.jpg': 'greece',
    'hero-greekislands.jpg': 'greekislands', 'hero-greenville.jpg': 'greenville', 'hero-Japan.jpg': 'japan',
    'hero-jazz-fest-2014.jpg': 'jazzfest', 'hero-keylargo.jpg': 'keylargo', 'hero-Louisville.jpg': 'louisville',
    'hero-philadelphia.jpg': 'philadelphia', 'hero-santa-fe.jpg': 'santa-fe', 'hero-Scotland.jpg': 'scotland',
    'hero-sedona.jpg': 'sedona', 'hero-whitesands.jpg': 'whitesands', 'hero-yaught.jpg': 'yacht',
}


def save(image, path, **options):
    image.save(path, **options)
    return os.path.getsize(path)


def photos():
    target = os.path.join(OUT, 'img')
    os.makedirs(target, exist_ok=True)
    small = large = 0
    for source, name in sorted(PHOTOS.items(), key=lambda item: item[1]):
        # exif_transpose turns the picture the right way up; nothing else from the camera's notes is kept
        picture = ImageOps.exif_transpose(Image.open(os.path.join(HERO, source))).convert('RGB')
        thumb = picture.copy()
        thumb.thumbnail((480, 640), Image.LANCZOS)
        full = picture.copy()
        full.thumbnail((1600, 1600), Image.LANCZOS)
        small += save(thumb, os.path.join(target, name + '-480.webp'), quality=74, method=6)
        large += save(full, os.path.join(target, name + '-1600.jpg'), quality=80, optimize=True, progressive=True)
    print(f'{len(PHOTOS)} photos: thumbnails {small // 1024} KB, full size {large // 1024} KB')


def earth(folder):
    target = os.path.join(OUT, 'earth')
    os.makedirs(target, exist_ok=True)
    day = Image.open(os.path.join(folder, 'earth-blue-marble.jpg')).convert('RGB')
    night = Image.open(os.path.join(folder, 'earth-night.jpg')).convert('RGB')
    sizes = {
        'day-1k.webp': save(day.resize((1024, 512), Image.LANCZOS), os.path.join(target, 'day-1k.webp'), quality=78, method=6),
        'day-2k.webp': save(day.resize((2048, 1024), Image.LANCZOS), os.path.join(target, 'day-2k.webp'), quality=80, method=6),
        'day-4k.webp': save(day.resize((4096, 2048), Image.LANCZOS) if day.size != (4096, 2048) else day, os.path.join(target, 'day-4k.webp'), quality=78, method=6),
        'night-1k.webp': save(night.resize((1024, 512), Image.LANCZOS), os.path.join(target, 'night-1k.webp'), quality=72, method=6),
        'night-2k.webp': save(night.resize((2048, 1024), Image.LANCZOS), os.path.join(target, 'night-2k.webp'), quality=72, method=6),
    }
    for name, size in sizes.items():
        print(f'{name}: {size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'photos':
        photos()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'earth':
        earth(sys.argv[2])
    else:
        print(__doc__)
