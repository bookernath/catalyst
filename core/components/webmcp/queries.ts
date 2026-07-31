/**
 * Plain-string GraphQL documents for the WebMCP tools.
 *
 * These are not `graphql()` (gql.tada) documents because they are sent from the browser as
 * raw strings through the GraphQL proxy, which forwards the string verbatim. Field and
 * filter names are verified against Catalyst's own typed usage — search against
 * `app/[locale]/(default)/(faceted)/fetch-faceted-search.ts`, orders against
 * `app/[locale]/(default)/account/orders/page-data.ts`.
 */

export const SEARCH_PRODUCTS_QUERY = `
  query WebMCPSearchProducts(
    $searchTerm: String
    $categoryEntityId: Int
    $categoryEntityIds: [Int!]
    $brandEntityIds: [Int!]
    $price: PriceSearchFilterInput
    $rating: RatingSearchFilterInput
    $hideOutOfStock: Boolean
    $first: Int = 12
    $sort: SearchProductsSortInput
  ) {
    site {
      search {
        searchProducts(
          filters: {
            searchTerm: $searchTerm
            categoryEntityId: $categoryEntityId
            categoryEntityIds: $categoryEntityIds
            brandEntityIds: $brandEntityIds
            price: $price
            rating: $rating
            hideOutOfStock: $hideOutOfStock
          }
          sort: $sort
        ) {
          products(first: $first) {
            collectionInfo {
              totalItems
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                entityId
                name
                sku
                path
                plainTextDescription(characterLimit: 200)
                defaultImage {
                  url(width: 400, height: 400)
                  altText
                }
                brand {
                  name
                }
                prices {
                  price {
                    value
                    currencyCode
                  }
                  salePrice {
                    value
                    currencyCode
                  }
                }
                inventory {
                  isInStock
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const ORDER_HISTORY_QUERY = `
  query WebMCPOrderHistory($first: Int = 20) {
    customer {
      entityId
      orders(first: $first) {
        edges {
          node {
            entityId
            orderedAt {
              utc
            }
            status {
              label
              value
            }
            totalIncTax {
              value
              currencyCode
            }
          }
        }
      }
    }
  }
`;
