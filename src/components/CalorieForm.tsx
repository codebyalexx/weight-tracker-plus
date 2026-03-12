"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Flame } from "lucide-react";
import { GoalType } from "@/lib/db";

interface CalorieFormProps {
    onSubmit: (
        date: string,
        calories_consumed: number,
        calories_burned: number,
        goal: GoalType
    ) => Promise<void>;
}

// Goal thresholds configuration
// deficit (sèche): green if deficit >= 100, yellow if 0 < deficit < 100, red if surplus
// maintenance (maintien): green if |balance| <= 100, yellow if 100 < |balance| <= 200, red beyond 
// bulk (prise de masse): green if surplus 0-300, yellow if surplus 300-500 or slight deficit, red if deficit or huge surplus
function getGoalStatus(deficit: number, goal: GoalType): "positive" | "warning" | "negative" {
    switch (goal) {
        case "deficit":
            if (deficit >= 100) return "positive";
            if (deficit > 0) return "warning";
            return "negative";
        case "maintenance":
            if (Math.abs(deficit) <= 100) return "positive";
            if (Math.abs(deficit) <= 200) return "warning";
            return "negative";
        case "bulk": {
            const surplus = -deficit; // surplus is positive when eating more
            if (surplus >= 0 && surplus <= 300) return "positive";
            if (surplus > 300 && surplus <= 500) return "warning";
            if (deficit > 0 && deficit <= 100) return "warning"; // slight deficit is yellow for bulk
            return "negative";
        }
    }
}

const GOAL_LABELS: Record<GoalType, string> = {
    deficit: "🔥 Sèche",
    maintenance: "⚖️ Maintien",
    bulk: "💪 Prise de masse",
};

const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
    deficit: "Min. 100 kcal de déficit",
    maintenance: "Tolérance ±100 kcal",
    bulk: "Surplus de 0–300 kcal",
};

export default function CalorieForm({ onSubmit }: CalorieFormProps) {
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [consumed, setConsumed] = useState("");
    const [burned, setBurned] = useState("");
    const [goal, setGoal] = useState<GoalType>("deficit");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const deficit = consumed && burned ? parseFloat(burned) - parseFloat(consumed) : 0;
    const hasValues = consumed !== "" && burned !== "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consumed || !burned || !date) return;

        setIsSubmitting(true);
        try {
            await onSubmit(date, parseFloat(consumed), parseFloat(burned), goal);
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

    const goalStatus = hasValues ? getGoalStatus(deficit, goal) : null;

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
                    <label className="form-label">Objectif du jour</label>
                    <div className="goal-selector">
                        {(["deficit", "maintenance", "bulk"] as GoalType[]).map((g) => (
                            <button
                                key={g}
                                type="button"
                                className={`goal-btn ${goal === g ? `goal-btn-active goal-btn-${g}` : ""}`}
                                onClick={() => setGoal(g)}
                                title={GOAL_DESCRIPTIONS[g]}
                            >
                                {GOAL_LABELS[g]}
                            </button>
                        ))}
                    </div>
                    <span className="goal-hint">{GOAL_DESCRIPTIONS[goal]}</span>
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

                {hasValues && goalStatus && (
                    <div className={`deficit-badge deficit-${goalStatus === "positive" ? "positive" : goalStatus === "warning" ? "warning" : "negative"}`}>
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
