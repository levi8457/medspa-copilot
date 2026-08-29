/** Converts Web Audio float samples to mono 16 kHz signed PCM for realtime ASR. */
export function downsampleToPcm16(input: Float32Array, inputSampleRate: number, outputSampleRate = 16000): ArrayBuffer {
  if (inputSampleRate < outputSampleRate) {
    throw new Error("浏览器音频采样率低于实时识别要求")
  }
  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Int16Array(outputLength)

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio)
    const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio))
    let sum = 0
    for (let inputIndex = start; inputIndex < Math.max(start + 1, end); inputIndex += 1) sum += input[inputIndex]
    const sample = sum / Math.max(1, end - start)
    output[outputIndex] = Math.max(-1, Math.min(1, sample)) * 0x7fff
  }

  return output.buffer
}
