"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, AlertTriangle, Database, ArrowLeft } from "lucide-react";

interface ImportSummary {
    weightEntries: number;
    calorieEntries: number;
    goals: number;
    skippedWeight: number;
    skippedCalorie: number;
}

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<ImportSummary | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError(null);
        setSummary(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/import", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Import échoué");
                return;
            }
            setSummary(data as ImportSummary);
        } catch (err) {
            console.error(err);
            setError("Erreur réseau pendant l'import");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full pb-8">
            <Link href="/" className="flex items-center gap-2 text-text-muted font-bold text-sm">
                <ArrowLeft size={18} /> Retour
            </Link>

            <div className="flex flex-col items-center gap-2 text-center">
                <div className="bg-main-blue/10 p-4 rounded-2xl text-main-blue">
                    <Database size={32} strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl font-extrabold text-text-dark">Importer mes données SQLite</h1>
                <p className="text-text-muted font-bold text-sm">
                    Uploade le fichier <code className="bg-gray-100 px-2 py-0.5 rounded">weight-tracker.db</code> de l'ancienne version pour rapatrier toutes tes données dans ton compte.
                </p>
            </div>

            <form onSubmit={onSubmit} className="tasty-card p-6 flex flex-col gap-4">
                <label className="font-bold text-text-dark text-sm flex items-center gap-2">
                    <Upload size={16} /> Fichier .db
                </label>
                <input
                    type="file"
                    accept=".db,.sqlite,.sqlite3,application/octet-stream"
                    onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        setSummary(null);
                        setError(null);
                    }}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 font-bold text-sm focus:outline-none focus:border-main-blue bg-gray-50 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-main-blue file:text-white file:font-bold"
                    required
                />

                {file && (
                    <div className="text-xs font-bold text-text-muted">
                        {file.name} — {(file.size / 1024).toFixed(1)} Ko
                    </div>
                )}

                {error && (
                    <div className="bg-main-red/10 border-2 border-main-red text-main-red rounded-xl p-3 font-bold text-sm flex items-center gap-2">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {summary && (
                    <div className="bg-main-green/10 border-2 border-main-green text-main-green-shadow rounded-xl p-4 font-bold text-sm flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-main-green">
                            <CheckCircle2 size={20} /> Import réussi !
                        </div>
                        <ul className="text-text-dark list-disc list-inside">
                            <li>{summary.weightEntries} pesées importées ({summary.skippedWeight} déjà présentes)</li>
                            <li>{summary.calorieEntries} journées caloriques importées ({summary.skippedCalorie} déjà présentes)</li>
                            <li>{summary.goals} objectifs importés</li>
                        </ul>
                        <Link href="/" className="tasty-button tasty-button-green w-full py-3 mt-3 text-sm">
                            Retour à l'accueil
                        </Link>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || loading}
                    className="tasty-button tasty-button-blue w-full py-4 text-lg mt-2 disabled:opacity-60"
                >
                    <Upload size={18} className="mr-2" strokeWidth={3} />
                    {loading ? "Import en cours…" : "Lancer l'import"}
                </button>
            </form>

            <div className="tasty-card p-4 text-xs font-bold text-text-muted">
                <p className="mb-1 text-text-dark">À savoir :</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Les lignes déjà présentes pour une date sont conservées (aucun écrasement).</li>
                    <li>Tous les objectifs actifs sont remplacés par le plus récent importé.</li>
                    <li>Le fichier est traité côté serveur puis supprimé immédiatement.</li>
                </ul>
            </div>
        </div>
    );
}
