import { z } from 'zod';

/**
 * Client-side GraphQL access for WebMCP tools.
 *
 * Requests go to Catalyst's same-origin GraphQL proxy (`~/proxies/with-graphql-proxy`),
 * which injects the Auth.js session's `customerAccessToken` server-side. That keeps the
 * storefront token out of the browser bundle and lets customer-scoped queries (orders,
 * profile) work without the tool ever handling a credential.
 */

const PROXY_REQUESTER = 'webmcp-tools';

/**
 * The proxy runs the client with the default `errorPolicy: 'none'`, so a GraphQL error is
 * thrown server-side and surfaces here as a non-2xx response rather than an `errors` array.
 */
export class GraphqlProxyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GraphqlProxyError';
    this.status = status;
  }
}

export async function fetchGraphqlProxy<TSchema extends z.ZodType<unknown>>(
  query: string,
  variables: Record<string, unknown>,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-catalyst-graphql-proxy-requester': PROXY_REQUESTER,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new GraphqlProxyError(
      `GraphQL proxy request failed with status ${response.status}`,
      response.status,
    );
  }

  const payload: unknown = await response.json();
  const envelope = z.object({ data: z.unknown() }).safeParse(payload);

  if (!envelope.success) {
    throw new GraphqlProxyError('GraphQL proxy returned no data', response.status);
  }

  const parsed = schema.safeParse(envelope.data.data);

  if (!parsed.success) {
    throw new GraphqlProxyError(
      'GraphQL proxy returned an unexpected response shape',
      response.status,
    );
  }

  return parsed.data;
}
