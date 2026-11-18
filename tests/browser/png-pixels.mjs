import { inflateSync } from 'node:zlib'
import assert from 'node:assert/strict'

// Decode full screenshots so the screenshot clip does not change backdrop sampling.
export function pngPixels(buffer) {
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20)
  assert.equal(buffer[24], 8)
  assert.ok([2, 6].includes(buffer[25]))
  assert.equal(buffer[28], 0)
  const stride = buffer[25] === 6 ? 4 : 3, chunks = []
  for (let offset = 8; offset < buffer.length;) {
    const size = buffer.readUInt32BE(offset)
    if (buffer.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + size))
    offset += size + 12
  }
  const raw = inflateSync(Buffer.concat(chunks)), pixels = Buffer.alloc(width * height * stride)
  const rowSize = width * stride
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (rowSize + 1)]
    assert.ok(filter <= 4)
    for (let x = 0; x < rowSize; x++) {
      const index = y * rowSize + x
      const left = x >= stride ? pixels[index - stride] : 0
      const up = y ? pixels[index - rowSize] : 0
      const corner = y && x >= stride ? pixels[index - rowSize - stride] : 0
      const estimate = left + up - corner
      const a = Math.abs(estimate - left), b = Math.abs(estimate - up), c = Math.abs(estimate - corner)
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up
        : filter === 3 ? Math.floor((left + up) / 2) : a <= b && a <= c ? left : b <= c ? up : corner
      pixels[index] = (raw[y * (rowSize + 1) + 1 + x] + predictor) & 255
    }
  }
  return { pixel(x, y) { const index = (y * width + x) * stride; return [...pixels.subarray(index, index + 3)] } }
}
