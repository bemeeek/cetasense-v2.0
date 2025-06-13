import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DataSettingPage from "./pages/DataSettingPage";
// import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomSettingPage";
import MethodSettingPage from "./pages/MethodsSettingPage";
import HeatMapPage from "./pages/HeatMapPage";
// import UploadPage from "./pages/MethodsSettingPage";

function App() {
    return (
        <Router>
            <Routes>
                {/* <Route path="/" element={<HomePage />} /> */}
                <Route path="/data-setting" element={<DataSettingPage />} />
                <Route path="/room" element={<RoomPage />} />
                <Route path="/upload-method" element={<MethodSettingPage />} />
                <Route path="/plot-heatmap" element={<HeatMapPage />} />
            </Routes>
        </Router>
    );
}
export default App;