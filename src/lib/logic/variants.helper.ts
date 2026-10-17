import type { Variant } from '$lib/types'

/**
 * Find a variant with a specific option value, also taking into account the previously selected options.
 * @note This works given that a single option will always have distinct values and every combination of options exists in the variants.
 * @param variants list of variants
 * @param optionId option id of the current change
 * @param value current change of option value
 */
export const findVariantWithOptionValue = (
	variants: Variant[],
	{ selectedVariant, optionId, value }: { optionId: string; value: string; selectedVariant: Variant }
) => {
	// Step 1: Take account of what previous options have been selected except the current change
	// selectedVariant can be undefined (e.g. a deep-linked variant_id that matches no variant, or a
	// grouped product whose variants carry ids that never resolve) — guard it so the option click
	// updates state instead of throwing on `.options`.
	const selectedOptions = selectedVariant?.options?.filter((option: Variant['options'][0]) => option.optionId !== optionId) as {
		optionId: string
		value: string
	}[]
	selectedOptions?.push({ optionId, value })

	// Step 2: Find the variant that has the selected options and the new option
	let v = variants.find((variant) => {
		if (!variant.options?.length) return false
		return variant.options.every((option) => {
			return selectedOptions?.some((selectedOption: any) => selectedOption.optionId === option.optionId && selectedOption.value === option.value)
		})
	})

	// Step 3: If exact variant not found then find the first variant that has the current passed option value pair
	if (!v) {
		v = variants.find((variant) => {
			if (!variant.options?.length) return false
			return variant.options.some((option) => option.optionId === optionId && option.value === value)
		})
	}

	return v
}

export interface FindClosestAggregationProductParams {
	pg: Array<Record<string, any>>
	optionName: string
	value: string
	currentSelections: Record<string, string>
	ag?: Record<string, any[]>
	attributes?: Array<{ name: string; rank?: number }>
}

/**
 * Finds the closest variant/product in a grouped product array (pg) when selecting a new option value.
 *
 * Algorithm & Design:
 * 1. Filter candidates: Only products where product[optionName] matches the desired value.
 * 2. Exact match short-circuit: If a candidate matches all other current selections, return it immediately in O(1)-O(N).
 * 3. Distance minimization: If no exact match exists, score each candidate by:
 *    - matchCount: Maximize number of options that can stay identical to current selections.
 *    - priorityScore: Tie-breaker prioritizing higher-ranked attributes (e.g. from attributes[].rank) staying same.
 *    - valueDistance: Tie-breaker minimizing index distance in ag[key] for options that must change.
 * 4. Zero object allocations inside the candidate evaluation loop for maximum efficiency.
 */
export const findClosestAggregationProduct = ({
	pg,
	optionName,
	value,
	currentSelections,
	ag,
	attributes
}: FindClosestAggregationProductParams): Record<string, any> | null => {
	if (!pg || !Array.isArray(pg) || !pg.length || !optionName) return null

	const targetValue = value !== undefined && value !== null ? String(value) : ''
	const selections = currentSelections || {}

	// Determine all aggregation keys
	const agKeys = ag && typeof ag === 'object' ? Object.keys(ag) : []
	const allKeys = agKeys.length ? agKeys : Object.keys(selections)
	const otherKeys = allKeys.filter((k) => k !== optionName)

	// Pre-compute attribute ranks for tie-breaking
	const rankMap = new Map<string, number>()
	if (Array.isArray(attributes) && attributes.length) {
		for (let i = 0; i < attributes.length; i++) {
			const attr = attributes[i]
			if (attr?.name && typeof attr.rank === 'number' && !rankMap.has(attr.name)) {
				rankMap.set(attr.name, attr.rank)
			}
		}
	}

	// Sort otherKeys by priority: lower rank number = higher priority
	const sortedOtherKeys = [...otherKeys].sort((a, b) => {
		const aRank = rankMap.get(a) ?? Number.MAX_SAFE_INTEGER
		const bRank = rankMap.get(b) ?? Number.MAX_SAFE_INTEGER
		return aRank - bRank
	})

	const totalOtherKeys = sortedOtherKeys.length

	// Priority weights: highest rank gets largest weight
	const keyPriorityMap = new Map<string, number>()
	for (let i = 0; i < totalOtherKeys; i++) {
		keyPriorityMap.set(sortedOtherKeys[i], totalOtherKeys - i)
	}

	// Build index lookup maps for option values in ag to measure distance for changed options
	const valueIndexMap = new Map<string, Map<string, number>>()
	if (ag && typeof ag === 'object') {
		for (let i = 0; i < totalOtherKeys; i++) {
			const k = sortedOtherKeys[i]
			const vals = ag[k]
			if (Array.isArray(vals)) {
				const valMap = new Map<string, number>()
				for (let j = 0; j < vals.length; j++) {
					const item = vals[j]
					const str = String(
						typeof item === 'object' && item !== null
							? (item.value ?? item.val ?? item.name ?? item)
							: item
					)
					valMap.set(str, j)
				}
				valueIndexMap.set(k, valMap)
			}
		}
	}

	let bestProduct: Record<string, any> | null = null
	let bestMatchCount = -1
	let bestPriorityScore = -1
	let bestValueDistance = Number.MAX_SAFE_INTEGER

	for (let i = 0; i < pg.length; i++) {
		const product = pg[i]
		if (!product || String(product[optionName]) !== targetValue) continue

		let matchCount = 0
		let priorityScore = 0
		let valueDistance = 0

		for (let j = 0; j < totalOtherKeys; j++) {
			const k = sortedOtherKeys[j]
			const targetVal = currentSelections[k]
			const productVal = product[k] !== undefined && product[k] !== null ? String(product[k]) : undefined

			if (targetVal !== undefined && productVal === targetVal) {
				matchCount++
				priorityScore += keyPriorityMap.get(k) ?? 1
			} else if (targetVal !== undefined && productVal !== undefined) {
				const valMap = valueIndexMap.get(k)
				if (valMap) {
					const targetIdx = valMap.get(targetVal)
					const productIdx = valMap.get(productVal)
					if (targetIdx !== undefined && productIdx !== undefined) {
						valueDistance += Math.abs(productIdx - targetIdx)
					} else {
						valueDistance += 100
					}
				} else {
					valueDistance += 1
				}
			}
		}

		// Exact match found (all other attributes preserved): return immediately!
		if (matchCount === totalOtherKeys) {
			return product
		}

		if (
			matchCount > bestMatchCount ||
			(matchCount === bestMatchCount && priorityScore > bestPriorityScore) ||
			(matchCount === bestMatchCount && priorityScore === bestPriorityScore && valueDistance < bestValueDistance)
		) {
			bestProduct = product
			bestMatchCount = matchCount
			bestPriorityScore = priorityScore
			bestValueDistance = valueDistance
		}
	}

	return bestProduct
}

