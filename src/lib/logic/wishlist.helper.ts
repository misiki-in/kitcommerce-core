// The heart a signed-out shopper taps. It is kept until sign-in finishes so the item can be saved
// then, once. sessionStorage, not localStorage: it lives in the one tab that opened sign-in and
// survives a reload during it (the code step of a phone sign-in), but not a visit next week. The
// expiry covers a shopper who wanders off without closing the dialog. Storage can be missing or
// throw (private windows, blocked site data), so every access is wrapped and failure means "none".
const KEY = 'pendingWishlist';
export const PENDING_WISHLIST_TTL_MS = 15 * 60 * 1000;

type Pending = { productId: string; variantId: string; at: number };

const storage = (): Storage | undefined => {
	try {
		return globalThis.sessionStorage;
	} catch {
		return undefined;
	}
};

export const addPendingWishlistAction = (
	{ productId, variantId }: { productId: string; variantId?: string },
	now = Date.now()
) => {
	if (!productId) return;
	try {
		storage()?.setItem(KEY, JSON.stringify({ productId, variantId: variantId || '', at: now }));
	} catch {}
};

export const clearPendingWishlistAction = () => {
	try {
		storage()?.removeItem(KEY);
	} catch {}
};

/** Returns the pending item and forgets it, so whoever takes it is the only one to save it. */
export const takePendingWishlistAction = (now = Date.now()): Omit<Pending, 'at'> | undefined => {
	let raw: string | null | undefined;
	try {
		raw = storage()?.getItem(KEY);
	} catch {}
	clearPendingWishlistAction();
	if (!raw) return;
	try {
		const { productId, variantId, at } = JSON.parse(raw) as Pending;
		if (!productId || !(now - at >= 0 && now - at < PENDING_WISHLIST_TTL_MS)) return;
		return { productId, variantId: variantId || '' };
	} catch {}
};

/**
 * Run once sign-in has finished: saves the pending item, unless it is already in the wishlist
 * (a toggle would take it out again). Resolves true when the item is in the wishlist afterwards.
 */
export const savePendingWishlistAction = async (
	has: (productId: string, variantId: string) => boolean,
	add: (productId: string, variantId: string) => Promise<boolean>,
	now = Date.now()
) => {
	const item = takePendingWishlistAction(now);
	if (!item) return false;
	if (has(item.productId, item.variantId)) return true;
	return add(item.productId, item.variantId);
};
