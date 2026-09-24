"""
Pose l'image d'un plat fournie par le propriétaire (sa photo ou une image générée par une IA).

L'image est recadrée au centre en 4:3, réduite au format de l'app, puis marquée `source: owner`
dans `CREDITS.json` : `scripts/dish-photos.py` ne l'écrasera plus jamais, même avec `--redo`.

    python scripts/set-dish-photo.py chorizo_poivrons_tomate_riz "C:/chemin/vers/image.webp"
    python scripts/set-dish-photo.py --list        # recettes dont l'image vient du propriétaire
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "dishes"
CREDITS = OUT / "CREDITS.json"
WIDTH, HEIGHT, QUALITY = 640, 480, 80


def recipe_ids() -> set[str]:
    import re

    ids: set[str] = set()
    for f in (ROOT / "src" / "data").glob("recipes-*.ts"):
        ids.update(re.findall(r"id: '([a-z0-9_]+)',\s*name:", f.read_text(encoding="utf-8")))
    return ids


def load_credits() -> dict:
    try:
        return json.loads(CREDITS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def crop_4_3(img: Image.Image) -> Image.Image:
    target = WIDTH / HEIGHT
    w, h = img.size
    if w / h > target:
        new_w = int(h * target)
        img = img.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
    else:
        new_h = int(w / target)
        img = img.crop((0, (h - new_h) // 2, w, (h + new_h) // 2))
    return img.resize((WIDTH, HEIGHT), Image.LANCZOS)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("recipe_id", nargs="?", help="identifiant de la recette (src/data/recipes-*.ts)")
    ap.add_argument("source", nargs="?", help="fichier image à poser (jpg, png, webp…)")
    ap.add_argument("--note", default="Image fournie par le propriétaire.", help="mention conservée dans CREDITS.json")
    ap.add_argument("--list", action="store_true", help="lister les images fournies par le propriétaire")
    args = ap.parse_args()

    credits = load_credits()
    if args.list:
        owned = {r: c for r, c in credits.items() if c.get("source") == "owner"}
        print(f"{len(owned)} image(s) fournie(s) par le propriétaire :")
        for r, c in sorted(owned.items()):
            print(f"  {r} — {c.get('note', '')}")
        return 0

    if not args.recipe_id or not args.source:
        ap.error("recipe_id et source sont requis (ou --list)")
    if args.recipe_id not in recipe_ids():
        print(f"recette inconnue : {args.recipe_id}")
        return 1
    src = Path(args.source)
    if not src.is_file():
        print(f"fichier introuvable : {src}")
        return 1

    crop_4_3(Image.open(src).convert("RGB")).save(OUT / f"{args.recipe_id}.jpg", quality=QUALITY, optimize=True)
    credits[args.recipe_id] = {"source": "owner", "note": args.note}
    CREDITS.write_text(json.dumps(credits, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    size = (OUT / f"{args.recipe_id}.jpg").stat().st_size // 1024
    print(f"{args.recipe_id}.jpg posée ({WIDTH}×{HEIGHT}, {size} Ko) et protégée contre tout réécrasement.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
