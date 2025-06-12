import React from "react";
import { uploadMethod, type Methods } from "../services/api";

interface MethodFormProps {
    onUploaded: (method: Methods) => void;
    onError: (error: string) => void;
}

const MethodForm: React.FC<MethodFormProps> = ({ onUploaded, onError }) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [error, setError] = React.useState<string>("");
    const [loading, setLoading] = React.useState<boolean>(false);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        const f = event.target.files?.[0] ?? null;
        if (f) {
            if (f.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File terlalu besar, maksimal 5MB.");
                setFile(null);
            } else {
                setFile(f);
            }
        } else {
            setFile(null);
        }
        if (f) {
            const ext = f.name.split('.').pop()?.toLowerCase();
            if (ext !== 'py' && ext !== 'pkl') {
                setError("Format file tidak didukung, hanya .py dan .pkl yang diperbolehkan.");
                setFile(null);
            }
            if (f) {
                const ext = f.name.split('.').pop()?.toLowerCase();
                if (ext !== 'py' && ext !== 'pkl') {
                    setError("Format file tidak didukung, hanya .py dan .pkl yang diperbolehkan.");
                    setFile(null);
                }
            }
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!file) {
            setError("Silakan pilih file terlebih dahulu.");
            return;
        }
        setLoading(true);
        try {
            const response = await uploadMethod(file, "Metode Baru", file.name.endsWith('.py') ? 'script' : 'model');
            onUploaded(response);
            setFile(null);
        } catch (err) {
            setError("Gagal mengunggah metode. Pastikan format file benar dan tidak ada kesalahan pada server.");
            onError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Unggah Metode</h2>
            {error && <div className="text-red-500">{error}</div>}
            <input
                type="file"
                accept=".py,.pkl"
                onChange={handleChange}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && <p className="text-sm text-gray-500">File : {file.name} </p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
                type="submit"
                disabled={loading || !file}
                className={`w-full py-2 px-4 bg-blue-600 text-white rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {loading ? "Mengunggah..." : "Unggah Metode"}
            </button>
        </form>
    );
};


export default MethodForm;
