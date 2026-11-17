import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paginationPages } from '../../src/ui/pagination.ts'

test('pagination keeps endpoints and the active image visible in bounded, ordered ranges', () => {
  assert.deepEqual(paginationPages(0, 0), [])
  assert.deepEqual(paginationPages(12, 1), [1, 2, 3, 'after', 10, 11, 12])
  assert.deepEqual(paginationPages(12, 6), [1, 'before', 5, 6, 7, 'after', 12])
  for (const total of [1, 2, 7, 8, 12, 100, 1_000_000]) {
    for (const position of new Set([1, 2, 3, 4, Math.ceil(total / 2), total - 3, total - 2, total - 1, total].filter(value => value >= 1 && value <= total))) {
      const pages = paginationPages(total, position)
      const numbers = pages.filter((value): value is number => typeof value === 'number')
      assert.ok(pages.length <= 7)
      assert.ok(numbers.includes(position))
      assert.equal(numbers[0], 1)
      assert.equal(numbers.at(-1), total)
      assert.deepEqual(numbers, [...new Set(numbers)].sort((a, b) => a - b))
      assert.ok(numbers.every(value => value >= 1 && value <= total))
    }
  }
})
