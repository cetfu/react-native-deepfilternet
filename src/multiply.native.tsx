import { NitroModules } from 'react-native-nitro-modules';
import type { ReactNativeDeepFilterNet } from './ReactNativeDeepFilterNet.nitro';

const ReactNativeDeepFilterNetHybridObject =
  NitroModules.createHybridObject<ReactNativeDeepFilterNet>('ReactNativeDeepFilterNet');

export function multiply(a: number, b: number): number {
  return ReactNativeDeepFilterNetHybridObject.multiply(a, b);
}
