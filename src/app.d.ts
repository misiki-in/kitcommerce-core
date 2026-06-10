// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		type ProductOptionValue = {
			id: string
			value: string
			selectable?: boolean
			[key: string]: any
		}

		type ProductOption = {
			id: string
			title?: string
			type?: string
			values: ProductOptionValue[]
			[key: string]: any
		}

		type ProductVariant = {
			id: string
			title?: string
			stock?: number
			options?: Array<{ optionId: string; value: string }>
			[key: string]: any
		}

		type ProductPageData = Record<string, any> & {
			id: string
			title?: string
			slug?: string | null
			thumbnail?: string | null
			images?: string | null
			description?: string | null
			categoryId?: string | null
			categoryHierarchy?: Array<{ slug?: string }>
			variants?: ProductVariant[]
			options?: ProductOption[]
			pg?: Array<Record<string, string>>
			ag?: Record<string, any>
		}

		interface PageData {
			product?: ProductPageData
			products?: Record<string, any>
			store?: Record<string, any>
			[key: string]: any
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
