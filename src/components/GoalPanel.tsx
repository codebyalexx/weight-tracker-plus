"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Target,
    Trophy,
    Calendar,
    TrendingDown,
    TrendingUp,
    Zap,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    Clock,
    X,
} from "lucide-react";
import { GoalRow, WeightEntry, CalorieEntry } from "@/lib/db";
import {
    GoalConfig,
    GoalMode,
    GoalProjection,
    Phase,
    generatePhases,
    simulateWeightCurve,
    recalculatePlan,
    getCurrentPhase,
    formatIntensity,
} from "@/lib/goalEngine";

interface GoalPanelProps {
    weightData: WeightEntry[];
    calorieData: CalorieEntry[];
    goal: GoalRow | null;
    onGoalCreated: () => void;
    onGoalDeleted: () => void;
}

export default function GoalPanel({
    weightData,
    calorieData,
    goal,
    onGoalCreated,
    onGoalDeleted,
}: GoalPanelProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);

    const today = format(new Date(), "yyyy-MM-dd");

    // Compute projection from active goal
    const projection = useMemo((): GoalProjection | null => {
        if (!goal) return null;

        const goalConfig: GoalConfig = {
            id: goal.id,
            targetWeight: goal.target_weight,
            mode: goal.mode,
            initialIntensity: goal.initial_intensity,
            startDate: goal.start_date,
            startWeight: goal.start_weight,
            active: !!goal.active,
        };

        return recalculatePlan(
            goalConfig,
            calorieData.map((c) => ({
                date: c.date,
                calories_consumed: c.calories_consumed,
                calories_burned: c.calories_burned,
            })),
            weightData.map((w) => ({ date: w.date, weight: w.weight })),
            today
        );
    }, [goal, calorieData, weightData, today]);

    const currentPhase = useMemo(() => {
        if (!projection) return null;
        return getCurrentPhase(projection.phases, today);
    }, [projection, today]);

    // Delete goal handler
    const handleDeleteGoal = async () => {
        if (!goal) return;
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) return;

        const res = await fetch(`/api/goal?id=${goal.id}`, { method: "DELETE" });
        if (res.ok) onGoalDeleted();
    };

    if (!goal) {
        return (
            <>
                <div className="goal-empty-card" onClick={() => setShowCreateForm(true)}>
                    <div className="goal-empty-icon">
                        <Target size={32} />
                    </div>
                    <h3>Définir un objectif</h3>
                    <p>Créez un plan adaptatif pour atteindre votre poids cible</p>
                    <button className="btn btn-goal">
                        <Target size={16} />
                        Créer un objectif
                    </button>
                </div>

                {showCreateForm && (
                    <GoalCreateModal
                        weightData={weightData}
                        onClose={() => setShowCreateForm(false)}
                        onCreated={() => {
                            setShowCreateForm(false);
                            onGoalCreated();
                        }}
                    />
                )}
            </>
        );
    }

    // Active goal dashboard
    const daysElapsed = differenceInDays(new Date(), parseISO(goal.start_date));
    const daysRemaining = projection
        ? differenceInDays(parseISO(projection.estimatedGoalDate), new Date())
        : 0;
    const progressPercent = projection
        ? Math.min(
            100,
            Math.max(
                0,
                ((Math.abs(goal.start_weight - goal.target_weight) - projection.weightRemaining) /
                    Math.abs(goal.start_weight - goal.target_weight)) *
                100
            )
        )
        : 0;

    return (
        <section className="goal-dashboard">
            {/* Goal Header */}
            <div className="goal-header-card">
                <div className="goal-header-top">
                    <div className="goal-header-left">
                        <div className={`goal-mode-badge goal-mode-${goal.mode}`}>
                            {goal.mode === "cut" ? (
                                <><TrendingDown size={14} /> Sèche</>
                            ) : (
                                <><TrendingUp size={14} /> Prise de masse</>
                            )}
                        </div>
                        <h2 className="goal-header-title">
                            Objectif : {goal.target_weight.toFixed(1)} kg
                        </h2>
                    </div>
                    <button className="goal-delete-btn" onClick={handleDeleteGoal} title="Supprimer l'objectif">
                        <X size={16} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="goal-progress">
                    <div className="goal-progress-bar">
                        <div
                            className="goal-progress-fill"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="goal-progress-labels">
                        <span>{goal.start_weight.toFixed(1)} kg</span>
                        <span className="goal-progress-pct">{progressPercent.toFixed(0)}%</span>
                        <span>{goal.target_weight.toFixed(1)} kg</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="goal-quick-stats">
                    <div className="goal-stat">
                        <Clock size={14} />
                        <span className="goal-stat-value">{Math.max(0, daysElapsed)}</span>
                        <span className="goal-stat-label">jours écoulés</span>
                    </div>
                    <div className="goal-stat-divider" />
                    <div className="goal-stat">
                        <Calendar size={14} />
                        <span className="goal-stat-value">{Math.max(0, daysRemaining)}</span>
                        <span className="goal-stat-label">jours restants</span>
                    </div>
                    <div className="goal-stat-divider" />
                    <div className="goal-stat">
                        <Target size={14} />
                        <span className="goal-stat-value">
                            {projection ? projection.weightRemaining.toFixed(1) : "—"} kg
                        </span>
                        <span className="goal-stat-label">restant</span>
                    </div>
                    <div className="goal-stat-divider" />
                    <div className="goal-stat">
                        <Trophy size={14} />
                        <span className="goal-stat-value">
                            {projection
                                ? format(parseISO(projection.estimatedGoalDate), "d MMM yyyy", { locale: fr })
                                : "—"}
                        </span>
                        <span className="goal-stat-label">date estimée</span>
                    </div>
                </div>

                {projection?.isGoalReached && (
                    <div className="goal-reached-banner">
                        <CheckCircle size={18} />
                        <span>🎉 Objectif atteint ! Félicitations !</span>
                    </div>
                )}
            </div>

            {/* Current Phase */}
            {currentPhase && (
                <div className="goal-phase-card">
                    <div className="goal-phase-header">
                        <Zap size={16} />
                        <span>Phase actuelle</span>
                    </div>
                    <div className="goal-phase-info">
                        <div className={`goal-phase-type goal-phase-type-${currentPhase.type}`}>
                            {currentPhase.type === "cut"
                                ? "🔥 Sèche"
                                : currentPhase.type === "bulk"
                                    ? "💪 Prise"
                                    : currentPhase.type === "maintenance"
                                        ? "⚖️ Maintien"
                                        : "🔄 Refeed"}
                        </div>
                        <span className="goal-phase-intensity">
                            {formatIntensity(currentPhase.dailyCalorieTarget)}
                        </span>
                        <span className="goal-phase-dates">
                            {format(parseISO(currentPhase.startDate), "d MMM", { locale: fr })} →{" "}
                            {format(parseISO(currentPhase.endDate), "d MMM", { locale: fr })}
                        </span>
                    </div>
                </div>
            )}

            {/* Phase Timeline */}
            {projection && projection.phases.length > 0 && (
                <div className="goal-phases-card">
                    <h3 className="goal-phases-title">📅 Plan par phases</h3>
                    <div className="goal-phases-list">
                        {projection.phases.map((phase, i) => {
                            const isActive = phase.startDate <= today && phase.endDate >= today;
                            const isPast = phase.endDate < today;
                            const dayCount = differenceInDays(
                                parseISO(phase.endDate),
                                parseISO(phase.startDate)
                            ) + 1;

                            return (
                                <div
                                    key={phase.id}
                                    className={`goal-phase-item ${isActive ? "goal-phase-active" : ""} ${isPast ? "goal-phase-past" : ""}`}
                                >
                                    <div className="goal-phase-indicator">
                                        <div className={`goal-phase-dot goal-phase-dot-${phase.type}`} />
                                        {i < projection.phases.length - 1 && <div className="goal-phase-line" />}
                                    </div>
                                    <div className="goal-phase-content">
                                        <div className="goal-phase-row">
                                            <span className={`goal-phase-badge goal-phase-badge-${phase.type}`}>
                                                {phase.type === "cut"
                                                    ? "Sèche"
                                                    : phase.type === "bulk"
                                                        ? "Prise"
                                                        : phase.type === "maintenance"
                                                            ? "Maintien"
                                                            : "Refeed"}
                                            </span>
                                            <span className="goal-phase-cal">
                                                {formatIntensity(phase.dailyCalorieTarget)}
                                            </span>
                                        </div>
                                        <span className="goal-phase-meta">
                                            {format(parseISO(phase.startDate), "d MMM", { locale: fr })} →{" "}
                                            {format(parseISO(phase.endDate), "d MMM", { locale: fr })} • {dayCount}j
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className="goal-phase-active-badge">
                                            <ChevronRight size={14} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

// =============================================================
// GOAL CREATE MODAL
// =============================================================

function GoalCreateModal({
    weightData,
    onClose,
    onCreated,
}: {
    weightData: WeightEntry[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const currentWeight =
        weightData.length > 0
            ? weightData[weightData.length - 1].weight
            : 80;

    const [targetWeight, setTargetWeight] = useState("");
    const [mode, setMode] = useState<GoalMode>("cut");
    const [intensity, setIntensity] = useState(-700);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = format(new Date(), "yyyy-MM-dd");

    // Auto-detect mode from target
    useEffect(() => {
        const tw = parseFloat(targetWeight);
        if (!isNaN(tw)) {
            if (tw < currentWeight) {
                setMode("cut");
                if (intensity > 0) setIntensity(-700);
            } else if (tw > currentWeight) {
                setMode("bulk");
                if (intensity < 0) setIntensity(300);
            }
        }
    }, [targetWeight, currentWeight]);

    // Preview phases
    const previewPhases = useMemo(() => {
        const tw = parseFloat(targetWeight);
        if (isNaN(tw) || tw === currentWeight) return [];
        return generatePhases(today, currentWeight, tw, intensity, mode);
    }, [targetWeight, currentWeight, intensity, mode, today]);

    const totalDays = useMemo(() => {
        if (previewPhases.length === 0) return 0;
        return differenceInDays(
            parseISO(previewPhases[previewPhases.length - 1].endDate),
            parseISO(previewPhases[0].startDate)
        ) + 1;
    }, [previewPhases]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const tw = parseFloat(targetWeight);
        if (isNaN(tw)) {
            setError("Poids cible invalide");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    target_weight: tw,
                    mode,
                    initial_intensity: intensity,
                    start_date: today,
                    start_weight: currentWeight,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Échec de la création");
            }

            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Fermer">
                    <X size={20} />
                </button>

                <div className="card">
                    <div className="card-header">
                        <div className="card-icon card-icon-goal">
                            <Target size={20} />
                        </div>
                        <div>
                            <h2 className="card-title">Créer un objectif</h2>
                            <p className="card-subtitle">
                                Poids actuel : <strong>{currentWeight.toFixed(1)} kg</strong>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label htmlFor="goal-target" className="form-label">Poids cible (kg)</label>
                            <input
                                id="goal-target"
                                type="number"
                                step="0.1"
                                min="30"
                                max="300"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder={`ex. ${mode === "cut" ? (currentWeight - 5).toFixed(0) : (currentWeight + 5).toFixed(0)}`}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mode</label>
                            <div className="goal-selector">
                                <button
                                    type="button"
                                    className={`goal-btn ${mode === "cut" ? "goal-btn-active goal-btn-deficit" : ""}`}
                                    onClick={() => {
                                        setMode("cut");
                                        setIntensity(-700);
                                    }}
                                >
                                    🔥 Sèche
                                </button>
                                <button
                                    type="button"
                                    className={`goal-btn ${mode === "bulk" ? "goal-btn-active goal-btn-bulk" : ""}`}
                                    onClick={() => {
                                        setMode("bulk");
                                        setIntensity(300);
                                    }}
                                >
                                    💪 Prise de masse
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="goal-intensity" className="form-label">
                                Intensité initiale : {formatIntensity(intensity)}
                            </label>
                            <input
                                id="goal-intensity"
                                type="range"
                                min={mode === "cut" ? -1000 : 200}
                                max={mode === "cut" ? -300 : 500}
                                step={50}
                                value={intensity}
                                onChange={(e) => setIntensity(parseInt(e.target.value))}
                                className="form-range"
                            />
                            <div className="form-range-labels">
                                <span>{mode === "cut" ? "Aggressif (−1000)" : "Léger (+200)"}</span>
                                <span>{mode === "cut" ? "Léger (−300)" : "Aggressif (+500)"}</span>
                            </div>
                        </div>

                        {/* Preview */}
                        {previewPhases.length > 0 && (
                            <div className="goal-preview">
                                <h4 className="goal-preview-title">📊 Aperçu du plan</h4>
                                <div className="goal-preview-stats">
                                    <div className="goal-preview-stat">
                                        <span className="goal-preview-val">{previewPhases.length}</span>
                                        <span>phases</span>
                                    </div>
                                    <div className="goal-preview-stat">
                                        <span className="goal-preview-val">{totalDays}</span>
                                        <span>jours</span>
                                    </div>
                                    <div className="goal-preview-stat">
                                        <span className="goal-preview-val">
                                            {Math.round(totalDays / 7)}
                                        </span>
                                        <span>semaines</span>
                                    </div>
                                    <div className="goal-preview-stat">
                                        <span className="goal-preview-val">
                                            {format(
                                                parseISO(previewPhases[previewPhases.length - 1].endDate),
                                                "d MMM yyyy",
                                                { locale: fr }
                                            )}
                                        </span>
                                        <span>fin estimée</span>
                                    </div>
                                </div>
                                <div className="goal-preview-phases">
                                    {previewPhases.slice(0, 6).map((phase, i) => (
                                        <div key={phase.id} className="goal-preview-phase">
                                            <span className={`goal-phase-badge goal-phase-badge-${phase.type}`}>
                                                {phase.type === "cut"
                                                    ? "Sèche"
                                                    : phase.type === "bulk"
                                                        ? "Prise"
                                                        : "Maintien"}
                                            </span>
                                            <span className="goal-preview-phase-cal">
                                                {formatIntensity(phase.dailyCalorieTarget)}
                                            </span>
                                            <span className="goal-preview-phase-days">{phase.durationDays}j</span>
                                        </div>
                                    ))}
                                    {previewPhases.length > 6 && (
                                        <div className="goal-preview-more">
                                            +{previewPhases.length - 6} phases supplémentaires
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="goal-error">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !targetWeight}
                            className="btn btn-goal"
                        >
                            {isSubmitting ? (
                                <span className="btn-loading">
                                    <span className="spinner" />
                                    Création...
                                </span>
                            ) : (
                                <>
                                    <Target size={16} />
                                    Créer l'objectif
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
