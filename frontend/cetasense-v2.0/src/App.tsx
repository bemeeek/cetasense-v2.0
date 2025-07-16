// src/App.tsx
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "./services/api";
import { sendFrontendMetric } from "./services/metrics";

// Lazy‐load semua halaman
const LandingPage        = lazy(() => import("./pages/LandingPage"));
const DataSettingPage    = lazy(() => import("./pages/DataSettingPage"));
const RoomPage           = lazy(() => import("./pages/RoomSettingPage"));
const MethodSettingPage  = lazy(() => import("./pages/MethodsSettingPage"));
const PlotDataPage       = lazy(() => import("./pages/PlotDataPage"));
const LocalizationPage   = lazy(() => import("./pages/LocalizationPage"));
const ComparisonPage     = lazy(() => import("./pages/ComparisonPage"));

// Setup React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) =>
        api.get<any>(queryKey[0] as string).then((r) => r.data),
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Kirim metrik performance navigation timing
  useEffect(() => {
    const obs = new PerformanceObserver((list) => {
      for (const nav of list.getEntries() as PerformanceNavigationTiming[]) {
        sendFrontendMetric({
          reqID:   "",
          type:    "page",
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
      performance.clearResourceTimings();
    });

    obs.observe({ type: "navigation", buffered: true });
    return () => obs.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div>Loading…</div>}>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<LandingPage />} />

            {/* Settings pages */}
            <Route path="/settings">
              {/* default /settings → langkah 1 */}
              <Route index element={<Navigate to="ruangan" replace />} />
              <Route path="ruangan"   element={<RoomPage />} />
              <Route path="data"      element={<DataSettingPage />} />
              <Route path="algoritma" element={<MethodSettingPage />} />
            </Route>

            {/* Data‐Stream pages */}
            <Route path="/data-stream">
              <Route path="lokalisasi"  element={<LocalizationPage />} />
              <Route path="plot-data"    element={<PlotDataPage />} />
              <Route path="perbandingan" element={<ComparisonPage />} />
              <Route index element={<Navigate to="lokalisasi" replace />} />
            </Route>

            {/* Fallback untuk route yang tidak dikenal */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
