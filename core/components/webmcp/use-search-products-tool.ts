import { useWebMCP, type WebMCPState } from 'use-webmcp-tool';
import { z } from 'zod';

import { fetchGraphqlProxy } from './graphql-proxy';
import { SEARCH_PRODUCTS_QUERY } from './queries';

const MoneySchema = z.object({ value: z.number(), currencyCode: z.string() });

const SearchProductsResponseSchema = z.object({
  site: z.object({
    search: z.object({
      searchProducts: z.object({
        products: z.object({
          collectionInfo: z.object({ totalItems: z.number().nullish() }).nullish(),
          pageInfo: z.object({
            hasNextPage: z.boolean(),
            endCursor: z.string().nullish(),
          }),
          edges: z.array(
            z.object({
              node: z.object({
                entityId: z.number(),
                name: z.string(),
                sku: z.string().nullish(),
                path: z.string(),
                plainTextDescription: z.string().nullish(),
                defaultImage: z.object({ url: z.string(), altText: z.string() }).nullish(),
                brand: z.object({ name: z.string() }).nullish(),
                prices: z
                  .object({
                    price: MoneySchema.nullish(),
                    salePrice: MoneySchema.nullish(),
                  })
                  .nullish(),
                inventory: z.object({ isInStock: z.boolean() }),
              }),
            }),
          ),
        }),
      }),
    }),
  }),
});

interface SearchProductsArgs {
  searchTerm?: string;
  categoryId?: number;
  categoryIds?: number[];
  brandIds?: number[];
  price?: { minPrice?: number; maxPrice?: number };
  rating?: { minRating?: number; maxRating?: number };
  hideOutOfStock?: boolean;
  first?: number;
  sort?: string;
}

// Schema and description are copied from the Stencil SDK's tool definitions so the tool
// surface stays identical across implementations.
const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    searchTerm: {
      type: 'string',
      description: 'Text search query to find products by name, description, or SKU',
    },
    categoryId: {
      type: 'number',
      description: 'Filter products by a specific category ID',
    },
    categoryIds: {
      type: 'array',
      items: { type: 'number' },
      description: 'Filter products by multiple category IDs',
    },
    brandIds: {
      type: 'array',
      items: { type: 'number' },
      description: 'Filter products by brand IDs',
    },
    price: {
      type: 'object',
      properties: {
        minPrice: { type: 'number', description: 'Minimum price filter' },
        maxPrice: { type: 'number', description: 'Maximum price filter' },
      },
      description: 'Price range filter',
    },
    rating: {
      type: 'object',
      properties: {
        minRating: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Minimum rating (1-5)',
        },
        maxRating: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Maximum rating (1-5)',
        },
      },
      description: 'Rating filter (1-5 stars)',
    },
    hideOutOfStock: {
      type: 'boolean',
      description: 'Set to true to hide out-of-stock products',
    },
    first: {
      type: 'number',
      default: 12,
      description: 'Number of products to return (default: 12)',
    },
    sort: {
      type: 'string',
      enum: [
        'A_TO_Z',
        'Z_TO_A',
        'LOWEST_PRICE',
        'HIGHEST_PRICE',
        'NEWEST',
        'BEST_SELLING',
        'BEST_REVIEWED',
        'RELEVANCE',
      ],
      description: 'Sort order for results',
    },
  },
};

const DESCRIPTION = `Search the BigCommerce product catalog. Use this to find products based on:
- Text search queries (product names, descriptions, SKUs)
- Category filtering (by category ID)
- Brand filtering (by brand IDs)
- Price range filtering (min/max price)
- Rating filtering (min/max rating 1-5)
- Stock availability filtering

Returns matching products with names, prices, images, and availability. Also returns available filter facets for refinement.

Call this FIRST when a user asks about products, wants to browse, or needs product recommendations.`;

export function useSearchProductsTool(): WebMCPState {
  return useWebMCP<SearchProductsArgs>({
    name: 'search_products',
    description: DESCRIPTION,
    inputSchema: INPUT_SCHEMA,
    annotations: { readOnlyHint: true },
    execute: async (args) => {
      try {
        const data = await fetchGraphqlProxy(
          SEARCH_PRODUCTS_QUERY,
          {
            searchTerm: args.searchTerm ?? null,
            categoryEntityId: args.categoryId ?? null,
            categoryEntityIds: args.categoryIds ?? null,
            brandEntityIds: args.brandIds ?? null,
            price: args.price ?? null,
            rating: args.rating ?? null,
            hideOutOfStock: args.hideOutOfStock ?? null,
            first: args.first ?? 12,
            sort: args.sort ?? null,
          },
          SearchProductsResponseSchema,
        );

        const { products } = data.site.search.searchProducts;

        return {
          success: true,
          totalItems: products.collectionInfo?.totalItems ?? products.edges.length,
          products: products.edges.map(({ node }) => ({
            id: node.entityId,
            name: node.name,
            sku: node.sku,
            path: node.path,
            description: node.plainTextDescription,
            price: node.prices?.price,
            salePrice: node.prices?.salePrice,
            imageUrl: node.defaultImage?.url,
            brand: node.brand?.name,
            inStock: node.inventory.isInStock,
          })),
          hasMoreResults: products.pageInfo.hasNextPage,
          nextCursor: products.pageInfo.endCursor,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Product search failed.',
          errorType: 'SEARCH_ERROR',
        };
      }
    },
  });
}
