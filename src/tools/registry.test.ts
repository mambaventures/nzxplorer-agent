import { describe, test, expect } from 'bun:test';
import { getToolRegistry, getTools, buildToolDescriptions } from './registry.js';

describe('Tool Registry', () => {
  const model = 'claude-sonnet-4-20250514';

  test('returns all core tools', () => {
    const registry = getToolRegistry(model);

    // Core tools always present: financial_search, financial_metrics, get_rbnz_ocr,
    // web_fetch, browser, read_file, write_file, edit_file
    const coreToolNames = [
      'financial_search',
      'financial_metrics',
      'get_rbnz_ocr',
      'web_fetch',
      'browser',
      'read_file',
      'write_file',
      'edit_file',
    ];

    for (const name of coreToolNames) {
      const found = registry.find((t) => t.name === name);
      expect(found).toBeDefined();
    }
  });

  test('getTools returns tool instances', () => {
    const tools = getTools(model);
    expect(tools.length).toBeGreaterThanOrEqual(8);

    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.invoke).toBe('function');
    }
  });

  test('buildToolDescriptions returns formatted string', () => {
    const desc = buildToolDescriptions(model);

    expect(desc).toContain('### financial_search');
    expect(desc).toContain('### financial_metrics');
    expect(desc).toContain('### get_rbnz_ocr');
    expect(desc).toContain('### web_fetch');
    expect(desc.length).toBeGreaterThan(500);
  });

  test('no duplicate tool names in registry', () => {
    const registry = getToolRegistry(model);
    const names = registry.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test('each registered tool has a rich description', () => {
    const registry = getToolRegistry(model);
    for (const entry of registry) {
      expect(entry.description.length).toBeGreaterThan(50);
    }
  });

  test('RBNZ OCR tool is in the registry', () => {
    const registry = getToolRegistry(model);
    const rbnz = registry.find((t) => t.name === 'get_rbnz_ocr');
    expect(rbnz).toBeDefined();
    expect(rbnz!.description).toContain('OCR');
  });
});
