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

export type { ReactNativeDeepFilterNetSpec };
