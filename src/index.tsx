import { NitroModules } from 'react-native-nitro-modules';
import type { ReactNativeDeepFilterNet as ReactNativeDeepFilterNetSpec } from './ReactNativeDeepFilterNet.nitro';

let hybridInstance: ReactNativeDeepFilterNetSpec | null = null;

function getHybridInstance(): ReactNativeDeepFilterNetSpec {
  if (!hybridInstance) {
    hybridInstance =
      NitroModules.createHybridObject<ReactNativeDeepFilterNetSpec>(
        'ReactNativeDeepFilterNet'
      );
  }
  return hybridInstance;
}

export const ReactNativeDeepFilterNet: ReactNativeDeepFilterNetSpec = new Proxy(
  {} as ReactNativeDeepFilterNetSpec,
  {
    get(_target, prop, receiver) {
      const instance = getHybridInstance();
      const val = Reflect.get(instance, prop, receiver);
      return typeof val === 'function' ? val.bind(instance) : val;
    },
  }
);

export const LATEST_MODEL_URL =
  'https://github.com/cetfu/react-native-deepfilternet/releases/latest/download/DeepFilterNet3_onnx.tar.gz';

/**
 * Downloads and caches a DeepFilterNet model from a remote URL, then initializes the engine.
 * @param url Remote URL of the model (.tar.gz / ONNX)
 * @param localSavePath Local file path to save and cache the model (defaults to /data/local/tmp/latest_model.tar.gz)
 * @param attenLim Max noise attenuation limit in dB (defaults to 100 dB)
 */
export async function loadModelFromUrl(
  url: string = LATEST_MODEL_URL,
  localSavePath: string = '/data/local/tmp/latest_model.tar.gz',
  attenLim: number = 100
): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download model from ${url} (HTTP ${res.status})`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  const saved = ReactNativeDeepFilterNet.writeBufferToFile(
    localSavePath,
    arrayBuffer
  );
  if (!saved) {
    throw new Error(`Failed to save model binary to ${localSavePath}`);
  }
  return ReactNativeDeepFilterNet.initModel(localSavePath, attenLim);
}

/**
 * Automatically fetches the latest official DeepFilterNet3 model from GitHub Releases,
 * caches it locally, and initializes the native engine.
 */
export async function loadDefaultModel(
  attenLim: number = 100
): Promise<boolean> {
  return loadModelFromUrl(
    LATEST_MODEL_URL,
    '/data/local/tmp/latest_model.tar.gz',
    attenLim
  );
}

/**
 * Utility: Converts a WAV file ArrayBuffer or raw 16-bit PCM buffer into 48kHz Float32Array [-1.0, 1.0].
 * Automatically parses WAV headers (RIFF chunk) if present.
 */
export function wavBufferToFloat32(arrayBuffer: ArrayBuffer): {
  samples: Float32Array;
  sampleRate: number;
} {
  const dataView = new DataView(arrayBuffer);

  if (
    arrayBuffer.byteLength > 44 &&
    dataView.getUint8(0) === 0x52 && // 'R'
    dataView.getUint8(1) === 0x49 && // 'I'
    dataView.getUint8(2) === 0x46 && // 'F'
    dataView.getUint8(3) === 0x46 // 'F'
  ) {
    const channels = dataView.getUint16(22, true) || 1;
    const sampleRate = dataView.getUint32(24, true) || 48000;
    const bitsPerSample = dataView.getUint16(34, true) || 16;

    let dataOffset = 36;
    while (dataOffset < arrayBuffer.byteLength - 8) {
      const chunkId =
        String.fromCharCode(dataView.getUint8(dataOffset)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 1)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 2)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 3));
      const chunkSize = dataView.getUint32(dataOffset + 4, true);
      if (chunkId === 'data') {
        dataOffset += 8;
        break;
      }
      dataOffset += 8 + chunkSize;
    }

    if (dataOffset >= arrayBuffer.byteLength) {
      dataOffset = 44;
    }

    const pcmByteLength = arrayBuffer.byteLength - dataOffset;

    if (bitsPerSample === 16) {
      const numSamples = Math.floor(pcmByteLength / 2 / channels);
      const floatSamples = new Float32Array(numSamples);
      const int16Array = new Int16Array(
        arrayBuffer,
        dataOffset,
        numSamples * channels
      );
      for (let i = 0; i < numSamples; i++) {
        if (channels === 2) {
          const s1 = int16Array[i * 2] ?? 0;
          const s2 = int16Array[i * 2 + 1] ?? 0;
          floatSamples[i] = (s1 + s2) / 65536.0;
        } else {
          floatSamples[i] = (int16Array[i] ?? 0) / 32768.0;
        }
      }
      return { samples: floatSamples, sampleRate };
    } else if (bitsPerSample === 32) {
      const numSamples = Math.floor(pcmByteLength / 4 / channels);
      const floatSamples = new Float32Array(numSamples);
      const float32Array = new Float32Array(
        arrayBuffer,
        dataOffset,
        numSamples * channels
      );
      for (let i = 0; i < numSamples; i++) {
        if (channels === 2) {
          const s1 = float32Array[i * 2] ?? 0;
          const s2 = float32Array[i * 2 + 1] ?? 0;
          floatSamples[i] = (s1 + s2) / 2.0;
        } else {
          floatSamples[i] = float32Array[i] ?? 0;
        }
      }
      return { samples: floatSamples, sampleRate };
    }
  }

  // Raw Int16 PCM without WAV header
  const numSamples = Math.floor(arrayBuffer.byteLength / 2);
  const int16Array = new Int16Array(arrayBuffer);
  const floatSamples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    floatSamples[i] = (int16Array[i] ?? 0) / 32768.0;
  }
  return { samples: floatSamples, sampleRate: 48000 };
}

/**
 * Utility: Converts Float32Array PCM [-1.0, 1.0] back to 16-bit Int16Array PCM.
 */
export function float32ToPcm16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1.0, Math.min(1.0, float32Array[i] ?? 0));
    int16Array[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16Array;
}

/**
 * High-Level Helper: Noise-suppresses an entire 48kHz Float32 PCM audio track in one call.
 * Automatically chunks the audio into required frame hop sizes and processes zero-copy frames.
 */
export function filterAudioBuffer(noisySamples: Float32Array): {
  cleanedSamples: Float32Array;
  averageSnr: number;
} {
  const hopSize = ReactNativeDeepFilterNet.getFrameLength();
  if (!hopSize || hopSize <= 0) {
    throw new Error(
      'DeepFilterNet engine is not initialized. Call loadDefaultModel() or initModel() first.'
    );
  }

  const numFrames = Math.floor(noisySamples.length / hopSize);
  const cleanedSamples = new Float32Array(numFrames * hopSize);

  const inputFrame = new Float32Array(hopSize);
  const outputFrame = new Float32Array(hopSize);

  let totalSnr = 0;
  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    inputFrame.set(noisySamples.subarray(offset, offset + hopSize));

    const snr = ReactNativeDeepFilterNet.processFrame(
      inputFrame.buffer,
      outputFrame.buffer
    );
    totalSnr += snr;

    cleanedSamples.set(outputFrame, offset);
  }

  return {
    cleanedSamples,
    averageSnr: numFrames > 0 ? totalSnr / numFrames : 0,
  };
}

export type { ReactNativeDeepFilterNetSpec };
