#ifndef DEEP_FILTER_H
#define DEEP_FILTER_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct DFState DFState;

/**
 * Create a DeepFilterNet Model state.
 *
 * @param path File path to a DeepFilterNet tar.gz / ONNX model file.
 * @param atten_lim Attenuation limit in dB (e.g. 100.0f).
 * @param log_level Optional log level string ("info", "debug", or NULL).
 * @return Opaque pointer to DFState, or NULL on error.
 */
DFState* df_create(const char* path, float atten_lim, const char* log_level);

/**
 * Get DeepFilterNet frame size in samples (hop size).
 */
size_t df_get_frame_length(DFState* st);

/**
 * Set DeepFilterNet attenuation limit in dB.
 */
void df_set_atten_lim(DFState* st, float lim_db);

/**
 * Set DeepFilterNet post filter beta (0 disables post filter).
 */
void df_set_post_filter_beta(DFState* st, float beta);

/**
 * Process a single audio frame.
 *
 * @param st Created via df_create()
 * @param input Float32 PCM input buffer of length df_get_frame_length()
 * @param output Float32 PCM output buffer of length df_get_frame_length()
 * @return Local SNR of the processed frame.
 */
float df_process_frame(DFState* st, float* input, float* output);

/**
 * Get log message if any.
 */
char* df_next_log_msg(DFState* st);

/**
 * Free a log message returned by df_next_log_msg.
 */
void df_free_log_msg(char* ptr);

/**
 * Free a DeepFilterNet Model state.
 */
void df_free(DFState* model);

#ifdef __cplusplus
}
#endif

#endif // DEEP_FILTER_H
