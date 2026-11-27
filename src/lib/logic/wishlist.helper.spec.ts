// Self-check for the heart tapped before sign-in. No framework: run it with `bun run test`.
import assert from 'node:assert';

const store = new Map<string, string>();
(globalThis as any).sessionStorage = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => void store.set(k, String(v)),
	removeItem: (k: string) => void store.delete(k)
};

const {
	addPendingWishlistAction,
	clearPendingWishlistAction,
	savePendingWishlistAction,
	PENDING_WISHLIST_TTL_MS
} = await import('./wishlist.helper.ts');

const saved: string[] = [];
const has = (p: string, v: string) => saved.includes(`${p}-${v}`);
const add = async (p: string, v: string) => (saved.push(`${p}-${v}`), true);

// Saved once after sign-in: a second sign-in signal (a login and a reload, say) adds nothing.
addPendingWishlistAction({ productId: 'p1', variantId: 'v1' }, 1000);
assert.strictEqual(await savePendingWishlistAction(has, add, 2000), true);
assert.strictEqual(await savePendingWishlistAction(has, add, 2001), false);
assert.deepStrictEqual(saved, ['p1-v1']);

// Already in the wishlist: not toggled back out, still reported as saved.
addPendingWishlistAction({ productId: 'p1', variantId: 'v1' }, 3000);
assert.strictEqual(await savePendingWishlistAction(has, add, 3001), true);
assert.deepStrictEqual(saved, ['p1-v1']);

// Abandoned: the dialog closed without signing in clears it, so a later sign-in saves nothing.
addPendingWishlistAction({ productId: 'p2', variantId: 'v2' }, 4000);
clearPendingWishlistAction();
assert.strictEqual(await savePendingWishlistAction(has, add, 4001), false);

// Expired: a sign-in long after the tap saves nothing, and the stale entry is gone.
addPendingWishlistAction({ productId: 'p3', variantId: '' }, 5000);
assert.strictEqual(
	await savePendingWishlistAction(has, add, 5000 + PENDING_WISHLIST_TTL_MS),
	false
);
assert.strictEqual(store.size, 0);

// Inside the expiry it is saved; a missing variant is kept as ''.
addPendingWishlistAction({ productId: 'p3' }, 6000);
assert.strictEqual(
	await savePendingWishlistAction(has, add, 6000 + PENDING_WISHLIST_TTL_MS - 1),
	true
);
assert.deepStrictEqual(saved, ['p1-v1', 'p3-']);

// A failed save reports false; garbage in storage reads as nothing.
addPendingWishlistAction({ productId: 'p4', variantId: 'v4' }, 7000);
assert.strictEqual(await savePendingWishlistAction(has, async () => false, 7001), false);
store.set('pendingWishlist', '{not json');
assert.strictEqual(await savePendingWishlistAction(has, add, 8000), false);

// Storage that throws (blocked site data) never breaks the tap or the sign-in.
(globalThis as any).sessionStorage = {
	getItem() {
		throw new Error('blocked');
	},
	setItem() {
		throw new Error('blocked');
	},
	removeItem() {
		throw new Error('blocked');
	}
};
addPendingWishlistAction({ productId: 'p5', variantId: 'v5' });
assert.strictEqual(await savePendingWishlistAction(has, add), false);

console.log('wishlist.helper: ok');
