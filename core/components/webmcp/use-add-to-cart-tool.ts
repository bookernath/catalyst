import { useWebMCP, type WebMCPState } from 'use-webmcp-tool';

import { useRouter } from '~/i18n/routing';

import { addToCartFromTool, type AddToCartToolItem } from './_actions/add-to-cart';

interface AddToCartArgs {
  items?: AddToCartToolItem[];
}

// Schema and description are copied from the Stencil SDK's tool definitions so the tool
// surface stays identical across implementations.
const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productEntityId: {
            type: 'number',
            description: 'The product ID to add',
          },
          quantity: {
            type: 'number',
            minimum: 1,
            default: 1,
            description: 'Quantity to add (default: 1)',
          },
          variantEntityId: {
            type: 'number',
            description: 'Optional: specific variant ID if product has variants',
          },
          selectedOptions: {
            type: 'object',
            properties: {
              multipleChoices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    optionEntityId: { type: 'number' },
                    optionValueEntityId: { type: 'number' },
                  },
                  required: ['optionEntityId', 'optionValueEntityId'],
                },
                description: 'Selected multiple choice options (size, color, etc.)',
              },
            },
            description: 'Selected options for configurable products',
          },
        },
        required: ['productEntityId'],
      },
      description: 'Array of items to add to cart',
    },
  },
  required: ['items'],
};

const DESCRIPTION = `Add products to the shopping cart. Supports:
- Simple products (just product ID and quantity)
- Products with options (include variantId or selectedOptions)
- Multiple items at once

IMPORTANT: If a product has required options (like Size), you MUST either:
1. Include the variantId, OR
2. Include selectedOptions with all required option selections

If you're unsure, call get_product_details first to see the required options.

Returns the updated cart on success, or an error if options are missing.`;

export function useAddToCartTool(): WebMCPState {
  const router = useRouter();

  return useWebMCP<AddToCartArgs>({
    name: 'add_to_cart',
    description: DESCRIPTION,
    inputSchema: INPUT_SCHEMA,
    annotations: { readOnlyHint: false },
    execute: async (args) => {
      const result = await addToCartFromTool(args.items ?? []);

      // The cart count and cart page are server-rendered from the session's cart id, so
      // the tool's mutation is invisible until the current route re-renders.
      if (result.success) {
        router.refresh();
      }

      return result;
    },
  });
}
