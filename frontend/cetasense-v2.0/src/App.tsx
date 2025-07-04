import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import DataSettingPage from "./pages/DataSettingPage";
// import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomSettingPage";
import MethodSettingPage from "./pages/MethodsSettingPage";
import PlotDataPage from "./pages/PlotDataPage";
import LocalizationPage from "./pages/LocalizationPage";
import ComparisonPage from "./pages/ComparisonPage";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/settings/data" replace />} />
                <Route path="settings">
                    <Route path="algoritma" element={<MethodSettingPage />} />
                    <Route path="ruangan" element={<RoomPage />} />
                    <Route path="data" element={<DataSettingPage />} />
                </Route>
            </Routes>
            <Routes>
                <Route path="/" element={<Navigate to="/data-stream/lokalisasi" replace />} />
                <Route path="data-stream">
                    <Route path="lokalisasi" element={<LocalizationPage />} />
                    <Route path="plot-data" element={<PlotDataPage />} />
                    <Route path="perbandingan" element={<ComparisonPage />} />
                    <Route index element={<Navigate to="lokalisasi" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
export default App;