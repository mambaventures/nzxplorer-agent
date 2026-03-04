import { readCache, writeCache, describeRequest } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const BASE_URL = process.env.NZXPLORER_API_URL || 'https://nzxplorer.co.nz';

export interface ApiResponse {
  data: Record<string, unknown>;
  url: string;
}

/**
 * Remove redundant fields from API payloads before they are returned to the LLM.
 * This reduces token usage while preserving the financial metrics needed for analysis.
 */
export function stripFieldsDeep(value: unknown, fields: readonly string[]): unknown {
  const fieldsToStrip = new Set(fields);

  function walk(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map(walk);
    }

    if (!node || typeof node !== 'object') {
      return node;
    }

    const record = node as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(record)) {
      if (fieldsToStrip.has(key)) {
        continue;
      }
      cleaned[key] = walk(child);
    }

    return cleaned;
  }

  return walk(value);
}

export async function callApi(
  endpoint: string,
  params: Record<string, string | number | string[] | undefined>,
  options?: { cacheable?: boolean }
): Promise<ApiResponse> {
  const label = describeRequest(endpoint, params);

  // Check local cache first — avoids redundant network calls for immutable data
  if (options?.cacheable) {
    const cached = readCache(endpoint, params);
    if (cached) {
      return cached;
    }
  }

  const NZXPLORER_API_KEY = process.env.NZXPLORER_API_KEY;

  if (!NZXPLORER_API_KEY) {
    logger.warn(`[NZXplorer API] call without key: ${label}`);
  }

  const url = new URL(`${BASE_URL}${endpoint}`);

  // Always request LLM-optimized format for token efficiency
  url.searchParams.append('format', 'llm');

  // Add params to URL, handling arrays
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'X-API-Key': NZXPLORER_API_KEY || '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[NZXplorer API] network error: ${label} — ${message}`);
    throw new Error(`[NZXplorer API] request failed for ${label}: ${message}`);
  }

  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}`;
    logger.error(`[NZXplorer API] error: ${label} — ${detail}`);
    throw new Error(`[NZXplorer API] request failed: ${detail}`);
  }

  const data = await response.json().catch(() => {
    const detail = `invalid JSON (${response.status} ${response.statusText})`;
    logger.error(`[NZXplorer API] parse error: ${label} — ${detail}`);
    throw new Error(`[NZXplorer API] request failed: ${detail}`);
  });

  if (options?.cacheable) {
    writeCache(endpoint, params, data, url.toString());
  }

  return { data, url: url.toString() };
}
