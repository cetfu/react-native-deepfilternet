project(deepfilternet)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME deepfilternet)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Set up local includes
include_directories("src/main/cpp" "../cpp" "../cpp/include")

# Import prebuilt libdf.so library compiled from official DeepFilterNet source
add_library(libdf SHARED IMPORTED)
set_target_properties(libdf PROPERTIES
  IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}/libdf.so"
  IMPORTED_SONAME "libdf.so"
)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../cpp/ReactNativeDeepFilterNet.cpp
)

# Add Nitrogen specs :)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/deepfilternet+autolinking.cmake)

find_library(LOG_LIB log)

# Link all libraries together
target_link_libraries(
        ${PACKAGE_NAME}
        libdf
        ${LOG_LIB}
        android # <-- Android core
)
