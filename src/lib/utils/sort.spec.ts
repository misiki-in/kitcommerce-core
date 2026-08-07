// Self-check for the option-value comparator. No framework: run it with `bun run test`.
// package.json's `files` already excludes dist/**/*.spec.*, so this never ships.
import assert from 'node:assert'
import { sortByNumericValue, splitOnCommaBeforeHttp } from './sort.ts'

// The bug this replaces: a lexical sort puts "10" before "2".
assert.deepStrictEqual(sortByNumericValue(['10', '2', '7.5']), ['2', '7.5', '10'])

// Units and prefixes still sort on the number.
assert.deepStrictEqual(sortByNumericValue(['16 in', '18 in', '9 in']), ['9 in', '16 in', '18 in'])
assert.deepStrictEqual(sortByNumericValue(['1.5 ct', '0.25 ct', '10 ct']), ['0.25 ct', '1.5 ct', '10 ct'])

// The regression guard: non-numeric values keep alphabetical order instead of collapsing to 0
// and falling back to whatever order the API returned.
assert.deepStrictEqual(sortByNumericValue(['Yellow Gold', 'Rose Gold', 'White Gold']), [
	'Rose Gold',
	'White Gold',
	'Yellow Gold'
])

// Equal numbers fall back to text, so ties are stable and meaningful.
assert.deepStrictEqual(sortByNumericValue(['18K White', '18K Rose']), ['18K Rose', '18K White'])

// Mixed and degenerate input must not throw.
assert.strictEqual(sortByNumericValue(['Small', '10', '2']).length, 3)
assert.deepStrictEqual(sortByNumericValue([]), [])
assert.deepStrictEqual(sortByNumericValue(undefined as unknown as string[]), [])

// The input array is not mutated.
const original = ['10', '2']
sortByNumericValue(original)
assert.deepStrictEqual(original, ['10', '2'])

// A comma inside an S3 key must not split one URL into two.
assert.deepStrictEqual(splitOnCommaBeforeHttp('https://x.io/a,b.jpg'), ['https://x.io/a,b.jpg'])
assert.deepStrictEqual(splitOnCommaBeforeHttp('https://x.io/a.jpg,https://x.io/b.jpg'), [
	'https://x.io/a.jpg',
	'https://x.io/b.jpg'
])
assert.deepStrictEqual(splitOnCommaBeforeHttp(''), [])
assert.deepStrictEqual(splitOnCommaBeforeHttp(null), [])

console.log('sort.spec: all assertions passed')
