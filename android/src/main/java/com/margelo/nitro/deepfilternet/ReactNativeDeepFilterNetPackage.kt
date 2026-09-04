package com.margelo.nitro.deepfilternet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

class ReactNativeDeepFilterNetPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { HashMap() }
    }

    companion object {
        init {
            try {
                System.loadLibrary("df")
            } catch (e: Throwable) {
                e.printStackTrace()
            }
            deepfilternetOnLoad.initializeNative()
        }
    }
}
