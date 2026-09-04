# react-native-deep-filter-net

High-Performance Real-Time Audio Noise Suppression for React Native powered by [DeepFilterNet](https://github.com/rikorose/deepfilternet) and [Nitro Modules](https://nitro.margelo.com/).

## Features
- **Zero-Copy JSI Performance**: High-speed C++ PCM frame processing via `ArrayBuffer`.
- **DeepFilterNet v3**: Full noise reduction powered by official Rust `libdeepfilter` C-API.
- **Cross-Platform**: Seamless C++ binding for both Android (NDK) and iOS.
- **Transparent & Auditable**: Reproducible builds compiled directly from official upstream DeepFilterNet source repository.

## Installation

```sh
npm install react-native-deep-filter-net react-native-nitro-modules
```

## Usage

```typescript
import { ReactNativeDeepFilterNet } from 'react-native-deep-filter-net';

// 1. Initialize DeepFilterNet model (.tar.gz / ONNX model path & max attenuation limit)
const isLoaded = ReactNativeDeepFilterNet.initModel('/path/to/DeepFilterNet3_onnx.tar.gz', 100);

// 2. Get frame size in samples (hop size)
const frameLength = ReactNativeDeepFilterNet.getFrameLength(); // e.g. 480 samples

// 3. Process Float32 PCM audio frames in real-time (Zero-Copy ArrayBuffer)
const inputFrame = new Float32Array(frameLength); // PCM input
const outputFrame = new Float32Array(frameLength); // Cleaned PCM output

const localSnr = ReactNativeDeepFilterNet.processFrame(
  inputFrame.buffer,
  outputFrame.buffer
);

// 4. Update attenuation limit dynamically (0 dB to 100 dB)
ReactNativeDeepFilterNet.setAttenLim(80);

// 5. Release model when done
ReactNativeDeepFilterNet.release();
```

## Building Native Libraries

See [BUILDING.md](BUILDING.md) for transparent local build instructions.

## License

MIT / Apache-2.0
