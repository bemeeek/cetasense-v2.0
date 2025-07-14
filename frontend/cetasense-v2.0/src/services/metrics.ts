// src/services/metrics.ts

/**
 * Payload shape untuk metrik frontend yang akan dikirim ke backend
 */
export interface FrontendMetricPayload {
  reqID:   string;            // X-Request-Id dari server
  type:    'page' | 'fetch';  // 'page' untuk page-load, 'fetch' untuk API call
  route:   string;            // path saja, misalnya "/api/ruangan"
  ttfb_ms: number;            // time to first byte (ms)
  ttlb_ms: number;            // time to last byte  (ms)
}

/**
 * Kirim metrik ke backend menggunakan sendBeacon
 */
export function sendFrontendMetric(payload: FrontendMetricPayload): void {
  navigator.sendBeacon(
    `${window.location.origin}/api/log_frontend`,
    new Blob([JSON.stringify(payload)], { type: 'application/json' })
  );
}