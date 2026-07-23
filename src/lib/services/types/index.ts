/**
 * Domain type barrel.
 *
 * This file was empty, which silently broke every consumer importing domain
 * types via `$lib/types` (which re-exports this module). Anything declared as
 * `interface Foo extends Cart` in a composable resolved `Cart` to nothing, so
 * the resulting type kept only the members the interface itself added — e.g.
 * `CartExtended` in `use-checkout-address.svelte.ts` lost every `Cart` field,
 * and downstream apps saw "Property 'email' does not exist on type
 * 'CartExtended'" for fields that plainly exist on the API response.
 *
 * The domain model lives in the connector, so re-export it here. Type-only, so
 * this barrel stays free of the connector's runtime service singletons —
 * consumers that need those import from `$lib/services` instead.
 */
export type * from '@misiki/litekart-connector'
