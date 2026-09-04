#pragma once

#include "HybridReactNativeDeepFilterNetSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>

#include "include/deepfilter.h"

namespace margelo::nitro::deepfilternet {

class ReactNativeDeepFilterNet : public HybridReactNativeDeepFilterNetSpec {
public:
  ReactNativeDeepFilterNet() : HybridObject(TAG), _state(nullptr) {}
  ~ReactNativeDeepFilterNet() override;

  bool initModel(const std::string& modelPath, double attenLim) override;
  double getFrameLength() override;
  double processFrame(const std::shared_ptr<ArrayBuffer>& inputFrame,
                      const std::shared_ptr<ArrayBuffer>& outputFrame) override;
  void setAttenLim(double limDb) override;
  bool writeBufferToFile(const std::string& path,
                         const std::shared_ptr<ArrayBuffer>& buffer) override;
  void release() override;

private:
  DFState* _state{nullptr};
};

} // namespace margelo::nitro::deepfilternet
