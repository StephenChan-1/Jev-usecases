export function cardSpans(ids: string[]): number[] {
  const spans: number[] = []
  let index = 0

  while (index < ids.length) {
    const left = ids.length - index
    const seed = hash(ids[index] ?? String(index))

    if (left === 1) {
      spans.push(12)
      index += 1
      continue
    }

    if (left === 2) {
      spans.push(6, 6)
      index += 2
      continue
    }

    if (left === 3) {
      const rows = [
        [4, 4, 4],
        [6, 3, 3],
        [3, 6, 3],
        [3, 3, 6],
      ]
      spans.push(...(rows[seed % rows.length] ?? [4, 4, 4]))
      index += 3
      continue
    }

    const rows = [
      [3, 3, 3, 3],
      [4, 4, 4],
      [6, 3, 3],
      [3, 6, 3],
      [3, 3, 6],
      [6, 6],
    ]
    const row = rows[seed % rows.length] ?? [4, 4, 4]
    const take = Math.min(row.length, left)
    if (take < row.length) {
      if (take === 1) spans.push(12)
      else if (take === 2) spans.push(6, 6)
      else spans.push(4, 4, 4)
      index += take
      continue
    }
    spans.push(...row)
    index += row.length
  }

  return spans
}

function hash(value: string): number {
  let total = 0
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 33 + value.charCodeAt(i)) >>> 0
  }
  return total
}
