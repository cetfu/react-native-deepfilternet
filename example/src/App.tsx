import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import { AudioContext } from 'react-native-audio-api';
import {
  ReactNativeDeepFilterNet,
  loadDefaultModel,
} from 'react-native-deep-filter-net';

function parseWavOrPcmToFloat32(arrayBuffer: ArrayBuffer): {
  samples: Float32Array;
  sampleRate: number;
} {
  const dataView = new DataView(arrayBuffer);

  if (
    arrayBuffer.byteLength > 44 &&
    dataView.getUint8(0) === 0x52 && // 'R'
    dataView.getUint8(1) === 0x49 && // 'I'
    dataView.getUint8(2) === 0x46 && // 'F'
    dataView.getUint8(3) === 0x46 // 'F'
  ) {
    const channels = dataView.getUint16(22, true) || 1;
    const sampleRate = dataView.getUint32(24, true) || 48000;
    const bitsPerSample = dataView.getUint16(34, true) || 16;

    let dataOffset = 36;
    while (dataOffset < arrayBuffer.byteLength - 8) {
      const chunkId =
        String.fromCharCode(dataView.getUint8(dataOffset)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 1)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 2)) +
        String.fromCharCode(dataView.getUint8(dataOffset + 3));
      const chunkSize = dataView.getUint32(dataOffset + 4, true);
      if (chunkId === 'data') {
        dataOffset += 8;
        break;
      }
      dataOffset += 8 + chunkSize;
    }

    if (dataOffset >= arrayBuffer.byteLength) {
      dataOffset = 44;
    }

    const pcmByteLength = arrayBuffer.byteLength - dataOffset;

    if (bitsPerSample === 16) {
      const numSamples = Math.floor(pcmByteLength / 2 / channels);
      const floatSamples = new Float32Array(numSamples);
      const int16Array = new Int16Array(
        arrayBuffer,
        dataOffset,
        numSamples * channels
      );
      for (let i = 0; i < numSamples; i++) {
        if (channels === 2) {
          const s1 = int16Array[i * 2] ?? 0;
          const s2 = int16Array[i * 2 + 1] ?? 0;
          floatSamples[i] = (s1 + s2) / 65536.0;
        } else {
          floatSamples[i] = (int16Array[i] ?? 0) / 32768.0;
        }
      }
      return { samples: floatSamples, sampleRate };
    } else if (bitsPerSample === 32) {
      const numSamples = Math.floor(pcmByteLength / 4 / channels);
      const floatSamples = new Float32Array(numSamples);
      const float32Array = new Float32Array(
        arrayBuffer,
        dataOffset,
        numSamples * channels
      );
      for (let i = 0; i < numSamples; i++) {
        if (channels === 2) {
          const s1 = float32Array[i * 2] ?? 0;
          const s2 = float32Array[i * 2 + 1] ?? 0;
          floatSamples[i] = (s1 + s2) / 2.0;
        } else {
          floatSamples[i] = float32Array[i] ?? 0;
        }
      }
      return { samples: floatSamples, sampleRate };
    }
  }

  const numSamples = Math.floor(arrayBuffer.byteLength / 2);
  const int16Array = new Int16Array(arrayBuffer);
  const floatSamples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    floatSamples[i] = (int16Array[i] ?? 0) / 32768.0;
  }
  return { samples: floatSamples, sampleRate: 48000 };
}

export default function App() {
  const [audioPath, setAudioPath] = useState('/data/local/tmp/noisy_snr0.wav');
  const [isInitialized, setIsInitialized] = useState(false);
  const [hopSize, setHopSize] = useState<number | null>(null);
  const [attenLim, setAttenLim] = useState<number>(100);
  const [lastSnr, setLastSnr] = useState<number | null>(null);
  const [processTimeMs, setProcessTimeMs] = useState<number | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [cleanedAudioBuffer, setCleanedAudioBuffer] =
    useState<Float32Array | null>(null);
  const [noisyAudioBuffer, setNoisyAudioBuffer] = useState<Float32Array | null>(
    null
  );

  const addLog = (msg: string) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  const isCancel = (err: unknown) =>
    isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED;

  const handlePlayAudioBuffer = async (
    pcmData: Float32Array,
    label: string = 'Audio'
  ) => {
    try {
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const buffer = audioCtx.createBuffer(1, pcmData.length, 48000);
      buffer.copyToChannel(pcmData as any, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();

      const durationSec = (pcmData.length / 48000).toFixed(1);
      addLog(
        `🔊 Playing ${label} (${durationSec}s, ${pcmData.length} samples) via Audio API...`
      );
    } catch (e: any) {
      addLog(`Playback error: ${e.message}`);
    }
  };

  const handlePlayCleanedAudio = () => {
    if (!cleanedAudioBuffer) {
      Alert.alert('Notice', 'Please process an audio stream first.');
      return;
    }
    handlePlayAudioBuffer(cleanedAudioBuffer, 'Cleaned Audio');
  };

  const handlePlayNoisyAudio = () => {
    if (!noisyAudioBuffer) {
      Alert.alert('Notice', 'Please process an audio stream first.');
      return;
    }
    handlePlayAudioBuffer(noisyAudioBuffer, 'Raw Noisy Audio');
  };

  const handleFetchLatestModel = async () => {
    try {
      addLog('Fetching latest model from GitHub Release CDN...');
      const ok = await loadDefaultModel(attenLim);
      if (ok) {
        setIsInitialized(true);
        const frameLen = ReactNativeDeepFilterNet.getFrameLength();
        setHopSize(frameLen);
        addLog(
          `Latest GitHub model loaded successfully! Hop size: ${frameLen} samples`
        );
        Alert.alert(
          'Success',
          'Latest DeepFilterNet model downloaded and initialized!'
        );
      } else {
        setIsInitialized(false);
        setHopSize(null);
        addLog('Failed to initialize downloaded model.');
      }
    } catch (e: any) {
      addLog(`Model download error: ${e.message}`);
      Alert.alert('Download Error', e.message);
    }
  };

  const handlePickAudioFile = async () => {
    try {
      const results = await pick({
        type: [types.audio, types.allFiles],
      });
      const res = results[0];
      if (res?.uri) {
        const cleanPath = decodeURIComponent(res.uri.replace('file://', ''));
        setAudioPath(cleanPath);
        addLog(`🎵 Audio file selected: ${res.name || cleanPath}`);
      }
    } catch (err) {
      if (!isCancel(err)) {
        addLog(`Picker error: ${err}`);
      }
    }
  };

  const handleAttenLimChange = (val: number) => {
    setAttenLim(val);
    if (isInitialized) {
      ReactNativeDeepFilterNet.setAttenLim(val);
      addLog(`Attenuation Limit set to ${val} dB`);
    }
  };

  const handleFilterSelectedAudioFile = async () => {
    if (!isInitialized || !hopSize) {
      Alert.alert('Notice', 'Please initialize the DeepFilterNet model first.');
      return;
    }

    try {
      addLog(`Reading audio file: ${audioPath}...`);
      const uri = audioPath.startsWith('/') ? `file://${audioPath}` : audioPath;
      const res = await fetch(uri);
      const arrayBuffer = await res.arrayBuffer();

      const { samples: noisySamples, sampleRate } =
        parseWavOrPcmToFloat32(arrayBuffer);
      const durationSec = (noisySamples.length / sampleRate).toFixed(2);
      addLog(
        `Loaded ${noisySamples.length} samples (${durationSec}s at ${sampleRate}Hz) from audio file.`
      );

      setNoisyAudioBuffer(noisySamples);

      const numFrames = Math.floor(noisySamples.length / hopSize);
      const cleanSamples = new Float32Array(numFrames * hopSize);

      const inputFrame = new Float32Array(hopSize);
      const outputFrame = new Float32Array(hopSize);

      const start = performance.now();
      let totalSnr = 0;

      for (let f = 0; f < numFrames; f++) {
        const offset = f * hopSize;
        inputFrame.set(noisySamples.subarray(offset, offset + hopSize));

        const snr = ReactNativeDeepFilterNet.processFrame(
          inputFrame.buffer,
          outputFrame.buffer
        );
        totalSnr += snr;

        cleanSamples.set(outputFrame, offset);
      }

      const duration = performance.now() - start;
      const avgSnr = totalSnr / numFrames;

      setLastSnr(avgSnr);
      setProcessTimeMs(duration);
      setCleanedAudioBuffer(cleanSamples);

      addLog(
        `⚡ Filtered entire audio file (${durationSec}s, ${numFrames} frames) in ${duration.toFixed(
          1
        )}ms! Avg SNR: ${avgSnr.toFixed(2)} dB`
      );

      await handlePlayAudioBuffer(cleanSamples, 'Cleaned Audio File');
    } catch (e: any) {
      addLog(`File filtering error: ${e.message}`);
      Alert.alert('Error filtering file', e.message);
    }
  };

  const handleRelease = () => {
    try {
      ReactNativeDeepFilterNet.release();
      setIsInitialized(false);
      setHopSize(null);
      setLastSnr(null);
      setProcessTimeMs(null);
      addLog('DeepFilterNet model released.');
    } catch (e: any) {
      addLog(`Release error: ${e.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>🎙️ DeepFilterNet</Text>
            <View
              style={[
                styles.statusBadge,
                isInitialized ? styles.bgSuccess : styles.bgDanger,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {isInitialized ? 'Ready' : 'Not Loaded'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            React Native Nitro C++ Real-Time Audio Noise Suppression
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Model Configuration</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleFetchLatestModel}
            >
              <Text style={styles.buttonText}>🌐 Load Model</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleRelease}
            >
              <Text style={styles.buttonText}>Release</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            2. Audio File Selection & Noise Suppression
          </Text>
          <Text style={styles.label}>Selected Audio Path (.wav / .pcm):</Text>
          <TextInput
            style={styles.input}
            value={audioPath}
            onChangeText={setAudioPath}
            placeholder="/path/to/noisy_audio.wav"
            placeholderTextColor="#64748B"
          />

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePickAudioFile}
          >
            <Text style={styles.buttonText}>
              🎵 Pick Audio File (Ses Dosyası Seç)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.successButton,
              styles.mt10,
              !isInitialized && styles.disabledButton,
            ]}
            onPress={handleFilterSelectedAudioFile}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>
              ⚡ Filter & Play Selected Audio File (Dosyayı Temizle ve Çal)
            </Text>
          </TouchableOpacity>

          {(cleanedAudioBuffer || noisyAudioBuffer) && (
            <View style={[styles.buttonRow, styles.mt10]}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  !cleanedAudioBuffer && styles.disabledButton,
                ]}
                onPress={handlePlayCleanedAudio}
                disabled={!cleanedAudioBuffer}
              >
                <Text style={styles.buttonText}>▶️ Play Cleaned</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  !noisyAudioBuffer && styles.disabledButton,
                ]}
                onPress={handlePlayNoisyAudio}
                disabled={!noisyAudioBuffer}
              >
                <Text style={styles.buttonText}>🔊 Play Original</Text>
              </TouchableOpacity>
            </View>
          )}

          {processTimeMs !== null && (
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Execution Time</Text>
                <Text style={styles.metricValue}>
                  {processTimeMs.toFixed(2)} ms
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Average SNR</Text>
                <Text style={styles.metricValue}>
                  {lastSnr !== null ? `${lastSnr.toFixed(2)} dB` : '-'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.cardTitle}>3. Max Attenuation Limit</Text>
            <Text style={styles.highlightText}>{attenLim} dB</Text>
          </View>
          <Text style={styles.description}>
            Controls maximum noise attenuation level (0 dB = No reduction, 100
            dB = Max reduction).
          </Text>

          <View style={styles.presetRow}>
            {[0, 20, 40, 60, 80, 100].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.presetChip,
                  attenLim === val && styles.presetChipActive,
                ]}
                onPress={() => handleAttenLimChange(val)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    attenLim === val && styles.presetChipTextActive,
                  ]}
                >
                  {val} dB
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Logs</Text>
          <View style={styles.logBox}>
            {logMessages.length === 0 ? (
              <Text style={styles.logPlaceholder}>No activity logged yet.</Text>
            ) : (
              logMessages.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bgSuccess: {
    backgroundColor: '#10B981',
  },
  bgDanger: {
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 12,
  },
  mb10: {
    marginBottom: 10,
  },
  mt10: {
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#6366F1',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#EF4444',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
  },
  logBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    maxHeight: 180,
  },
  logPlaceholder: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
