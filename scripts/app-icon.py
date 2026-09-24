"""
Icône et écran de démarrage de l'application (charte du 2026-09-20 : jaune #FFC529, anthracite #2B2B2E).

Dessin vectoriel simple (Pillow), rendu en PNG aux tailles qu'attend Expo :
  assets/images/icon.png                     1024, opaque (iOS refuse la transparence)
  assets/images/android-icon-foreground.png  1024, transparent, motif dans la zone sûre (66 %)
  assets/images/android-icon-background.png  1024, aplat jaune
  assets/images/android-icon-monochrome.png  1024, motif blanc sur transparent (thème Android 13+)
  assets/images/splash-icon.png              512, transparent, recadré sur le motif (posé sur le fond défini dans app.json)
  assets/images/favicon.png                  48

Usage :
    python scripts/app-icon.py [--variant panier|assiette|sac] [--preview]

`--preview` écrit une planche de comparaison des trois variantes dans le dossier temporaire
(aux tailles réelles d'affichage : 192 px et 48 px) sans toucher aux fichiers du projet.
Outil de développement : les PNG produits sont versionnés, ce script n'est relancé qu'en cas de
changement de marque.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"
YELLOW = (255, 197, 41, 255)
INK = (43, 43, 46, 255)
WHITE = (255, 255, 255, 255)
SIZE = 1024  # toile de dessin ; tout est exprimé en fraction de cette taille


def _rounded(draw: ImageDraw.ImageDraw, box, radius: float, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_panier(d: ImageDraw.ImageDraw, c: tuple[int, int, int, int]) -> None:
    """Panier de courses : anse en arc, corps trapézoïdal, trois lattes."""
    w = SIZE
    d.arc([w * 0.34, w * 0.20, w * 0.66, w * 0.50], start=180, end=360, fill=c, width=int(w * 0.055))
    d.rounded_rectangle([w * 0.20, w * 0.38, w * 0.80, w * 0.47], radius=w * 0.045, fill=c)
    body = [(w * 0.245, w * 0.47), (w * 0.755, w * 0.47), (w * 0.665, w * 0.79), (w * 0.335, w * 0.79)]
    d.polygon(body, fill=c)
    hole = (0, 0, 0, 0)
    for i, x in enumerate((0.42, 0.50, 0.58)):
        top, bottom = w * 0.535, w * 0.715
        dx = (x - 0.5) * w * 0.10
        d.line([(w * x - dx * 0.2, top), (w * x + dx * 0.55, bottom)], fill=hole, width=int(w * 0.028))
        del i


def draw_assiette(d: ImageDraw.ImageDraw, c: tuple[int, int, int, int]) -> None:
    """Assiette vue de dessus, fourchette et couteau, sept points en arc pour les sept jours."""
    w = SIZE
    d.ellipse([w * 0.235, w * 0.305, w * 0.765, w * 0.835], outline=c, width=int(w * 0.05))
    # fourchette : manche + trois dents
    d.rounded_rectangle([w * 0.395, w * 0.445, w * 0.425, w * 0.715], radius=w * 0.015, fill=c)
    d.rounded_rectangle([w * 0.375, w * 0.395, w * 0.445, w * 0.475], radius=w * 0.02, fill=c)
    for x in (0.381, 0.4055, 0.430):
        d.rounded_rectangle([w * x, w * 0.375, w * (x + 0.009), w * 0.44], radius=w * 0.006, fill=c)
    # couteau : lame effilée + manche
    d.polygon([(w * 0.565, w * 0.375), (w * 0.605, w * 0.415), (w * 0.605, w * 0.545), (w * 0.565, w * 0.545)], fill=c)
    d.rounded_rectangle([w * 0.570, w * 0.535, w * 0.600, w * 0.715], radius=w * 0.015, fill=c)
    for i in range(7):
        a = math.radians(202 + i * 22.6)
        x, y = w * 0.5 + math.cos(a) * w * 0.385, w * 0.57 + math.sin(a) * w * 0.385
        r = w * 0.026
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)


def _leaf_mask(w: int) -> Image.Image:
    """Feuille : intersection de deux disques (forme en amande), inclinée à 45°."""
    box = int(w * 0.30)
    a = Image.new("L", (box, box), 0)
    b = Image.new("L", (box, box), 0)
    ImageDraw.Draw(a).ellipse([0, 0, box * 1.6, box * 1.6], fill=255)
    ImageDraw.Draw(b).ellipse([-box * 0.6, -box * 0.6, box, box], fill=255)
    from PIL import ImageChops

    return ImageChops.multiply(a, b).rotate(-45, expand=True, resample=Image.BICUBIC)


def draw_sac(d: ImageDraw.ImageDraw, c: tuple[int, int, int, int]) -> None:
    """Sac de courses et sa feuille : l'anti-gaspillage, pas seulement le repas."""
    w = SIZE
    d.rounded_rectangle([w * 0.26, w * 0.36, w * 0.74, w * 0.82], radius=w * 0.07, fill=c)
    d.arc([w * 0.38, w * 0.21, w * 0.62, w * 0.47], start=180, end=360, fill=c, width=int(w * 0.05))
    leaf = _leaf_mask(w)
    d.bitmap((int(w * 0.5 - leaf.width / 2), int(w * 0.585 - leaf.height / 2)), leaf, fill=(0, 0, 0, 0))
    d.line([(w * 0.435, w * 0.665), (w * 0.565, w * 0.505)], fill=c, width=int(w * 0.02))


VARIANTS = {"panier": draw_panier, "assiette": draw_assiette, "sac": draw_sac}


def render(variant: str, color, background=None, scale: float = 1.0) -> Image.Image:
    """Motif seul (fond transparent) ou posé sur `background` ; `scale` réduit le motif (zone sûre Android)."""
    img = Image.new("RGBA", (SIZE, SIZE), background or (0, 0, 0, 0))
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    VARIANTS[variant](ImageDraw.Draw(layer), color)
    if scale != 1.0:
        small = layer.resize((int(SIZE * scale), int(SIZE * scale)), Image.LANCZOS)
        layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        off = (SIZE - small.width) // 2
        layer.paste(small, (off, off), small)
    return Image.alpha_composite(img, layer)


def preview(path: Path) -> None:
    pad, big, small = 24, 192, 48
    sheet = Image.new("RGBA", (pad * 4 + big * 3, pad * 2 + big + small + 12), (244, 245, 247, 255))
    for i, name in enumerate(VARIANTS):
        icon = render(name, INK, YELLOW)
        x = pad + i * (big + pad)
        sheet.paste(icon.resize((big, big), Image.LANCZOS), (x, pad))
        sheet.paste(icon.resize((small, small), Image.LANCZOS), (x, pad + big + 12))
    sheet.save(path)
    print(f"planche de comparaison : {path}")


def write(variant: str) -> None:
    render(variant, INK, YELLOW).convert("RGB").save(OUT / "icon.png")
    # Android : le motif est rogné par un masque adaptatif, il doit tenir dans les 66 % centraux.
    render(variant, INK, scale=0.66).save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (SIZE, SIZE), YELLOW).save(OUT / "android-icon-background.png")
    render(variant, WHITE, scale=0.66).save(OUT / "android-icon-monochrome.png")
    # écran de démarrage : recadré sur le motif (marge 4 %), pour que `imageWidth` d'app.json
    # règle la largeur réelle du dessin et non celle d'une toile à moitié vide.
    mark = render(variant, INK)
    box = mark.getbbox()
    if box:
        m = int(SIZE * 0.04)
        mark = mark.crop((max(0, box[0] - m), max(0, box[1] - m), min(SIZE, box[2] + m), min(SIZE, box[3] + m)))
    side = max(mark.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    square.resize((512, 512), Image.LANCZOS).save(OUT / "splash-icon.png")
    render(variant, INK, YELLOW).resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    for f in ("icon.png", "android-icon-foreground.png", "android-icon-background.png", "android-icon-monochrome.png", "splash-icon.png", "favicon.png"):
        print(f"{f} : {(OUT / f).stat().st_size // 1024} Ko")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", choices=sorted(VARIANTS), default="panier")
    ap.add_argument("--preview", metavar="CHEMIN", help="écrit une planche de comparaison et sort")
    args = ap.parse_args()
    if args.preview:
        preview(Path(args.preview))
        return 0
    write(args.variant)
    return 0


if __name__ == "__main__":
    sys.exit(main())
