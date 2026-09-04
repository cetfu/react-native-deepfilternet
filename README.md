# react-native-deepfilternet

High-Performance Real-Time Audio Noise Suppression for React Native powered by [DeepFilterNet](https://github.com/rikorose/deepfilternet) and [Nitro Modules](https://nitro.margelo.com/).

## Features
- **Zero-Copy JSI Performance**: High-speed C++ PCM frame processing via `ArrayBuffer`.
- **DeepFilterNet v3**: Full noise reduction powered by official Rust `libdeepfilter` C-API.
- **Cross-Platform**: Seamless C++ binding for both Android (NDK) and iOS.
- **Transparent & Auditable**: Reproducible builds compiled directly from official upstream DeepFilterNet source repository.

## Installation

```sh
npm install react-native-deepfilternet react-native-nitro-modules
```

## Usage

### 1. Initialize the Model

```typescript
import {
  ReactNativeDeepFilterNet,
  loadDefaultModel,
  loadModelFromUrl,
} from 'react-native-deepfilternet';

// Download & initialize the latest official DeepFilterNet3 model (Recommended)
const isLoaded = await loadDefaultModel(100); // 100 dB max attenuation limit

// Or load from a custom remote URL:
// await loadModelFromUrl('https://example.com/custom_model.tar.gz');

// Or initialize directly from a local file path:
// ReactNativeDeepFilterNet.initModel('/path/to/DeepFilterNet3_onnx.tar.gz', 100);
```

### 2. Filtering a Complete Audio File / PCM Buffer

To noise-suppress an entire audio track (e.g. 48kHz mono Float32 PCM audio buffer), process it chunk-by-chunk using `frameLength` (hop size):

```typescript
// Get the required frame size in samples (e.g. 480 samples at 48kHz = 10ms frame)
const frameLength = ReactNativeDeepFilterNet.getFrameLength();

// Your raw noisy 48kHz mono Float32 PCM audio data
const noisyPcmData: Float32Array = getAudioSamples(); 

const numFrames = Math.floor(noisyPcmData.length / frameLength);
const cleanedPcmData = new Float32Array(numFrames * frameLength);

// Reusable zero-copy frame buffers
const inputFrame = new Float32Array(frameLength);
const outputFrame = new Float32Array(frameLength);

for (let i = 0; i < numFrames; i++) {
  const offset = i * frameLength;
  
  // Fill input frame
  inputFrame.set(noisyPcmData.subarray(offset, offset + frameLength));

  // Process frame (Zero-Copy ArrayBuffer)
  const localSnr = ReactNativeDeepFilterNet.processFrame(
    inputFrame.buffer,
    outputFrame.buffer
  );

  // Copy cleaned audio frame to output buffer
  cleanedPcmData.set(outputFrame, offset);
}

// cleanedPcmData now contains the noise-suppressed 48kHz audio!
```

### 3. Real-Time Streaming (Microphone / WebRTC)

For real-time audio streams, call `processFrame` directly inside your audio callback:

```typescript
// Called per audio frame (e.g., inside Audio Context / WebRTC / Recording callback)
function onAudioFrame(pcmInputBuffer: ArrayBuffer, pcmOutputBuffer: ArrayBuffer) {
  const snr = ReactNativeDeepFilterNet.processFrame(pcmInputBuffer, pcmOutputBuffer);
}

// Adjust max noise attenuation level dynamically on the fly (0 dB to 100 dB)
ReactNativeDeepFilterNet.setAttenLim(80);

// Release resources when finished
ReactNativeDeepFilterNet.release();
```

## Building Native Libraries

See [BUILDING.md](BUILDING.md) for transparent local build instructions.

## License

MIT / Apache-2.0
