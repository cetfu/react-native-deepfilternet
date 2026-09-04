# Building Native Libraries (Transparent & Reproducible Builds)

This repository wraps the official [DeepFilterNet](https://github.com/rikorose/deepfilternet) C-API (`libdeepfilter`).

To ensure **100% security, auditing, and transparency**, native binaries are compiled directly from the official upstream DeepFilterNet source repository.

## Local Build Instructions

### Prerequisites
1. **Rust Toolchain:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. **Android & iOS Targets:**
   ```bash
   rustup target add aarch64-linux-android x86_64-linux-android aarch64-apple-ios aarch64-apple-ios-sim
   cargo install cargo-ndk
   ```

### Compile Native Binaries
Run the transparent build script:
```bash
./scripts/build-native-libs.sh
```

This script:
1. Clones the official `rikorose/deepfilternet` tagged release (`v0.5.6`).
2. Builds `libDF` with `--features capi`.
3. Places the compiled static/shared binaries into the project's native build directories.

## GitHub Actions CI/CD Verification
All published release artifacts are built transparently using GitHub Actions workflow (`.github/workflows/build-native.yml`). You can inspect the build logs and SHA256 checksums directly on the GitHub Releases page.
