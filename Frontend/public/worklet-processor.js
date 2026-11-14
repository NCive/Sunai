/**
 * Sunai AudioWorkletProcessor
 * Collects 128-sample audio render blocks and emits 512-sample chunks (32 ms at 16 kHz).
 * Preallocates buffers to guarantee zero memory allocation in process().
 */
class SunaiWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkSize = 512;
    // Ping-pong preallocated buffers to avoid allocation in process()
    this.buffers = [
      new Float32Array(this.chunkSize),
      new Float32Array(this.chunkSize),
    ];
    this.activeBufferIdx = 0;
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const channelData = input[0];
    if (!channelData) {
      return true;
    }

    const currentBuf = this.buffers[this.activeBufferIdx];
    const len = channelData.length;

    for (let i = 0; i < len; i++) {
      currentBuf[this.bufferIndex++] = channelData[i];
      if (this.bufferIndex === this.chunkSize) {
        this.port.postMessage(currentBuf);
        this.activeBufferIdx = 1 - this.activeBufferIdx;
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('sunai-worklet-processor', SunaiWorkletProcessor);
