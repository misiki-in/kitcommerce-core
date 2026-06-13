import type { cartService, From } from "../index.ts"

export type Cart = From<typeof cartService.getCartByCartId>

export type CartLineItem = {
	id: string
	productId: string
	variantId: string
	qty: number
	price: number
	total: number
}

export type CartProduct = {
	id: string
	slug: string
	thumbnail: string
	productId: string
	variantId: string
	item_id: string
	title: string
	price: number
	product: any // This should reference Product type
	qty: number
}
