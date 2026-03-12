"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Scale, X } from "lucide-react";

interface WeightFormProps {
    onSubmit: (date: string, weight: number) => Promise<void>;
}

export default function WeightForm({ onSubmit }: WeightFormProps) {
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [weight, setWeight] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!weight || !date) return;

        setIsSubmitting(true);
        try {
            await onSubmit(date, parseFloat(weight));
            setWeight("");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save weight:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon card-icon-weight">
                    <Scale size={20} />
                </div>
                <div>
                    <h2 className="card-title">Ajouter une pesée</h2>
                    <p className="card-subtitle">Enregistrez votre poids sur la balance</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group">
                    <label htmlFor="weight-date" className="form-label">Date</label>
                    <input
                        id="weight-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="weight-value" className="form-label">Poids (kg)</label>
                    <input
                        id="weight-value"
                        type="number"
                        step="0.1"
                        min="0"
                        max="500"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="ex. 85.3"
                        className="form-input"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !weight}
                    className="btn btn-weight"
                >
                    {isSubmitting ? (
                        <span className="btn-loading">
                            <span className="spinner" />
                            Enregistrement...
                        </span>
                    ) : showSuccess ? (
                        <span className="btn-success-text">✓ Enregistré !</span>
                    ) : (
                        "Enregistrer le poids"
                    )}
                </button>
            </form>
        </div>
    );
}
