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

`react-native-deepfilternet` exports built-in audio helpers so you can easily load WAV files and noise-suppress an entire audio track with a single function call:

```typescript
import {
  loadDefaultModel,
  wavBufferToFloat32,
  filterAudioBuffer,
} from 'react-native-deepfilternet';

// 1. Initialize model
await loadDefaultModel(100);

// 2. Read your audio file as ArrayBuffer
const response = await fetch('file:///path/to/noisy_audio.wav');
const wavArrayBuffer = await response.arrayBuffer();

// 3. Convert WAV ArrayBuffer into 48kHz Float32 PCM samples (built-in helper)
const { samples: noisyPcmData, sampleRate } = wavBufferToFloat32(wavArrayBuffer);

// 4. Filter the entire audio track in one call (built-in helper)
const { cleanedSamples, averageSnr } = filterAudioBuffer(noisyPcmData);

// cleanedSamples now holds the noise-suppressed 48kHz Float32 PCM audio!
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
