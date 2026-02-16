"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Flame } from "lucide-react";

interface CalorieFormProps {
    onSubmit: (
        date: string,
        calories_consumed: number,
        calories_burned: number
    ) => Promise<void>;
}

export default function CalorieForm({ onSubmit }: CalorieFormProps) {
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [consumed, setConsumed] = useState("");
    const [burned, setBurned] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const deficit = consumed && burned ? parseFloat(burned) - parseFloat(consumed) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consumed || !burned || !date) return;

        setIsSubmitting(true);
        try {
            await onSubmit(date, parseFloat(consumed), parseFloat(burned));
            setConsumed("");
            setBurned("");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save calories:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon card-icon-calorie">
                    <Flame size={20} />
                </div>
                <div>
                    <h2 className="card-title">Log Calories</h2>
                    <p className="card-subtitle">Track daily intake & expenditure</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group">
                    <label htmlFor="calorie-date" className="form-label">Date</label>
                    <input
                        id="calorie-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="calories-consumed" className="form-label">
                        Calories Eaten (kcal)
                    </label>
                    <input
                        id="calories-consumed"
                        type="number"
                        step="1"
                        min="0"
                        max="20000"
                        value={consumed}
                        onChange={(e) => setConsumed(e.target.value)}
                        placeholder="e.g. 1800"
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="calories-burned" className="form-label">
                        Calories Burned (kcal)
                    </label>
                    <input
                        id="calories-burned"
                        type="number"
                        step="1"
                        min="0"
                        max="20000"
                        value={burned}
                        onChange={(e) => setBurned(e.target.value)}
                        placeholder="e.g. 2200"
                        className="form-input"
                        required
                    />
                </div>

                {consumed && burned && (
                    <div className={`deficit-badge ${deficit > 0 ? "deficit-positive" : deficit < 0 ? "deficit-negative" : "deficit-neutral"}`}>
                        <span className="deficit-label">Daily Balance:</span>
                        <span className="deficit-value">
                            {deficit > 0 ? "−" : "+"}{Math.abs(deficit).toLocaleString()} kcal
                            {deficit > 0 ? " deficit" : deficit < 0 ? " surplus" : ""}
                        </span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || !consumed || !burned}
                    className="btn btn-calorie"
                >
                    {isSubmitting ? (
                        <span className="btn-loading">
                            <span className="spinner" />
                            Saving...
                        </span>
                    ) : showSuccess ? (
                        <span className="btn-success-text">✓ Saved!</span>
                    ) : (
                        "Save Calories"
                    )}
                </button>
            </form>
        </div>
    );
}
