import { useWebMCP, type WebMCPState } from 'use-webmcp-tool';
import { z } from 'zod';

import { fetchGraphqlProxy, GraphqlProxyError } from './graphql-proxy';
import { ORDER_HISTORY_QUERY } from './queries';

const OrderHistoryResponseSchema = z.object({
  customer: z
    .object({
      entityId: z.number(),
      orders: z
        .object({
          edges: z.array(
            z.object({
              node: z.object({
                entityId: z.number(),
                orderedAt: z.object({ utc: z.string() }),
                status: z.object({ label: z.string(), value: z.string() }),
                totalIncTax: z.object({ value: z.number(), currencyCode: z.string() }),
              }),
            }),
          ),
        })
        .nullish(),
    })
    .nullish(),
});

interface OrderHistoryArgs {
  limit?: number;
}

// Schema and description are copied from the Stencil SDK's tool definitions so the tool
// surface stays identical across implementations.
const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      default: 20,
      description: 'Maximum number of orders to return (default: 20)',
    },
  },
};

const DESCRIPTION = `Get the customer's order history. Returns a list of orders with:
- Order ID and date
- Order status (e.g., Pending, Shipped, Completed)
- Order total

Use when user asks "what are my orders", "show my order history", "did my order ship", etc.

For full order details, use get_order_details with a specific order ID.`;

const NOT_LOGGED_IN = {
  success: false,
  error: 'The customer is not logged in, so their order history is unavailable.',
  errorType: 'NOT_AUTHENTICATED',
};

export function useOrderHistoryTool(): WebMCPState {
  return useWebMCP<OrderHistoryArgs>({
    name: 'get_order_history',
    description: DESCRIPTION,
    inputSchema: INPUT_SCHEMA,
    annotations: { readOnlyHint: true },
    execute: async (args) => {
      let data: z.infer<typeof OrderHistoryResponseSchema>;

      try {
        data = await fetchGraphqlProxy(
          ORDER_HISTORY_QUERY,
          { first: args.limit ?? 20 },
          OrderHistoryResponseSchema,
        );
      } catch (error) {
        // The proxy only injects a customerAccessToken when a session exists; without one
        // the upstream `customer` field raises a GraphQL auth error, which the proxy
        // surfaces as a 5xx. Report that as "not logged in" rather than a tool failure.
        if (error instanceof GraphqlProxyError) {
          return NOT_LOGGED_IN;
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Could not load order history.',
          errorType: 'ORDER_HISTORY_ERROR',
        };
      }

      if (!data.customer) {
        return NOT_LOGGED_IN;
      }

      const orders = data.customer.orders?.edges.map(({ node }) => node) ?? [];

      if (orders.length === 0) {
        return { success: true, orderCount: 0, orders: [], message: 'No orders found' };
      }

      return {
        success: true,
        orderCount: orders.length,
        orders: orders.map((order) => ({
          id: order.entityId,
          date: order.orderedAt.utc,
          status: order.status.label,
          total: order.totalIncTax,
        })),
      };
    },
  });
}
