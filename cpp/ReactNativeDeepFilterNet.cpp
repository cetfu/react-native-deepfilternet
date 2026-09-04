#include "ReactNativeDeepFilterNet.hpp"
#include <fstream>
#include <filesystem>
#include <cstdlib>
#include <cstring>

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

  try {
    std::filesystem::path p(path);
    if (p.has_parent_path()) {
      std::filesystem::create_directories(p.parent_path());
    }
  } catch (...) {
    // Ignore if directory already exists
  }

  std::ofstream outFile(path, std::ios::binary);
  if (!outFile.is_open()) return false;
  outFile.write(reinterpret_cast<const char*>(buffer->data()), buffer->size());
  outFile.close();
  return true;
}

std::string ReactNativeDeepFilterNet::getModelCacheDirectory() {
#if defined(__APPLE__)
  const char* tmp = getenv("TMPDIR");
  if (tmp && strlen(tmp) > 0) return std::string(tmp);
  return "/tmp";
#elif defined(__ANDROID__)
  const char* tmp = getenv("TMPDIR");
  if (tmp && strlen(tmp) > 0) return std::string(tmp);

  std::ifstream cmdline("/proc/self/cmdline");
  if (cmdline.is_open()) {
    std::string packageName;
    std::getline(cmdline, packageName, '\0');
    cmdline.close();
    if (!packageName.empty()) {
      return "/data/user/0/" + packageName + "/cache";
    }
  }
  return "/data/local/tmp";
#else
  return "/tmp";
#endif
}

void ReactNativeDeepFilterNet::release() {
  if (_state) {
    df_free(_state);
    _state = nullptr;
  }
}

} // namespace margelo::nitro::deepfilternet
