# kitcommerce-core — improvement backlog

Prioritized findings from a 2026-07-18 study across kitcommerce-core, svelte-commerce, and the Varni
storefront fleet. Severity: **P0** money/data/crash · **P1** serious bug or systemic risk · **P2** real
bug, bounded blast radius · **P3** polish/DX. File refs are `src/lib/...` unless noted.

## Done (committed to master)
- **Variant-selection crash guard** (`0fd535d`) — `findVariantWithOptionValue` guards `selectedVariant?.options`; `setInitialSelectedVariant` fallback; `selectVariant`/`findAndSelect` gotos use `{ noScroll, replaceState }`.
- **Razorpay `* 80` FX multiplier removed** (`ec89641`) — `rp.amount` is already paise (backend order = `totalAmount*100`) and authoritative via `order_id`.
- **PhonePe hardcoded phone removed** (`ec89641`) — now `cart.phone → shippingAddress.phone`.
- **`relatedProducts` bug** (`ec89641`) — assigned `deepCopy(page.data)` instead of the fetched `data`.
- **Packaging** (`ec89641`) — runtime deps (`clsx` etc.) moved to `dependencies`; connector made a `peerDependency`. Clean install now resolves.
- **Product SSR singleton → context** (`fe2300e`) — `useProductState()` now uses `getContext`/`setContext` (the `<ProductStateProvider>` tree already existed) instead of a module-static `_instance`, so concurrent SSR requests no longer share one instance.
- **Soft-404 → 404** (`c18a21c`) — missing product returns `error(404)` instead of `redirect(308,'/')`.
- **Guest wishlist 422** (`c18a21c`) — mount read gated on the `connect.sid` session cookie.
- **Product JSON-LD** (`c18a21c`) — all gallery images (was thumbnail only); `brandName` no longer `vendorId`; consumer reads `ratingValue` (was `reviewRating` → always 5★) and only emits `aggregateRating` when there are real reviews; schema component prop retyped.
- **Cart `add()` fallback `.find()` missing `return`** (`c18a21c`).
- **Cart throws Errors not strings** (`c18a21c`) — callers' `e.message` now works.
- **`appendOneTimeCartId` double-`?`** (`c18a21c`).
- **GoogleAnalytics double-`.id`** (`c18a21c`) — read the plugin object, not its id; GTM loads now.
- **Breadcrumb schema accepts `categoryHierarchy`** (`ede6804`) — listing no longer emits empty schema.

## Investigated and deliberately deferred (with reason)
- **Delete duplicate `wishlist.svelte.ts`** — NOT dead: `product-card-renderer` + `my-wishlist-renderer` use the singleton `wishlistState`. Consolidating the singleton and context stores is a real refactor needing tests, not a delete.
- **`formatPrice` → `Intl.NumberFormat`** — current impl works; switching adds thousands-grouping and changes symbol spacing, i.e. a *visible* price change on every store. Cosmetic, not a bug — left as-is.
- **Cart `add()` propagate failures** — the fix is entangled: `use-checkout-cart` quantity steppers call `update()` fire-and-forget and rely on the current swallow, so making it throw needs all callers updated + integration testing. Belongs with the cart-contract redesign below.

## Remaining — architectural (need integration testing against a running app, and/or consumer adoption)
- **Other static-singleton composables** (nav, desktop/category filters, payment, `SerialNavigator`) — same SSR fix as product, but each needs its own provider-tree verified before converting.
- **Cart hydration/contract** — typed `ready` promise + `status`, always-populated totals (`qty`/`savingAmount`), an `onAdd`/`lastAdded` event (so the drawer opens without edge-detection), and propagated add failures (unbuyable products currently open an empty drawer). Cross-caller change.
- **Brand-identity injection + connector content-transform hook** — the single highest-leverage change: a brand identity the SEO/schema components prefer over the raw shared-account `store`, plus one transform applied on **both** SSR and client fetches, so consumers can delete the per-component sanitizers. Net-new API; delivers value once the fleet adopts it.
- **PDP option chips** inverted selected-state + `aria-pressed`; **MsSearch modal** portal to `<body>`; **LazyImg** SSR `<img>` + terminal error placeholder — component-level, verify visually in a running store.
- **SeoHeader** default `'Litekart'` and per-page SEO helpers (`buildProductSeo`/`buildListingSeo`).
- **Hygiene**: Vitest on the pure logic (`variants.helper`, cart reducer, `formatPrice`) + `prepublishOnly: check && test`; `check` currently has 178 pre-existing errors (mostly untyped `page.data`), so gating it is its own project.

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
