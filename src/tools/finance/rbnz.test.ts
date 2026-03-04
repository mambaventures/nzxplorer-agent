import { describe, test, expect } from 'bun:test';
import { getRbnzOcr } from './rbnz.js';

describe('get_rbnz_ocr', () => {
  test('returns current OCR rate', async () => {
    const raw = await getRbnzOcr.invoke({ include_history: false });
    const result = JSON.parse(raw);

    expect(result.data).toBeDefined();
    expect(result.data.current_ocr).toBeGreaterThan(0);
    expect(result.data.current_ocr).toBeLessThan(10);
    expect(result.data.current_ocr_pct).toMatch(/^\d+\.\d+%$/);
    expect(result.data.last_decision_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.data.last_decision_direction).toMatch(/^(hike|cut|hold)$/);
    expect(result.data.peak_this_cycle).toBe(5.75);
    expect(result.data.note).toContain('risk-free rate');
    expect(result.sourceUrls).toHaveLength(1);
    expect(result.data.decision_history).toBeUndefined();
  });

  test('returns OCR history when requested', async () => {
    const raw = await getRbnzOcr.invoke({ include_history: true });
    const result = JSON.parse(raw);

    expect(result.data.decision_history).toBeDefined();
    expect(result.data.decision_history.length).toBeGreaterThan(20);
    expect(result.data.total_decisions).toBeGreaterThan(20);

    // First entry should be the most recent
    const first = result.data.decision_history[0];
    expect(first.rate).toBe(result.data.current_ocr);
    expect(first.date).toBe(result.data.last_decision_date);
  });

  test('filters history by years', async () => {
    const raw = await getRbnzOcr.invoke({ include_history: true, years: 1 });
    const result = JSON.parse(raw);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoff = oneYearAgo.toISOString().slice(0, 10);

    for (const decision of result.data.decision_history) {
      expect(decision.date >= cutoff).toBe(true);
    }
  });

  test('has correct tool metadata', () => {
    expect(getRbnzOcr.name).toBe('get_rbnz_ocr');
    expect(getRbnzOcr.description).toContain('OCR');
    expect(getRbnzOcr.description).toContain('risk-free rate');
  });
});
