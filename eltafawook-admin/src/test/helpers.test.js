/**
 * Tests for orders/helpers.js — pure functions, no React needed.
 */
import { describe, it, expect } from 'vitest';
import { enrichReservation, SUBJECTS_BY_GRADE_AND_SECTION, SECOND_LANGUAGES } from '../views/orders/helpers';

describe('enrichReservation', () => {
  it('calculates total from unit_price_cents * qty', () => {
    const r = enrichReservation({ unit_price_cents: 500, qty: 3, prepaid_cents: 0, item_name: 'Book', item_grade: '1' });
    expect(r._unit).toBe(500);
    expect(r._qty).toBe(3);
    expect(r._total).toBe(1500);
    expect(r._paid).toBe(0);
    expect(r._remaining).toBe(1500);
  });

  it('uses total_cents when provided', () => {
    const r = enrichReservation({ unit_price_cents: 500, qty: 3, total_cents: 1200, prepaid_cents: 200, item_name: 'X', item_grade: '2' });
    expect(r._total).toBe(1200);
    expect(r._remaining).toBe(1000);
  });

  it('remaining never goes negative', () => {
    const r = enrichReservation({ unit_price_cents: 100, qty: 1, prepaid_cents: 200, item_name: 'Y', item_grade: '1' });
    expect(r._remaining).toBe(0);
  });

  it('prefers unit_price_cents_effective over unit_price_cents', () => {
    const r = enrichReservation({ unit_price_cents_effective: 700, unit_price_cents: 500, qty: 2, prepaid_cents: 0, item_name: 'Z', item_grade: '3' });
    expect(r._unit).toBe(700);
    expect(r._total).toBe(1400);
  });

  it('falls back teacher name to dash', () => {
    const r = enrichReservation({ unit_price_cents: 0, qty: 1, prepaid_cents: 0, item_name: 'A', item_grade: '1' });
    expect(r._teacherName).toBe('—');
  });

  it('uses teacher_name when present', () => {
    const r = enrichReservation({ unit_price_cents: 0, qty: 1, prepaid_cents: 0, item_name: 'A', item_grade: '1', teacher_name: 'Mr. X' });
    expect(r._teacherName).toBe('Mr. X');
  });

  it('builds item label from name and grade', () => {
    const r = enrichReservation({ unit_price_cents: 0, qty: 1, prepaid_cents: 0, item_name: 'Chemistry', item_grade: '2' });
    expect(r._itemLabel).toBe('Chemistry (Grade 2)');
  });
});

describe('SUBJECTS_BY_GRADE_AND_SECTION', () => {
  it('has entries for grades 1, 2, 3', () => {
    expect(Object.keys(SUBJECTS_BY_GRADE_AND_SECTION)).toEqual(['1', '2', '3']);
  });

  it('grade 1 has default section', () => {
    expect(SUBJECTS_BY_GRADE_AND_SECTION[1].default).toBeInstanceOf(Array);
    expect(SUBJECTS_BY_GRADE_AND_SECTION[1].default.length).toBeGreaterThan(0);
  });

  it('grade 2 has Literature and Science sections', () => {
    expect(SUBJECTS_BY_GRADE_AND_SECTION[2]).toHaveProperty('Literature');
    expect(SUBJECTS_BY_GRADE_AND_SECTION[2]).toHaveProperty('Science');
  });

  it('grade 3 has Literature, Science, Math sections', () => {
    expect(SUBJECTS_BY_GRADE_AND_SECTION[3]).toHaveProperty('Literature');
    expect(SUBJECTS_BY_GRADE_AND_SECTION[3]).toHaveProperty('Science');
    expect(SUBJECTS_BY_GRADE_AND_SECTION[3]).toHaveProperty('Math');
  });
});

describe('SECOND_LANGUAGES', () => {
  it('contains expected languages', () => {
    expect(SECOND_LANGUAGES).toContain('French');
    expect(SECOND_LANGUAGES).toContain('German');
    expect(SECOND_LANGUAGES.length).toBe(5);
  });
});
