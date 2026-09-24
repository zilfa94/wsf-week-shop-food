"""
Photos réelles des plats (demande du propriétaire du 2026-09-24).

Source : Pexels (https://www.pexels.com/license/) — usage commercial autorisé, attribution non
obligatoire (on la garde quand même dans CREDITS.json), interdiction de revendre les photos telles
quelles. Une photo de banque illustre **un** plat de ce type, pas le résultat exact de notre recette :
l'app l'affiche avec la mention « photo d'illustration ».

Une image peut aussi être **fournie par le propriétaire** (sa propre photo, ou une image générée par une IA) :
la déposer sous `assets/images/dishes/<id>.jpg` et marquer `{"source": "owner"}` dans `CREDITS.json` la protège
de tout écrasement par ce script. L'app parle d'« image d'illustration » et non de « photo » pour cette raison.

Chaque recette a une **requête écrite à la main** (en anglais : l'index de Pexels est anglophone).
Le rang de la photo retenue est mémorisé dans `scripts/dish-photo-picks.json` : pour remplacer une
photo qui ne convient pas, il suffit d'incrémenter son rang et de relancer.

    setx PEXELS_API_KEY "votre-clé"        (une seule fois, puis rouvrir le terminal)
    python scripts/dish-photos.py                 # télécharge ce qui manque
    python scripts/dish-photos.py --sheets        # planches de contrôle à relire
    python scripts/dish-photos.py --redo tajine_agneau_carottes_pommes_de_terre   # photo suivante

Sortie : `assets/images/dishes/<recipe_id>.jpg` (640 × 480), `CREDITS.json`, `LICENSE.md`,
et la table `src/data/dish-photos.ts` (require statiques pour Metro).
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "dishes"
PICKS = Path(__file__).resolve().parent / "dish-photo-picks.json"
CREDITS = OUT / "CREDITS.json"
TS_OUT = ROOT / "src" / "data" / "dish-photos.ts"
WIDTH, HEIGHT, QUALITY = 640, 480, 80
CANDIDATES = 8  # profondeur de la recherche : un rang plus élevé permet de changer de photo

# Requête de recherche par recette. Décrire le PLAT, pas la recette : 2 à 4 mots, en anglais.
QUERIES: dict[str, str] = {
    # petits-déjeuners et collations
    "porridge_pomme_cannelle_vegan": "oatmeal bowl apple",
    "porridge_banane_yaourt_miel": "banana porridge honey",
    "overnight_oats_banane_coco": "overnight oats jar",
    "smoothie_bol_fraise_banane": "strawberry smoothie bowl",
    "smoothie_orange_banane_coco": "smoothie glass orange fruit",
    "oeufs_brouilles_ciboulette": "scrambled eggs toast",
    "oeufs_coque_mouillettes": "soft boiled egg soldiers",
    "tartine_avocat_citron": "avocado toast",
    "tartine_avocat_oeuf": "avocado toast egg breakfast",
    "pain_perdu_cannelle": "french toast cinnamon",
    "croissant_fruits_frais": "croissant fruit breakfast",
    "croissant_yaourt_miel": "croissant yogurt breakfast",
    "muesli_yaourt_grec_fraises_pomme": "granola yogurt bowl fruit",
    "houmous_carottes": "hummus carrot sticks",
    "banane_chocolat": "sliced banana chocolate dessert",
    "yaourt_grec_fruits_rouges_miel": "greek yogurt berries honey",
    "tartine_comte_miel": "cheese toast honey",
    "energy_balls_avoine_cacao": "energy balls oats cocoa",
    "biscottes_confiture": "toast with jam",
    "pomme_tahini": "apple slices nut butter",
    "orange_chocolat_noir": "dark chocolate pieces",
    # cuisine française
    "poulet_basquaise": "chicken peppers tomato stew",
    "blanquette_poulet_riz": "chicken white sauce rice",
    "boeuf_bourguignon": "beef bourguignon",
    "boeuf_braise_carottes": "braised beef carrots",
    "gratin_dauphinois_lardons": "potato gratin",
    "lentilles_aux_lardons": "lentil stew bacon",
    "cabillaud_pommes_vapeur_citron": "cod fillet potatoes lemon",
    "saumon_poele_riz_creme_citron": "pan seared salmon rice",
    "omelette_champignons_persillade": "mushroom omelette",
    "salade_tiede_lentilles_comte": "lentil salad cheese",
    "dinde_chasseur_riz": "hunter chicken mushroom sauce",
    "filet_porc_normande_pommes_de_terre": "pork fillet cream sauce",
    "gratin_courgettes_chevre": "zucchini gratin cheese",
    "sardines_grillees_salade_tomates_basilic": "grilled sardines tomato salad",
    "oeufs_cocotte_creme_epinards_comte": "baked eggs ramekin spinach",
    "daube_boeuf_provencale_pommes_de_terre": "beef stew provencal",
    "poelee_pois_chiches_provencale": "chickpea stew vegetables pan",
    "moules_mariniere_pommes_de_terre_sautees": "moules marinieres mussels",
    # cuisine méditerranéenne et italienne
    "ratatouille_provencale_riz": "ratatouille",
    "poulet_grecque_citron_olives": "greek lemon chicken olives",
    "cabillaud_a_la_provencale": "cod tomato sauce",
    "saumon_quinoa_sauce_yaourt_citron": "salmon quinoa bowl",
    "salade_grecque_feta": "greek salad feta",
    "aubergines_gratinees_mozzarella": "baked eggplant cheese dish",
    "pates_tomate_mozzarella_basilic": "pasta tomato mozzarella basil",
    "tagine_pois_chiches_legumes": "vegetable chickpea tagine",
    "soupe_lentilles_corail_tomate": "red lentil tomato soup",
    "shakshuka_oeufs_poivrons": "shakshuka",
    "crevettes_ail_citron_riz": "garlic shrimp rice",
    "dinde_milanaise_spaghetti": "breaded cutlet spaghetti",
    "salade_pates_tomates_cerises_mozzarella": "pasta salad mozzarella tomatoes",
    "chorizo_poivrons_tomate_riz": "chorizo rice dish",
    "moules_tomate_vin_blanc_pommes_de_terre": "mussels tomato sauce",
    "salade_pois_chiches_concombre_feta_menthe": "chickpea feta cucumber salad",
    "riz_pilaf_carottes_petits_pois_olives": "rice pilaf vegetables",
    "poivrons_pois_chiches_mijotes_catalane": "stewed peppers chickpeas",
    # cuisine asiatique et indienne
    "poulet_saute_gingembre_riz": "ginger chicken stir fry rice",
    "poulet_mijote_lait_coco_citron_vert": "coconut chicken curry",
    "boeuf_hache_saute_basilic_thai": "thai basil beef rice",
    "crevettes_sautees_nouilles_riz": "shrimp stir fried noodles",
    "saumon_teriyaki_brocoli_riz": "teriyaki salmon rice",
    "riz_saute_oeuf_crevettes_petits_pois": "shrimp egg fried rice",
    "nouilles_riz_pois_chiches_legumes": "vegetable rice noodles",
    "dahl_lentilles_corail_lait_coco": "red lentil dahl",
    "bibimbap_boeuf_carotte_epinard": "bibimbap bowl",
    "riz_vinaigre_saumon_avocat_concombre": "salmon avocado rice bowl",
    "soupe_epicee_crevettes_champignons": "tom yum shrimp soup",
    "curry_chou_fleur_pomme_terre_petits_pois": "cauliflower potato curry",
    "rajma_curry_haricots_rouges_riz": "kidney bean curry rice",
    "oeufs_brouilles_epices_tomate_oignon": "scrambled eggs tomato onion",
    "bun_ga_vermicelles_riz_menthe_concombre": "vietnamese noodle bowl chicken",
    "porc_saute_bulgogi_gingembre_riz": "korean pork rice bowl",
    # cuisine orientale
    "tajine_agneau_carottes_pommes_de_terre": "lamb tagine",
    "brochettes_poulet_citron_cumin_boulgour": "chicken skewers bulgur",
    "kefta_boeuf_sauce_tomate_oeuf": "kofta tomato sauce",
    "saumon_chermoula_riz": "marinated salmon herbs rice",
    "chana_masala_pois_chiches": "chana masala",
    "couscous_pois_chiches_legumes": "vegetable couscous",
    "falafels_tahini_citron": "falafel tahini",
    "harira_lentilles_agneau": "moroccan lentil soup",
    "poulet_mijote_olives_citron": "chicken tagine olives",
    "chakchouka_poivrons_oeufs": "tunisian eggs peppers pan",
    "salade_mechouia_tunisienne": "grilled pepper salad",
    "poulet_libanais_sauce_ail_citron": "lebanese chicken rice",
    "cabillaud_sauce_tomate_poivrons": "white fish fillet tomato sauce",
    "lentilles_corail_epicees_riz": "spiced red lentils rice",
    "loubia_haricots_rouges_boeuf": "red bean beef stew",
    "pois_chiches_epinards_marocaine": "chickpeas spinach curry bowl",
    "taboule_libanais_persil_menthe": "tabbouleh parsley salad",
    "crevettes_chermoula_riz": "spiced shrimp rice",
    # plats végétariens
    "pad_thai_vegetarien_nouilles_riz_oeuf": "pad thai",
    "risotto_champignons_parmesan": "mushroom risotto",
    "chili_sin_carne_haricots_rouges": "vegetarian chili beans",
    "galettes_lentilles_corail_epinards_tahini": "lentil patties salad",
    "bourguignon_lentilles_legumes": "lentil stew bowl",
    "soupe_courge_butternut_lait_coco_pain": "butternut squash soup",
    "curry_legumes_epinards_lait_coco": "spinach coconut curry bowl",
    "poelee_courge_champignons_poireau_quinoa": "roasted squash quinoa",
    "wok_legumes_croquants_nouilles_riz": "vegetable noodle stir fry",
}

LICENSE = """# Photos des plats

Source : **Pexels** — https://www.pexels.com/license/

La licence Pexels autorise l'usage commercial et **n'impose pas l'attribution** ; les crédits sont
tout de même conservés dans `CREDITS.json` (photographe, page d'origine, identifiant) par correction
et pour pouvoir retirer une photo à la demande. Elle interdit de revendre les photos telles quelles,
de les redistribuer sur une autre banque d'images, et d'utiliser une personne identifiable d'une
manière qui lui porte préjudice ou suggère qu'elle recommande le produit.

Ces photos **illustrent un plat de ce type** ; ce ne sont pas des photos du résultat de nos recettes.
L'application l'indique (« photo d'illustration »).

Téléchargées et recadrées par `scripts/dish-photos.py` (640 × 480, JPEG qualité 80).
"""


def recipes() -> dict[str, str]:
    """Identifiants et noms des recettes, lus directement dans `src/data/recipes-*.ts`."""
    out: dict[str, str] = {}
    for f in sorted((ROOT / "src" / "data").glob("recipes-*.ts")):
        for rid, name in re.findall(r"id: '([a-z0-9_]+)',\s*name: '([^']+)'", f.read_text(encoding="utf-8")):
            out[rid] = name
    return out


def load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def save(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


def search(query: str, key: str) -> list[dict]:
    """Photos candidates, de la plus pertinente à la moins pertinente (orientation paysage)."""
    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
        {"query": query, "per_page": CANDIDATES, "orientation": "landscape"}
    )
    req = urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "WSF-WeekShopFood (scripts/dish-photos.py)"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read()).get("photos", [])


def download(photo: dict) -> Image.Image:
    src = photo["src"].get("large") or photo["src"]["original"]
    req = urllib.request.Request(src, headers={"User-Agent": "WSF-WeekShopFood (scripts/dish-photos.py)"})
    with urllib.request.urlopen(req, timeout=60) as res:
        img = Image.open(io.BytesIO(res.read())).convert("RGB")
    # recadrage centré au format 4:3 puis réduction
    target = WIDTH / HEIGHT
    w, h = img.size
    if w / h > target:
        new_w = int(h * target)
        img = img.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
    else:
        new_h = int(w / target)
        img = img.crop((0, (h - new_h) // 2, w, (h + new_h) // 2))
    return img.resize((WIDTH, HEIGHT), Image.LANCZOS)


def fetch_missing(key: str, only: list[str] | None) -> None:
    names = recipes()
    picks: dict[str, int] = load(PICKS, {})
    credits: dict[str, dict] = load(CREDITS, {})
    OUT.mkdir(parents=True, exist_ok=True)
    # Une photo fournie par le propriétaire (`source: owner` dans CREDITS.json) n'est jamais écrasée :
    # pour en changer, supprimer son fichier .jpg d'abord.
    owned = {r for r, c in credits.items() if c.get("source") == "owner"}
    todo = [r for r in QUERIES if (only and r in only) or (not only and not (OUT / f"{r}.jpg").exists())]
    for r in [r for r in todo if r in owned]:
        print(f"  = {r} : photo fournie par le propriétaire, conservée")
    todo = [r for r in todo if r not in owned]
    if not todo:
        print("Toutes les photos sont déjà là (--redo <id> pour en changer une).")
        return
    print(f"{len(todo)} photo(s) à récupérer…")
    for rid in todo:
        rank = picks.get(rid, 0)
        try:
            found = search(QUERIES[rid], key)
        except urllib.error.HTTPError as err:
            print(f"  ! {rid} : HTTP {err.code} ({'clé refusée' if err.code == 401 else err.reason})")
            if err.code == 401:
                return
            continue
        if not found:
            print(f"  ! {rid} : aucune photo pour « {QUERIES[rid]} »")
            continue
        photo = found[min(rank, len(found) - 1)]
        download(photo).save(OUT / f"{rid}.jpg", quality=QUALITY, optimize=True)
        credits[rid] = {"id": photo["id"], "photographer": photo["photographer"], "url": photo["url"], "query": QUERIES[rid], "rank": rank}
        print(f"  {rid} ← « {QUERIES[rid]} » #{rank} par {photo['photographer']}")
        time.sleep(0.3)
    save(CREDITS, credits)
    (OUT / "LICENSE.md").write_text(LICENSE, encoding="utf-8", newline="\n")
    write_table(names)


def sheets() -> None:
    """Planches de contrôle : 12 plats par image, nom sous chaque photo, pour repérer les erreurs."""
    names = recipes()
    have = [r for r in QUERIES if (OUT / f"{r}.jpg").exists()]
    cols, cw, ch, pad, label = 3, 260, 195, 14, 34
    per = 12
    for page in range(0, len(have), per):
        chunk = have[page : page + per]
        rows = (len(chunk) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cw + pad * (cols + 1), rows * (ch + label) + pad * (rows + 1)), (244, 245, 247))
        d = ImageDraw.Draw(sheet)
        for i, rid in enumerate(chunk):
            x = pad + (i % cols) * (cw + pad)
            y = pad + (i // cols) * (ch + label + pad)
            sheet.paste(Image.open(OUT / f"{rid}.jpg").resize((cw, ch), Image.LANCZOS), (x, y))
            name = names.get(rid, rid)
            d.text((x, y + ch + 6), name[:44], fill=(43, 43, 46))
            d.text((x, y + ch + 19), rid[:44], fill=(140, 140, 147))
        out = OUT.parent / f"planche-plats-{page // per + 1}.jpg"
        sheet.save(out, quality=85)
        print(f"planche : {out}")


def write_table(names: dict[str, str]) -> None:
    have = sorted(r for r in QUERIES if (OUT / f"{r}.jpg").exists())
    lines = [
        "/**",
        " * Photos des plats — GÉNÉRÉ par `scripts/dish-photos.py`, ne pas éditer à la main.",
        " * Banque d'images Pexels (assets/images/dishes/LICENSE.md, crédits dans CREDITS.json).",
        " * Ce sont des photos d'illustration : elles montrent un plat de ce type, pas le résultat",
        " * exact de notre recette — l'écran Recette le précise.",
        " */",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const DISH_PHOTOS: Readonly<Record<string, ImageSourcePropType>> = {",
        *[f"  {rid}: require('@/assets/images/dishes/{rid}.jpg') as ImageSourcePropType," for rid in have],
        "};",
        "",
        "/** Photo d'un plat, ou `undefined` si la recette n'en a pas encore. */",
        "export const dishPhoto = (recipeId: string): ImageSourcePropType | undefined => DISH_PHOTOS[recipeId];",
        "",
    ]
    TS_OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    total = sum(p.stat().st_size for p in OUT.glob("*.jpg"))
    print(f"{len(have)}/{len(names)} photos, {total // 1024} Ko → {OUT.relative_to(ROOT)} ; {TS_OUT.relative_to(ROOT)} généré")


def check() -> int:
    """Chaque recette a une requête, chaque requête vise une recette existante."""
    names = recipes()
    problems = [f"recette sans requête : {r}" for r in sorted(set(names) - set(QUERIES))]
    problems += [f"requête d'une recette inconnue : {r}" for r in sorted(set(QUERIES) - set(names))]
    if problems:
        print("\n".join(problems))
    return 1 if problems else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheets", action="store_true", help="planches de contrôle des photos déjà téléchargées")
    ap.add_argument("--redo", nargs="+", metavar="ID", help="reprendre la photo suivante pour ces recettes")
    ap.add_argument("--check", action="store_true", help="vérifier la table des requêtes sans rien télécharger")
    args = ap.parse_args()

    if check() and not args.sheets:
        return 1
    if args.check:
        print(f"{len(QUERIES)} requêtes, une par recette. Rien à corriger.")
        return 0
    if args.sheets:
        sheets()
        return 0

    key = os.environ.get("PEXELS_API_KEY", "").strip()
    if not key:
        print("PEXELS_API_KEY absente. Créez une clé gratuite sur https://www.pexels.com/api/ puis :")
        print('    setx PEXELS_API_KEY "votre-clé"   (rouvrir le terminal ensuite)')
        return 1
    if args.redo:
        picks = load(PICKS, {})
        for rid in args.redo:
            if rid not in QUERIES:
                print(f"recette inconnue : {rid}")
                return 1
            picks[rid] = picks.get(rid, 0) + 1
            print(f"{rid} → photo #{picks[rid]}")
        save(PICKS, picks)
    fetch_missing(key, args.redo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
