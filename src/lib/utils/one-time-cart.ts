import { page } from "$app/state";

export function appendOneTimeCartId(path: string) {
  const oneTimeCartId = page.url.searchParams.get('cart_id')
  if (!oneTimeCartId) return path
  // use the correct separator when `path` already carries a query string,
  // otherwise `/checkout/address?showEditAddress=true` becomes a double-`?` URL
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}cart_id=${oneTimeCartId}`
}
