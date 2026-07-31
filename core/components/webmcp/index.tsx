'use client';

import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';

import { useAddToCartTool } from './use-add-to-cart-tool';
import { useOrderHistoryTool } from './use-order-history-tool';
import { useSearchProductsTool } from './use-search-products-tool';

/**
 * Global surface compatibility (checked against the installed sources, 2026-07):
 *
 * `use-webmcp-tool` registers on `document.modelContext` and unregisters by aborting an
 * `AbortSignal` passed as `registerTool(tool, { signal })`.
 *
 * `@mcp-b/webmcp-polyfill` v4 installs one context object on *both* `document.modelContext`
 * (primary, per the May 27 2026 draft) and `navigator.modelContext` (deprecated alias that
 * logs a warning on access), and its `registerTool` accepts the same `{ signal }` option.
 *
 * The two therefore agree: tools registered via the hook are visible to any consumer that
 * discovers them through the polyfill's `getTools()`, including the Persona chat widget.
 * No local hook shim is needed.
 *
 * Installed at module scope rather than in an effect so `document.modelContext` exists
 * before the tool hooks' registration effects run. The polyfill no-ops when there is no
 * `document`/`navigator` (SSR) and when a native implementation or another polyfill
 * instance already installed the property — first installer wins.
 */
initializeWebMCPPolyfill();

export function WebMCPProvider() {
  useSearchProductsTool();
  useOrderHistoryTool();
  useAddToCartTool();

  return null;
}
