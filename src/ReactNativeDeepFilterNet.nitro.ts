import type { HybridObject } from 'react-native-nitro-modules';

export interface ReactNativeDeepFilterNet extends HybridObject<{
  ios: 'c++';
  android: 'c++';
}> {
  /**
   * Initialize DeepFilterNet model with path to model file and attenuation limit.
   */
  initModel(modelPath: string, attenLim: number): boolean;

  /**
   * Get hop size / frame length in samples.
   */
  getFrameLength(): number;

  /**
   * Process a single audio frame (Float32 PCM ArrayBuffer).
   */
  processFrame(inputFrame: ArrayBuffer, outputFrame: ArrayBuffer): number;

  /**
   * Update attenuation limit in dB dynamically.
   */
  setAttenLim(limDb: number): void;

  /**
   * Release model and free native memory.
   */
  release(): void;
}
