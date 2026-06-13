import type { Variant } from './product-variant-types.js'
import { productService } from '../services/product-service.ts'
import type { From } from '../index.ts'

export type Product = From<typeof productService.getOne>

// Enums
export enum ProductStatus {
	DRAFT = 'draft',
	PROPOSED = 'proposed',
	PUBLISHED = 'published',
	REJECTED = 'rejected'
}

export type AutoComplete = {
	id: string // Unique identifier for the autocomplete entry
	text: string // Text for the autocomplete suggestion
	type: string // Type/category of the suggestion (e.g., "product", "category")
	popularity: number // Popularity score, used for ranking
	createdAt: string // Timestamp of when the entry was created
	updatedAt: string // Timestamp of the last update to the entry
}
