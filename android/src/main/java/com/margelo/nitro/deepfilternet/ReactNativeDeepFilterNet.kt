package com.margelo.nitro.deepfilternet
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class ReactNativeDeepFilterNet : HybridReactNativeDeepFilterNetSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
