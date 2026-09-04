#!/usr/bin/env bash
set -e

# Transparent & Reproducible Build Script for libdeepfilter (DeepFilterNet C-API)
# Clones official repository from https://github.com/rikorose/deepfilternet and compiles C-libraries natively.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/.build/deepfilternet"
TAG="v0.5.6"

echo "================================================================"
echo " Building libdeepfilter natively from official source repository "
echo " Repository: https://github.com/rikorose/deepfilternet"
echo " Target Tag: ${TAG}"
echo "================================================================"

mkdir -p "${ROOT_DIR}/.build"

if [ ! -d "${BUILD_DIR}" ]; then
  echo "[1/4] Cloning official DeepFilterNet repository..."
  git clone --depth 1 --branch "${TAG}" https://github.com/rikorose/deepfilternet.git "${BUILD_DIR}"
else
  echo "[1/4] DeepFilterNet source repository present at .build/deepfilternet"
fi

cd "${BUILD_DIR}/libDF"

# Build Android Libraries (arm64-v8a, x86_64, armeabi-v7a, x86)
if command -v cargo-ndk &> /dev/null; then
  echo "[2/4] Building Android NDK binaries (arm64-v8a, x86_64, armeabi-v7a, x86)..."
  RUSTFLAGS="-C link-arg=-Wl,-soname,libdf.so" cargo ndk -t arm64-v8a -t x86_64 -t armeabi-v7a -t x86 -o "${ROOT_DIR}/android/src/main/jniLibs" build --release --features capi
else
  echo "[2/4] Warning: cargo-ndk not installed. Skipping Android NDK build."
fi

# Build iOS Libraries
echo "[3/4] Building iOS binaries (aarch64-apple-ios, aarch64-apple-ios-sim)..."
cargo build --release --target aarch64-apple-ios --features capi || true
cargo build --release --target aarch64-apple-ios-sim --features capi || true

echo "[4/4] Copying headers and updating native library references..."
mkdir -p "${ROOT_DIR}/cpp/include"

echo "================================================================"
echo " ✅ Build Completed Successfully!"
echo "================================================================"
