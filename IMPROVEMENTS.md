# kitcommerce-core — improvement backlog

Prioritized findings from a 2026-07-18 study across kitcommerce-core, svelte-commerce, and the Varni
storefront fleet. Severity: **P0** money/data/crash · **P1** serious bug or systemic risk · **P2** real
bug, bounded blast radius · **P3** polish/DX. File refs are `src/lib/...` unless noted.

## Done (committed to master)
- **Variant-selection crash guard** (`0fd535d`) — `findVariantWithOptionValue` guards `selectedVariant?.options`; `setInitialSelectedVariant` fallback so the variant is never left undefined; `selectVariant`/`findAndSelect` gotos use `{ noScroll, replaceState }`.
- **Razorpay `* 80` FX multiplier removed** (`ec89641`) — `rp.amount` is already paise (backend order = `totalAmount*100`) and authoritative via `order_id`; the multiplier charged/displayed ~8000× intended.
- **PhonePe hardcoded phone removed** (`ec89641`) — now `cart.phone → shippingAddress.phone`.
- **`relatedProducts` bug** (`ec89641`) — the fetch callback assigned `deepCopy(page.data)` (whole page) instead of the fetched `data`.
- **Packaging** (`ec89641`) — `clsx` (undeclared) + `svelte-sonner`/`fuse.js`/`bits-ui`/`embla-carousel-svelte`/`@stripe/stripe-js`/`tailwind-merge`/`zod` moved from devDeps to `dependencies`; `@misiki/litekart-connector` made a `peerDependency`. A clean install now resolves.

## P1 — serious / systemic
- **SSR cross-request state leak.** `useProductState()` returns a module-level `static _instance` (`composables/product/use-product.svelte.ts:588,592`); ~20 composables use this pattern while cart/auth/wishlist correctly use `getContext`. On the server, module scope is shared across concurrent requests → one user's product/nav/filter state can bleed into another's render. **Unify on `getContext/setContext`; delete the static singletons.**
- **Missing product → soft-404.** `load-functions/(www)/products/[slug]/load` does `redirect(308,'/')` on any fetch error; every storefront reverses it to `error(404)`. Default to 404; make homepage-redirect opt-in.
- **Guest wishlist 422 on every page load.** `stores/wishlist2.svelte.ts` fetches `/wishlists/me` unconditionally on mount; anonymous users 422. Gate on the session signal (`connect.sid`/`UserState.user`). Apps currently monkey-patch `setState` to suppress it.
- **Brand identity is single-tenant / leaks.** `SeoHeader` reads raw `store.name` (defaults `'Litekart'`); product JSON-LD sets `brandName: page.data?.product?.vendorId` (a UUID — `use-product.svelte.ts:497`) and the consumer reads `aggregateRating.reviewRating` while the producer writes `ratingValue`, so ratings always fall back to 5★. **Add a brand-identity injection point** the SEO/schema components prefer over the raw store record, and **align producer/consumer JSON-LD field names**; build complete Product JSON-LD (brand from vendor/store, real rating, all gallery images).
- **No content-transform hook for supplier-authored copy.** Client-side SvelteKit fetches bypass `hooks.server` sanitization, so the fleet re-sanitizes brand/PII in five components. **Provide one connector-layer transform applied on both SSR and client fetches** — the single highest-leverage change; it would let consumers delete most boundary-rewrite code.
- **Cart hydration/contract.** `Cart2State.hasLoaded` rejects with no value; `isUpdatingCart` starts `true`; totals (`subtotal`/`qty`/`savingAmount`) aren't guaranteed populated on hydration; `add()` swallows errors (unbuyable products open an empty drawer). **Expose a typed `ready` promise + `status`, always-populated totals, an `onAdd`/`lastAdded` event, and propagate add failures.**

## P2 — bounded bugs
- **PDP option chips ship inverted selected-state** (selected renders white-on-white) and lack `aria-pressed` — `product-variation.svelte` + `product-aggregation.svelte`.
- **MsSearch results modal isn't portaled** → themed nav CSS leaks in and breaks search; portal to `<body>`.
- **`Cart2State.add()` fallback line-item match has no `return`** (`stores/cart.svelte.ts` block-body arrow) → always `undefined`, silent duplicate line on direct `add()`.
- **`appendOneTimeCartId` double-`?`** (`utils/one-time-cart.ts`) when the path already has a query string; build with `URLSearchParams`.
- **Stores throw strings, not Errors** (`stores/cart.svelte.ts` — callers reading `e.message` get `undefined`).
- **GA `view_item` fired by both core and app** (double events); `GoogleAnalytics` component has a double `.id` and likely never loads GTM.
- **`GoogleStructuredDataBreadcrumb` prop mismatch** on listing (`{categoryHierarchy}` vs `breadcrumbs:[{name,item}]`) → empty breadcrumb schema; accept `categoryHierarchy` and map internally.
- **LazyImg** removes `<img>` from SSR HTML (bad for crawlers), can strand at `opacity-0`, no terminal error placeholder.
- **Duplicate stores**: `wishlist.svelte.ts` (singleton) vs `wishlist2.svelte.ts` (context) both exported; `stores/product.svelte.ts` vs the product composable. Delete the dead one.
- **`formatPrice`/`priceRoundUp`** duplicate a 22-entry currency map and ignore locale grouping; use `Intl.NumberFormat`.

## Build / test / type hygiene
- No tests (`find src -name '*.test.*'` empty); one-line README. Add Vitest on the pure logic (`variants.helper`, cart reducer, `formatPrice`) and a `prepublishOnly: check && test` gate.
- Type safety is effectively opt-out: `services/types/index.ts` is empty; load functions typed `any`; 212 `any` occurrences; `page.data.product.pg/ag/categoryHierarchy/ratings` accessed but absent from the connector's `Product` type. `npm run check` clearly isn't gating publishes.
- `jsdom` is the sole prod dep and forced on every consumer for `utils/sanitize.ts`; consider an optional peer or a server-native sanitizer. The catch in `sanitize.ts` re-imports the thing that just failed.
- Fix misspellings baked into the API: `refershCart`/`refereshCart`; `settingState` (lowercase class).

## Not core — platform / data-contract gaps (for the backend, not the frontend)
- Unbuyable products carry a `prod_` id as their only "variant" id → cart API 400. (Root cause behind the crash guard + add-failure handling.)
- Catalogue copy is authored in the supplier brand voice, with a `JewelWeSell` tag facet. (Root cause behind the sanitizer tax.)
- Catalogue exposes only 3 real categories; finer nav slugs resolve empty.
- Shared-account single-tenant fields (`sitemap`, `logo`, `businessPhone/Email/address_1`, `socialLinks`) serve many brands. A tenant-aware identity model would let storefronts drop the entire boundary-rewrite layer.

---
*Highest-leverage single change: a brand-identity injection point + a connector content-transform hook applied on both SSR and client-side fetches. That collapses the bulk of consumer-side workaround code in one move.*
