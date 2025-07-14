import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from "./services/api";
import { sendFrontendMetric } from "./services/metrics";


// Ubah import statis ➔ lazy
const DataSettingPage     = lazy(() => import("./pages/DataSettingPage"));
const RoomPage            = lazy(() => import("./pages/RoomSettingPage"));
const MethodSettingPage   = lazy(() => import("./pages/MethodsSettingPage"));
const PlotDataPage        = lazy(() => import("./pages/PlotDataPage"));
const LocalizationPage    = lazy(() => import("./pages/LocalizationPage"));
const ComparisonPage      = lazy(() => import("./pages/ComparisonPage"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) =>
        api.get<any>(queryKey[0] as string).then(r => r.data),
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {

  useEffect(() => {
    const obs = new PerformanceObserver((list) => {
      for (const nav of list.getEntries() as PerformanceNavigationTiming[]) {
        // kirim metrik page-load
        sendFrontendMetric({
          reqID:   '',                   // tidak ada reqID untuk page
          type:    'page',
          route:   window.location.pathname,
          ttfb_ms: nav.responseStart,
          ttlb_ms: nav.loadEventEnd,
        });
        console.log(
          `[PAGE] route=${window.location.pathname}` +
          ` TTFB=${nav.responseStart.toFixed(2)}ms` +
          ` TTLB=${nav.loadEventEnd.toFixed(2)}ms`
        );
      }
      // setelah baca, clear buffer otomatis
      performance.clearResourceTimings();
    });

    obs.observe({ type: 'navigation', buffered: true });
    return () => obs.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {/* Suspense fallback yang muncul selama chunk loading */}
      <Suspense fallback={<div>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/settings/data" replace />} />
          <Route path="settings">
            <Route path="algoritma" element={<MethodSettingPage />} />
            <Route path="ruangan"   element={<RoomPage />} />
            <Route path="data"      element={<DataSettingPage />} />
            <Route index element={<Navigate to="data" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/data-stream/lokalisasi" replace />} />
          <Route path="data-stream">
            <Route path="lokalisasi" element={<LocalizationPage />} />
            <Route path="plot-data"   element={<PlotDataPage />} />
            <Route path="perbandingan" element={<ComparisonPage />} />
            <Route index element={<Navigate to="lokalisasi" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
