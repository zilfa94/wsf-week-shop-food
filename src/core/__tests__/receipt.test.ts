/** Lecture d'un ticket de caisse : libellés abrégés réels des enseignes françaises. */
import { indexIngredients } from '../dataset';
import {
  containsAllWords,
  expandAbbreviations,
  isIgnorableLine,
  matchReceiptLabel,
  normalizeLabel,
  parsePrice,
  parseQuantity,
  readReceipt,
} from '../receipt';
import { INGREDIENTS } from '../../data/ingredients';

const INDEX = indexIngredients(INGREDIENTS);
const read = (label: string) => matchReceiptLabel(expandAbbreviations(normalizeLabel(label)));

describe('lecture d’un ticket de caisse', () => {
  it('normalise et développe les abréviations des enseignes', () => {
    expect(normalizeLabel('CRÈME FRAÎCHE ÉPAISSE 20CL')).toBe('creme fraiche epaisse 20cl');
    expect(expandAbbreviations('crf bio lait 1/2 ecreme 1l')).toBe('lait demi ecreme 1l');
    expect(expandAbbreviations('crm fraiche epaisse 20cl')).toBe('creme fraiche epaisse 20cl');
    expect(normalizeLabel('PDT CHARLOTTE 1,5KG')).toBe('pdt charlotte 1.5kg');
    expect(expandAbbreviations('pdt charlotte 1.5kg')).toBe('pomme de terre charlotte 1.5kg');
    expect(expandAbbreviations('mozza di bufala 125g')).toBe('mozzarella di bufala 125g');
  });

  it('reconnaît les mots dans le désordre, au singulier comme au pluriel', () => {
    expect(containsAllWords('saumon pave x2', 'pave de saumon')).toBe(false); // « de » absent du ticket
    expect(containsAllWords('saumon pave x2', 'pave saumon')).toBe(true);
    expect(containsAllWords('tomates grappe 1kg', 'tomate')).toBe(true);
    expect(containsAllWords('yaourt nature x4', 'yaourts natures')).toBe(true);
  });

  it('rattache les vraies lignes de ticket à nos ingrédients', () => {
    const cas: readonly [string, string | null][] = [
      ['TOMATES GRAPPE 1KG', 'tomate'],
      ['CRF BIO LAIT 1/2 ECREME 1L', 'lait'],
      ['PDT CHARLOTTE 1,5KG', 'pomme_de_terre'],
      ['CRM FRAICHE EPAISSE 20CL', 'creme_fraiche'],
      ['FROM BLANC 3% 500G', 'fromage_blanc'],
      ['MOZZA DI BUFALA 125G', 'mozzarella'],
      ['BAN CAVENDISH 0,850KG', 'banane'],
      ['EMM RAPE 200G', 'emmental_rape'],
      ['OEUFS PLEIN AIR X6', 'oeuf'],
      ['HUILE OLIVE VIERGE EX 75CL', 'huile_olive'],
      ['RIZ BASMATI 1KG', 'riz_basmati'],
      ['LARDONS FUMES 2X100G', 'lardons'],
      ['CHAMPIGNONS DE PARIS BQT', 'champignon'],
      ['BEURRE DOUX PLAQ 250G', 'beurre'],
      ['CITRONS JAUNES FILET', 'citron'],
      ['COURGETTES VRAC', 'courgette'],
      ['POIS CHICHES 400G', 'pois_chiches'],
      ['BAGUETTE TRADITION', 'pain'],
      // Ce que l'on ne doit surtout pas confondre :
      ['LAIT DE COCO 400ML', 'lait_coco'],
      ['SAUMON FUME 4 TRANCHES', null], // fumé : ce n'est pas notre saumon frais
      ['PIZZA 4 FROMAGES', null], // plat préparé
      ['CROQUETTES CHAT 2KG', null], // non alimentaire pour nous
    ];
    const problems = cas.filter(([label, expected]) => read(label) !== expected).map(([label, expected]) => `${label} → ${read(label)} (attendu ${expected})`);
    expect(problems).toEqual([]);
  });

  it('lit les quantités dans l’unité de l’ingrédient', () => {
    expect(parseQuantity('tomates grappe 1kg', 'g')).toBe(1000);
    expect(parseQuantity('pois chiches 400g', 'g')).toBe(400);
    expect(parseQuantity('banane 0.850kg', 'g')).toBe(850);
    expect(parseQuantity(expandAbbreviations(normalizeLabel('PDT CHARLOTTE 1,5KG')), 'g')).toBe(1500);
    expect(parseQuantity('lardons 2x100g', 'g')).toBe(200);
    expect(parseQuantity('huile olive 75cl', 'ml')).toBe(750);
    expect(parseQuantity('lait demi ecreme 1l', 'ml')).toBe(1000);
    expect(parseQuantity('oeufs plein air x6', 'piece')).toBe(6);
    expect(parseQuantity('courgettes vrac', 'g')).toBeNull();
  });

  it('écarte les lignes qui ne sont pas des articles', () => {
    for (const line of ['TOTAL', 'TOTAL A PAYER 48,12', 'CARTE BANCAIRE', 'DONT TVA 5,5%', 'MERCI DE VOTRE VISITE', '12,90', 'NB ARTICLES 14']) {
      expect(isIgnorableLine(normalizeLabel(line))).toBe(true);
    }
    expect(isIgnorableLine(normalizeLabel('TOMATES GRAPPE 1KG'))).toBe(false);
  });

  it('lit un ticket entier, garde les lignes incomprises et relève les prix', () => {
    const ticket = [
      'SUPER U ALFORTVILLE',
      'TOMATES GRAPPE 1KG            2,49',
      'PDT CHARLOTTE 1,5KG           3,15',
      'CRM FRAICHE EPAISSE 20CL      1,29',
      'BOUGIE PARFUMEE               4,99',
      'TOTAL                        11,92',
      'CARTE BANCAIRE               11,92',
    ].join('\n');
    const lines = readReceipt(ticket, INDEX);

    expect(lines.map((l) => l.ingredientId)).toEqual([null, 'tomate', 'pomme_de_terre', 'creme_fraiche', null]);
    expect(lines[1]).toMatchObject({ ingredientId: 'tomate', quantity: 1000, price: 2.49 });
    expect(lines[3]).toMatchObject({ ingredientId: 'creme_fraiche', quantity: 200, price: 1.29 });
    // La bougie n'est pas un aliment : la ligne reste visible, sans ingrédient ni quantité.
    expect(lines[4]).toMatchObject({ ingredientId: null, quantity: null });
  });

  it('retombe sur un conditionnement standard quand la ligne ne porte pas de quantité', () => {
    const [line] = readReceipt('COURGETTES VRAC 2,10', INDEX);
    expect(line!.ingredientId).toBe('courgette');
    expect(line!.quantity).toBe(INDEX.get('courgette')!.packaging.size);
  });
});
