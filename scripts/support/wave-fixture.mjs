export function resamplePcm16MonoWave(input, targetSampleRate) {
  const bytes = Buffer.from(input)
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected a WAV fixture')
  let offset = 12
  let sourceSampleRate
  let channels
  let bitsPerSample
  let dataStart
  let dataBytes
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    if (id === 'fmt ') {
      channels = bytes.readUInt16LE(start + 2)
      sourceSampleRate = bytes.readUInt32LE(start + 4)
      bitsPerSample = bytes.readUInt16LE(start + 14)
    } else if (id === 'data') {
      dataStart = start
      dataBytes = size
    }
    offset = start + size + (size % 2)
  }
  if (channels !== 1 || bitsPerSample !== 16 || !sourceSampleRate || dataStart === undefined) throw new Error('Expected mono PCM 16-bit fixture audio')

  const sourceLength = Math.floor(Math.min(dataBytes, bytes.length - dataStart) / 2)
  const targetLength = Math.floor(sourceLength * targetSampleRate / sourceSampleRate)
  const output = Buffer.alloc(44 + targetLength * 2)
  output.write('RIFF', 0, 'ascii')
  output.writeUInt32LE(36 + targetLength * 2, 4)
  output.write('WAVEfmt ', 8, 'ascii')
  output.writeUInt32LE(16, 16)
  output.writeUInt16LE(1, 20)
  output.writeUInt16LE(1, 22)
  output.writeUInt32LE(targetSampleRate, 24)
  output.writeUInt32LE(targetSampleRate * 2, 28)
  output.writeUInt16LE(2, 32)
  output.writeUInt16LE(16, 34)
  output.write('data', 36, 'ascii')
  output.writeUInt32LE(targetLength * 2, 40)
  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = index * sourceSampleRate / targetSampleRate
    const lower = Math.min(sourceLength - 1, Math.floor(sourcePosition))
    const upper = Math.min(sourceLength - 1, lower + 1)
    const fraction = sourcePosition - lower
    const lowerSample = bytes.readInt16LE(dataStart + lower * 2)
    const upperSample = bytes.readInt16LE(dataStart + upper * 2)
    output.writeInt16LE(Math.round(lowerSample + (upperSample - lowerSample) * fraction), 44 + index * 2)
  }
  return output
}
