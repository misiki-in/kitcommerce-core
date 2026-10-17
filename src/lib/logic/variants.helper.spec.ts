import assert from 'node:assert'
import { findClosestAggregationProduct } from './variants.helper.ts'

// Test Scenario 1: Exact match exists
{
	const pg = [
		{ id: '1', slug: 'ring-lab-10k', 'Diamond Type': 'Lab Grown', 'Metal Stamp': '10K', 'Diamond Clarity': 'SI1' },
		{ id: '2', slug: 'ring-nat-10k', 'Diamond Type': 'Natural', 'Metal Stamp': '10K', 'Diamond Clarity': 'SI1' },
		{ id: '3', slug: 'ring-nat-14k', 'Diamond Type': 'Natural', 'Metal Stamp': '14K', 'Diamond Clarity': 'SI1' }
	]

	const result = findClosestAggregationProduct({
		pg,
		optionName: 'Diamond Type',
		value: 'Natural',
		currentSelections: {
			'Diamond Type': 'Lab Grown',
			'Metal Stamp': '10K',
			'Diamond Clarity': 'SI1'
		}
	})

	assert.strictEqual(result?.id, '2', 'Should pick exact matching product when available')
}

// Test Scenario 2: User's reported bug
// When selecting 'Natural', the current clarity 'VVS1-VVS2' is unavailable.
// It should keep 'Metal Stamp' as '10K' and only update 'Diamond Clarity'.
{
	const ag = {
		'Diamond Type': ['Lab Grown', 'Natural'],
		'Metal Type': ['Yellow Gold', 'White Gold'],
		'Metal Stamp': ['10K', '14K'],
		'Total Carat Weight': ['2.29 ct', '2.35 ct'],
		'Diamond Color': ['E-F', 'G-H'],
		'Diamond Clarity': ['SI1', 'VVS1-VVS2', 'SI2'],
		'Ring Size': ['4', '4.5', '5', '6', '7']
	}

	const attributes = [
		{ name: 'Diamond Type', rank: 1 },
		{ name: 'Metal Type', rank: 2 },
		{ name: 'Metal Stamp', rank: 3 },
		{ name: 'Total Carat Weight', rank: 4 },
		{ name: 'Diamond Color', rank: 5 },
		{ name: 'Diamond Clarity', rank: 6 },
		{ name: 'Ring Size', rank: 7 }
	]

	const pg = [
		// A product that appears earlier in pg with 14K stamp and ring size 7 (what old code used to pick)
		{
			id: 'wrong-first-in-pg',
			slug: 'p-wrong',
			'Diamond Type': 'Natural',
			'Metal Type': 'Yellow Gold',
			'Metal Stamp': '14K',
			'Total Carat Weight': '2.35 ct',
			'Diamond Color': 'E-F',
			'Diamond Clarity': 'SI1',
			'Ring Size': '7'
		},
		// A product that keeps Metal Stamp: 10K, Ring Size: 4, Metal Type: Yellow Gold, Carat: 2.35, Color: E-F
		// Only Diamond Clarity is forced to change because VVS1-VVS2 is not available for Natural
		{
			id: 'correct-closest-variant',
			slug: 'p-correct',
			'Diamond Type': 'Natural',
			'Metal Type': 'Yellow Gold',
			'Metal Stamp': '10K',
			'Total Carat Weight': '2.35 ct',
			'Diamond Color': 'E-F',
			'Diamond Clarity': 'SI1',
			'Ring Size': '4'
		}
	]

	const currentSelections = {
		'Diamond Type': 'Lab Grown',
		'Metal Type': 'Yellow Gold',
		'Metal Stamp': '10K',
		'Total Carat Weight': '2.35 ct',
		'Diamond Color': 'E-F',
		'Diamond Clarity': 'VVS1-VVS2',
		'Ring Size': '4'
	}

	const result = findClosestAggregationProduct({
		pg,
		optionName: 'Diamond Type',
		value: 'Natural',
		currentSelections,
		ag,
		attributes
	})

	assert.strictEqual(result?.id, 'correct-closest-variant', 'Must keep Metal Stamp as 10K and Ring Size as 4!')
	assert.strictEqual(result?.['Metal Stamp'], '10K')
	assert.strictEqual(result?.['Ring Size'], '4')
	assert.strictEqual(result?.['Diamond Clarity'], 'SI1')
}

// Test Scenario 3: Distance calculation for ordered values (e.g. Ring Size)
// If Ring Size 4 is unavailable, Ring Size 4.5 should be chosen over Ring Size 13.
{
	const ag = {
		'Metal Stamp': ['10K', '14K'],
		'Ring Size': ['4', '4.5', '5', '6', '7', '8', '9', '10', '11', '12', '13']
	}

	const pg = [
		{ id: 'size-13', 'Metal Stamp': '14K', 'Ring Size': '13' },
		{ id: 'size-4.5', 'Metal Stamp': '14K', 'Ring Size': '4.5' }
	]

	const result = findClosestAggregationProduct({
		pg,
		optionName: 'Metal Stamp',
		value: '14K',
		currentSelections: {
			'Metal Stamp': '10K',
			'Ring Size': '4'
		},
		ag
	})

	assert.strictEqual(result?.id, 'size-4.5', 'Should choose closest ring size (4.5) rather than farther (13)')
}

// Test Scenario 4: Degenerate and edge cases (nulls, missing data, empty arrays)
{
	// Empty array
	assert.strictEqual(
		findClosestAggregationProduct({
			pg: [],
			optionName: 'Color',
			value: 'Red',
			currentSelections: {}
		}),
		null
	)

	// No matching value in pg
	assert.strictEqual(
		findClosestAggregationProduct({
			pg: [{ id: '1', Color: 'Blue' }],
			optionName: 'Color',
			value: 'Red',
			currentSelections: {}
		}),
		null
	)

	// pg with null/undefined entries
	assert.strictEqual(
		findClosestAggregationProduct({
			pg: [null as any, undefined as any, { id: 'valid', Color: 'Red' }],
			optionName: 'Color',
			value: 'Red',
			currentSelections: null as any
		})?.id,
		'valid'
	)

	// ag is null, attributes is null, currentSelections is null
	assert.strictEqual(
		findClosestAggregationProduct({
			pg: [{ id: '1', Size: 'M' }],
			optionName: 'Size',
			value: 'M',
			currentSelections: null as any,
			ag: null as any,
			attributes: null as any
		})?.id,
		'1'
	)

	// optionName is null/undefined
	assert.strictEqual(
		findClosestAggregationProduct({
			pg: [{ id: '1', Size: 'M' }],
			optionName: null as any,
			value: 'M',
			currentSelections: {}
		}),
		null
	)
}

console.log('variants.helper.spec: all assertions passed successfully!')

