import { addDays, compareISO, daysBetween, isISODate, seasonOf, toISO, weekStartFor, weekdayOf } from '../date';

describe('date', () => {
  it('valide le format et la cohérence calendaire', () => {
    expect(isISODate('2026-09-14')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('14/09/2026')).toBe(false);
  });

  it('addDays traverse les mois et les années', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('daysBetween est signé', () => {
    expect(daysBetween('2026-09-14', '2026-09-20')).toBe(6);
    expect(daysBetween('2026-09-20', '2026-09-14')).toBe(-6);
  });

  it('weekdayOf : 0 = lundi', () => {
    expect(weekdayOf('2026-09-14')).toBe(0); // lundi
    expect(weekdayOf('2026-09-19')).toBe(5); // samedi
    expect(weekdayOf('2026-09-20')).toBe(6); // dimanche
  });

  it('weekStartFor remonte au lundi, ou au jour de début choisi', () => {
    expect(weekStartFor('2026-09-19')).toBe('2026-09-14');
    expect(weekStartFor('2026-09-14')).toBe('2026-09-14');
    expect(weekStartFor('2026-09-19', 5)).toBe('2026-09-19'); // semaine qui démarre le samedi
    expect(weekStartFor('2026-09-18', 5)).toBe('2026-09-12');
  });

  it('seasonOf suit les saisons météorologiques', () => {
    expect(seasonOf('2026-03-01')).toBe('spring');
    expect(seasonOf('2026-07-15')).toBe('summer');
    expect(seasonOf('2026-09-19')).toBe('autumn');
    expect(seasonOf('2026-12-25')).toBe('winter');
    expect(seasonOf('2026-02-10')).toBe('winter');
  });

  it('toISO ne décale pas le jour (heure locale)', () => {
    expect(toISO(new Date(2026, 8, 14, 23, 30))).toBe('2026-09-14');
  });

  it('compareISO ordonne', () => {
    expect(compareISO('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareISO('2026-01-02', '2026-01-02')).toBe(0);
  });
});
