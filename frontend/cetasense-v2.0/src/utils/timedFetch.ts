// src/utils/timedFetch.ts

/**
 * Wrapper around fetch() that logs TTFB (Time To First Byte)
 * and TTLB (Time To Last Byte) for each request.
 */
export async function timedFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  // Tentukan URL (bisa string atau Request objek)
  const url = typeof input === 'string' ? input : input.url

  // Tandai waktu mulai (untuk TTLB)
  const startTime = performance.now()

  // Kirim request
  const response = await fetch(input, init)

  // Cari entri PerformanceResourceTiming untuk URL ini
  const entries = performance.getEntriesByName(url) as PerformanceResourceTiming[]
  const entry = entries[entries.length - 1]

  // Hitung TTFB (ms) jika ada entry
  const ttfb = entry
    ? entry.responseStart - entry.startTime
    : NaN

  // Hitung TTLB (ms)
  const ttlb = performance.now() - startTime

  // Baca X-Request-Id dari header (jika backend mengirim)
  const reqID = response.headers.get('X-Request-Id') ?? ''

  // Cetak hasilnya ke console
  console.log(
    `${new Date().toISOString()} ` +
    `FETCH ${response.url} ` +
    `(reqID=${reqID}) ` +
    `TTFB=${ttfb.toFixed(2)}ms ` +
    `TTLB=${ttlb.toFixed(2)}ms`
  )

  return response
}
