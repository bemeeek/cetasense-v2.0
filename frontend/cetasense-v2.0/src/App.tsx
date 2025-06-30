import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import DataSettingPage from "./pages/DataSettingPage";
// import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomSettingPage";
import MethodSettingPage from "./pages/MethodsSettingPage";
import HeatMapPage from "./pages/HeatMapPage";
import LocalizationPage from "./pages/LocalizationPage";
// import UploadPage from "./pages/MethodsSettingPage";

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
        </BrowserRouter>
    );
}
export default App;