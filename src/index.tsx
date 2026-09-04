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

export type { ReactNativeDeepFilterNetSpec };
