#include "ReactNativeDeepFilterNet.hpp"
#include <fstream>

namespace margelo::nitro::deepfilternet {

ReactNativeDeepFilterNet::~ReactNativeDeepFilterNet() {
  release();
}

bool ReactNativeDeepFilterNet::initModel(const std::string& modelPath, double attenLim) {
  release();

  std::ifstream checkFile(modelPath);
  if (!checkFile.good()) {
    return false;
  }
  checkFile.close();

  _state = df_create(modelPath.c_str(), static_cast<float>(attenLim), nullptr);
  return _state != nullptr;
}

double ReactNativeDeepFilterNet::getFrameLength() {
  if (!_state) return 0;
  return static_cast<double>(df_get_frame_length(_state));
}

double ReactNativeDeepFilterNet::processFrame(const std::shared_ptr<ArrayBuffer>& inputFrame,
                                               const std::shared_ptr<ArrayBuffer>& outputFrame) {
  if (!_state || !inputFrame || !outputFrame) return -1.0;

  float* inputPtr = reinterpret_cast<float*>(inputFrame->data());
  float* outputPtr = reinterpret_cast<float*>(outputFrame->data());

  return static_cast<double>(df_process_frame(_state, inputPtr, outputPtr));
}

void ReactNativeDeepFilterNet::setAttenLim(double limDb) {
  if (_state) {
    df_set_atten_lim(_state, static_cast<float>(limDb));
  }
}

bool ReactNativeDeepFilterNet::writeBufferToFile(const std::string& path,
                                                 const std::shared_ptr<ArrayBuffer>& buffer) {
  if (!buffer || buffer->size() == 0) return false;
  std::ofstream outFile(path, std::ios::binary);
  if (!outFile.is_open()) return false;
  outFile.write(reinterpret_cast<const char*>(buffer->data()), buffer->size());
  outFile.close();
  return true;
}

void ReactNativeDeepFilterNet::release() {
  if (_state) {
    df_free(_state);
    _state = nullptr;
  }
}

} // namespace margelo::nitro::deepfilternet
