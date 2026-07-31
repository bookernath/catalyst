'use server';

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';

import { addToOrCreateCart } from '~/lib/cart';
import { MissingCartError } from '~/lib/cart/error';

/**
 * Cart mutations deliberately do not go through the GraphQL proxy: Catalyst stores the
 * cart id in the server-side Auth.js session (`~/lib/cart`), so a cart created by a raw
 * proxied mutation would be orphaned and never rendered by the UI. Going through
 * `addToOrCreateCart` reuses the same create/append + `revalidateTag(TAGS.cart)` path as
 * the product detail page's form action.
 */

interface MultipleChoiceOption {
  optionEntityId: number;
  optionValueEntityId: number;
}

export interface AddToCartToolItem {
  productEntityId: number;
  quantity?: number;
  variantEntityId?: number;
  selectedOptions?: {
    multipleChoices?: MultipleChoiceOption[];
  };
}

export interface AddToCartToolResult {
  success: boolean;
  error?: string;
  errorType?: string;
  addedItems?: Array<{ productEntityId: number; quantity: number }>;
}

export async function addToCartFromTool(items: AddToCartToolItem[]): Promise<AddToCartToolResult> {
  if (items.length === 0) {
    return {
      success: false,
      error: 'No items were provided to add to the cart.',
      errorType: 'INVALID_INPUT',
    };
  }

  const lineItems = items.map((item) => ({
    productEntityId: item.productEntityId,
    quantity: item.quantity ?? 1,
    ...(item.variantEntityId !== undefined && { variantEntityId: item.variantEntityId }),
    ...(item.selectedOptions?.multipleChoices?.length && {
      selectedOptions: { multipleChoices: item.selectedOptions.multipleChoices },
    }),
  }));

  try {
    await addToOrCreateCart({ lineItems });

    return {
      success: true,
      addedItems: lineItems.map(({ productEntityId, quantity }) => ({
        productEntityId,
        quantity,
      })),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    if (error instanceof BigCommerceGQLError) {
      return {
        success: false,
        error: error.errors.map(({ message }) => message).join(' '),
        errorType: 'CART_GQL_ERROR',
      };
    }

    if (error instanceof MissingCartError) {
      return {
        success: false,
        error: 'The cart could not be created or found.',
        errorType: 'MISSING_CART',
      };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message, errorType: 'ADD_TO_CART_ERROR' };
    }

    return {
      success: false,
      error: 'An unknown error occurred while adding to the cart.',
      errorType: 'ADD_TO_CART_ERROR',
    };
  }
}
