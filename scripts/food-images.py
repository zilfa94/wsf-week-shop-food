"""
Images PNG des produits et des plats (refonte du design, 2026-09-20).

Source : Fluent Emoji 3D de Microsoft (https://github.com/microsoft/fluentui-emoji, licence MIT, PNG 256 px).
Ce script télécharge une image par emoji utilisé, réduit celles des ingrédients à 160 px (affichées petites),
garde 256 px pour les plats (vignettes des recettes), écrit `assets/images/food/<slug>.png`, `LICENSE.md`
et génère `src/data/food-images.ts` (table id → image, `require` statiques pour Metro).

Outil de développement (Python 3 + Pillow) : les images générées sont versionnées, personne n'a besoin
de le relancer sauf pour ajouter un ingrédient ou une recette (compléter les tables ci-dessous).

    python scripts/food-images.py
"""
from __future__ import annotations

import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "food"
TS_OUT = ROOT / "src" / "data" / "food-images.ts"
RAW = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/{folder}/3D/{file}_3d.png"
INGREDIENT_PX = 160
DISH_PX = 256

# slug → dossier Fluent (nom CLDR de l'emoji, première lettre en majuscule).
EMOJI: dict[str, str] = {
    "tomato": "Tomato", "onion": "Onion", "garlic": "Garlic", "carrot": "Carrot", "potato": "Potato",
    "sweet_potato": "Roasted sweet potato", "cucumber": "Cucumber", "eggplant": "Eggplant", "bell_pepper": "Bell pepper",
    "leafy_green": "Leafy green", "mushroom": "Mushroom", "broccoli": "Broccoli", "herb": "Herb", "avocado": "Avocado",
    "banana": "Banana", "red_apple": "Red apple", "tangerine": "Tangerine", "lemon": "Lemon", "strawberry": "Strawberry",
    "blueberries": "Blueberries", "coconut": "Coconut", "baguette": "Baguette bread", "bread": "Bread", "bagel": "Bagel",
    "croissant": "Croissant", "flatbread": "Flatbread", "poultry_leg": "Poultry leg", "cut_of_meat": "Cut of meat",
    "meat_on_bone": "Meat on bone", "bacon": "Bacon", "hot_dog": "Hot dog", "fish": "Fish", "shrimp": "Shrimp",
    "oyster": "Oyster", "canned_food": "Canned food", "glass_of_milk": "Glass of milk", "butter": "Butter", "egg": "Egg",
    "cheese": "Cheese wedge", "bowl_with_spoon": "Bowl with spoon", "spaghetti": "Spaghetti", "cooked_rice": "Cooked rice",
    "sheaf_of_rice": "Sheaf of rice", "beans": "Beans", "pot_of_food": "Pot of food", "olive": "Olive", "salt": "Salt",
    "sunflower": "Sunflower", "jar": "Jar", "hot_pepper": "Hot pepper", "ice": "Ice", "honey_pot": "Honey pot",
    "chocolate_bar": "Chocolate bar", "maple_leaf": "Maple leaf", "wine_glass": "Wine glass",
    # plats
    "curry_rice": "Curry rice", "steaming_bowl": "Steaming bowl", "shallow_pan": "Shallow pan of food", "green_salad": "Green salad",
    "cooking": "Cooking", "cup_with_straw": "Cup with straw", "falafel": "Falafel", "oden": "Oden", "cookie": "Cookie",
    "pancakes": "Pancakes",
}

DISHES = {"curry_rice", "steaming_bowl", "shallow_pan", "green_salad", "cooking", "cup_with_straw", "falafel", "oden", "cookie",
          "pancakes", "pot_of_food", "spaghetti", "cooked_rice", "bowl_with_spoon", "fish", "bread", "croissant", "egg",
          "banana", "red_apple", "tangerine", "carrot", "avocado", "eggplant", "poultry_leg"}

INGREDIENTS: dict[str, str] = {
    "tomate": "tomato", "tomates_cerises": "tomato", "oignon": "onion", "echalote": "onion", "ail": "garlic", "ail_en_poudre": "garlic",
    "carotte": "carrot", "pomme_de_terre": "potato", "patate_douce": "sweet_potato", "courgette": "cucumber", "aubergine": "eggplant",
    "poivron": "bell_pepper", "concombre": "cucumber", "salade": "leafy_green", "poireau": "leafy_green", "champignon": "mushroom",
    "brocoli": "broccoli", "chou_fleur": "broccoli", "epinard": "leafy_green", "haricot_vert": "herb", "celeri_branche": "leafy_green",
    "celeri_rave": "potato", "betterave": "sweet_potato", "radis": "leafy_green", "asperge": "herb", "courge_butternut": "sweet_potato",
    "avocat": "avocado", "banane": "banana", "pomme": "red_apple", "orange": "tangerine", "citron": "lemon", "citron_vert": "lemon",
    "fraise": "strawberry", "gingembre": "sweet_potato", "persil": "herb", "coriandre": "herb", "basilic": "herb", "ciboulette": "herb",
    "menthe": "herb", "thym": "herb", "pain": "baguette", "pain_mie": "bread", "pain_burger": "bagel", "croissant": "croissant",
    "biscotte": "bread", "poulet_blanc": "poultry_leg", "poulet_cuisse": "poultry_leg", "poulet_entier": "poultry_leg",
    "dinde_escalope": "poultry_leg", "boeuf_hache": "cut_of_meat", "steak_boeuf": "cut_of_meat", "boeuf_bourguignon": "cut_of_meat",
    "porc_echine": "cut_of_meat", "lardons": "bacon", "jambon_blanc": "meat_on_bone", "saucisse": "hot_dog", "chorizo": "hot_dog",
    "agneau_epaule": "meat_on_bone", "saumon": "fish", "cabillaud": "fish", "thon_frais": "fish", "crevette": "shrimp", "moules": "oyster",
    "sardine_fraiche": "fish", "dorade": "fish", "lait": "glass_of_milk", "creme_fraiche": "bowl_with_spoon", "creme_liquide": "glass_of_milk",
    "beurre": "butter", "oeuf": "egg", "yaourt": "bowl_with_spoon", "yaourt_grec": "bowl_with_spoon", "fromage_blanc": "bowl_with_spoon",
    "emmental_rape": "cheese", "parmesan": "cheese", "mozzarella": "cheese", "feta": "cheese", "chevre_frais": "cheese", "comte": "cheese",
    "mascarpone": "cheese", "ricotta": "cheese", "camembert": "cheese", "pates": "spaghetti", "pates_penne": "spaghetti", "spaghetti": "spaghetti",
    "riz": "cooked_rice", "riz_basmati": "cooked_rice", "semoule": "cooked_rice", "boulgour": "cooked_rice", "quinoa": "cooked_rice",
    "lentilles": "beans", "lentilles_corail": "beans", "pois_chiches_secs": "beans", "pois_chiches": "canned_food", "haricots_rouges": "canned_food",
    "tomates_pelees": "canned_food", "concentre_tomate": "canned_food", "lait_coco": "coconut", "thon_boite": "canned_food",
    "mais_boite": "canned_food", "nouilles_riz": "spaghetti", "farine": "sheaf_of_rice", "farine_de_mais": "sheaf_of_rice",
    "chapelure": "sheaf_of_rice", "bouillon_cube": "pot_of_food", "olives": "olive", "capres": "olive", "tortillas": "flatbread",
    "levure_chimique": "bread", "levure_boulangere": "bread", "polenta": "cooked_rice", "sauce_tomate": "jar", "sel": "salt", "poivre": "salt",
    "huile_olive": "olive", "huile_tournesol": "sunflower", "vinaigre_balsamique": "jar", "vinaigre_blanc": "jar", "vinaigre_de_riz": "jar",
    "moutarde": "jar", "sauce_soja": "jar", "curry_poudre": "salt", "cumin": "salt", "paprika": "hot_pepper", "cannelle": "salt",
    "curcuma": "salt", "herbes_de_provence": "herb", "piment_en_poudre": "hot_pepper", "noix_de_muscade": "salt", "tahini": "jar",
    "harissa": "hot_pepper", "miso": "jar", "mayonnaise": "jar", "ketchup": "tomato", "cornichons": "cucumber", "sucre": "ice",
    "miel": "honey_pot", "chocolat_noir": "chocolate_bar", "flocons_avoine": "sheaf_of_rice", "confiture": "jar", "vanille_extrait": "jar",
    "cacao_poudre": "chocolate_bar", "sirop_erable": "maple_leaf", "vin_blanc_cuisine": "wine_glass", "jus_citron": "lemon",
    "petits_pois_surgeles": "beans", "epinards_surgeles": "leafy_green", "haricots_verts_surgeles": "herb", "fruits_rouges_surgeles": "blueberries",
    "legumes_wok_surgeles": "broccoli",
}

RECIPES: dict[str, str] = {
    "poulet_saute_gingembre_riz": "shallow_pan", "poulet_mijote_lait_coco_citron_vert": "curry_rice", "boeuf_hache_saute_basilic_thai": "shallow_pan",
    "crevettes_sautees_nouilles_riz": "steaming_bowl", "saumon_teriyaki_brocoli_riz": "fish", "riz_saute_oeuf_crevettes_petits_pois": "cooked_rice",
    "nouilles_riz_pois_chiches_legumes": "steaming_bowl", "dahl_lentilles_corail_lait_coco": "curry_rice", "porridge_pomme_cannelle_vegan": "bowl_with_spoon",
    "porridge_banane_yaourt_miel": "bowl_with_spoon", "overnight_oats_banane_coco": "bowl_with_spoon", "smoothie_bol_fraise_banane": "bowl_with_spoon",
    "smoothie_orange_banane_coco": "cup_with_straw", "oeufs_brouilles_ciboulette": "cooking", "oeufs_coque_mouillettes": "egg",
    "tartine_avocat_citron": "avocado", "tartine_avocat_oeuf": "avocado", "pain_perdu_cannelle": "pancakes", "croissant_fruits_frais": "croissant",
    "croissant_yaourt_miel": "croissant", "muesli_yaourt_grec_fraises_pomme": "bowl_with_spoon", "poulet_basquaise": "shallow_pan",
    "blanquette_poulet_riz": "pot_of_food", "boeuf_bourguignon": "pot_of_food", "boeuf_braise_carottes": "pot_of_food",
    "gratin_dauphinois_lardons": "shallow_pan", "lentilles_aux_lardons": "pot_of_food", "cabillaud_pommes_vapeur_citron": "fish",
    "saumon_poele_riz_creme_citron": "fish", "omelette_champignons_persillade": "cooking", "salade_tiede_lentilles_comte": "green_salad",
    "ratatouille_provencale_riz": "shallow_pan", "poulet_grecque_citron_olives": "poultry_leg", "cabillaud_a_la_provencale": "fish",
    "saumon_quinoa_sauce_yaourt_citron": "fish", "salade_grecque_feta": "green_salad", "aubergines_gratinees_mozzarella": "eggplant",
    "pates_tomate_mozzarella_basilic": "spaghetti", "tagine_pois_chiches_legumes": "pot_of_food", "soupe_lentilles_corail_tomate": "bowl_with_spoon",
    "shakshuka_oeufs_poivrons": "shallow_pan", "tajine_agneau_carottes_pommes_de_terre": "pot_of_food",
    "brochettes_poulet_citron_cumin_boulgour": "oden", "kefta_boeuf_sauce_tomate_oeuf": "oden", "saumon_chermoula_riz": "fish",
    "chana_masala_pois_chiches": "curry_rice", "couscous_pois_chiches_legumes": "pot_of_food", "falafels_tahini_citron": "falafel",
    "harira_lentilles_agneau": "bowl_with_spoon", "houmous_carottes": "carrot", "banane_chocolat": "banana",
    "yaourt_grec_fruits_rouges_miel": "bowl_with_spoon", "tartine_comte_miel": "bread", "energy_balls_avoine_cacao": "cookie",
    "pomme_tahini": "red_apple", "orange_chocolat_noir": "tangerine",
    "pad_thai_vegetarien_nouilles_riz_oeuf": "steaming_bowl", "risotto_champignons_parmesan": "cooked_rice",
    "chili_sin_carne_haricots_rouges": "pot_of_food", "galettes_lentilles_corail_epinards_tahini": "falafel",
    "bourguignon_lentilles_legumes": "pot_of_food", "soupe_courge_butternut_lait_coco_pain": "bowl_with_spoon",
    "curry_legumes_epinards_lait_coco": "curry_rice", "poelee_courge_champignons_poireau_quinoa": "shallow_pan",
    "wok_legumes_croquants_nouilles_riz": "steaming_bowl",
    # collations revues (2026-09-24)
    "tzatziki_batonnets_legumes": "bowl_with_spoon",
    "bruschetta_tomate_basilic": "bread",
    "crepes_sucrees": "pancakes",
    "riz_au_lait_vanille": "bowl_with_spoon",
    "compote_pommes_cannelle": "red_apple",
    "salade_fruits_frais": "tangerine",
    # deuxième série par famille (2026-09-21)
    "dinde_chasseur_riz": "pot_of_food", "filet_porc_normande_pommes_de_terre": "shallow_pan",
    "gratin_courgettes_chevre": "shallow_pan", "sardines_grillees_salade_tomates_basilic": "fish",
    "oeufs_cocotte_creme_epinards_comte": "cooking", "daube_boeuf_provencale_pommes_de_terre": "pot_of_food",
    "poelee_pois_chiches_provencale": "shallow_pan", "moules_mariniere_pommes_de_terre_sautees": "pot_of_food",
    "crevettes_ail_citron_riz": "shallow_pan", "dinde_milanaise_spaghetti": "spaghetti",
    "salade_pates_tomates_cerises_mozzarella": "spaghetti", "chorizo_poivrons_tomate_riz": "shallow_pan",
    "moules_tomate_vin_blanc_pommes_de_terre": "pot_of_food", "salade_pois_chiches_concombre_feta_menthe": "green_salad",
    "riz_pilaf_carottes_petits_pois_olives": "cooked_rice", "poivrons_pois_chiches_mijotes_catalane": "pot_of_food",
    "bibimbap_boeuf_carotte_epinard": "cooked_rice", "riz_vinaigre_saumon_avocat_concombre": "cooked_rice",
    "soupe_epicee_crevettes_champignons": "steaming_bowl", "curry_chou_fleur_pomme_terre_petits_pois": "curry_rice",
    "rajma_curry_haricots_rouges_riz": "curry_rice", "oeufs_brouilles_epices_tomate_oignon": "cooking",
    "bun_ga_vermicelles_riz_menthe_concombre": "steaming_bowl", "porc_saute_bulgogi_gingembre_riz": "shallow_pan",
    "poulet_mijote_olives_citron": "pot_of_food", "chakchouka_poivrons_oeufs": "cooking",
    "salade_mechouia_tunisienne": "green_salad", "poulet_libanais_sauce_ail_citron": "poultry_leg",
    "cabillaud_sauce_tomate_poivrons": "fish", "lentilles_corail_epicees_riz": "curry_rice",
    "loubia_haricots_rouges_boeuf": "pot_of_food", "pois_chiches_epinards_marocaine": "shallow_pan",
    "taboule_libanais_persil_menthe": "green_salad", "crevettes_chermoula_riz": "cooked_rice",
}

LICENSE = """# Images des produits et des plats

Fichiers `*.png` de ce dossier : **Fluent Emoji** (Microsoft), style 3D — https://github.com/microsoft/fluentui-emoji

Licence MIT :

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Générés par `scripts/food-images.py` (réduction à 160 px pour les ingrédients, 256 px pour les plats).
"""


def ids_in(pattern: str, *files: Path) -> set[str]:
    out: set[str] = set()
    for f in files:
        out.update(re.findall(pattern, f.read_text(encoding="utf-8")))
    return out


def main() -> int:
    data = ROOT / "src" / "data"
    ingredient_ids = ids_in(r"id: '([a-z0-9_]+)',\s*name:", data / "ingredients.ts")
    recipe_ids = ids_in(r"id: '([a-z0-9_]+)',\s*name:", *sorted(data.glob("recipes-*.ts")))
    problems = [f"ingrédient sans image : {i}" for i in sorted(ingredient_ids - INGREDIENTS.keys())]
    problems += [f"image d'un ingrédient inconnu : {i}" for i in sorted(INGREDIENTS.keys() - ingredient_ids)]
    problems += [f"recette sans image : {r}" for r in sorted(recipe_ids - RECIPES.keys())]
    problems += [f"image d'une recette inconnue : {r}" for r in sorted(RECIPES.keys() - recipe_ids)]
    problems += [f"slug inconnu : {s}" for s in sorted({*INGREDIENTS.values(), *RECIPES.values()} - EMOJI.keys())]
    if problems:
        print("\n".join(problems))
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    used = sorted({*INGREDIENTS.values(), *RECIPES.values()})
    for slug in used:
        folder = EMOJI[slug]
        url = RAW.format(folder=urllib.request.quote(folder), file=folder.lower().replace(" ", "_"))
        target = OUT / f"{slug}.png"
        if target.exists():
            continue
        req = urllib.request.Request(url, headers={"User-Agent": "WSF-WeekShopFood (scripts/food-images.py)"})
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read()
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
        px = DISH_PX if slug in DISHES else INGREDIENT_PX
        if img.width != px:
            img = img.resize((px, px), Image.LANCZOS)
        img.save(target, optimize=True)
        print(f"{slug}.png ← {folder} ({px} px, {target.stat().st_size // 1024} Ko)")
    for stale in OUT.glob("*.png"):
        if stale.stem not in used:
            stale.unlink()
            print(f"supprimé : {stale.name}")
    (OUT / "LICENSE.md").write_text(LICENSE, encoding="utf-8", newline="\n")

    lines = [
        "/**",
        " * Images des produits et des plats — GÉNÉRÉ par `scripts/food-images.py`, ne pas éditer à la main.",
        " * Fluent Emoji 3D (Microsoft, licence MIT — assets/images/food/LICENSE.md). `require` statiques pour Metro.",
        " */",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const FOOD_IMAGES = {",
        *[f"  {slug}: require('@/assets/images/food/{slug}.png') as ImageSourcePropType," for slug in used],
        "} as const;",
        "",
        "export type FoodImageKey = keyof typeof FOOD_IMAGES;",
        "",
        "/** Image de chaque ingrédient (`src/data/ingredients.ts`). */",
        "export const INGREDIENT_IMAGE: Readonly<Record<string, FoodImageKey>> = " + json.dumps(INGREDIENTS, indent=2, ensure_ascii=False).replace('"', "'") + ";",
        "",
        "/** Image de chaque recette (`src/data/recipes-*.ts`). */",
        "export const RECIPE_IMAGE: Readonly<Record<string, FoodImageKey>> = " + json.dumps(RECIPES, indent=2, ensure_ascii=False).replace('"', "'") + ";",
        "",
    ]
    TS_OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    total = sum(p.stat().st_size for p in OUT.glob("*.png"))
    print(f"{len(used)} images, {total // 1024} Ko → {OUT.relative_to(ROOT)} ; {TS_OUT.relative_to(ROOT)} généré")
    return 0


if __name__ == "__main__":
    sys.exit(main())
