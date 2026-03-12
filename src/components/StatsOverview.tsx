"use client";

import { Scale, Flame, TrendingDown, Target, Calendar } from "lucide-react";
import { WeightEntry, CalorieEntry } from "@/lib/db";
import { format, parseISO, differenceInDays } from "date-fns";

interface StatsOverviewProps {
    weightData: WeightEntry[];
    calorieData: CalorieEntry[];
}

const KCAL_PER_KG = 7700;

export default function StatsOverview({ weightData, calorieData }: StatsOverviewProps) {
    if (weightData.length === 0 && calorieData.length === 0) return null;

    // Last weigh-in
    const lastWeighIn = weightData.length > 0 ? weightData[weightData.length - 1] : null;

    // Estimated current weight (from calorie data)
    let estimatedWeight: number | null = null;
    if (calorieData.length > 0 && weightData.length > 0) {
        const sortedWeights = [...weightData].sort((a, b) => a.date.localeCompare(b.date));
        const firstCalorieDate = calorieData[0].date;
        let startingWeight = sortedWeights[0].weight;
        const prior = sortedWeights.filter((w) => w.date <= firstCalorieDate);
        if (prior.length > 0) {
            startingWeight = prior[prior.length - 1].weight;
        }

        let cumulativeDeficit = 0;
        calorieData.forEach((entry) => {
            cumulativeDeficit += entry.calories_burned - entry.calories_consumed;
        });
        estimatedWeight = startingWeight - cumulativeDeficit / KCAL_PER_KG;
    }

    // Average daily deficit
    let avgDeficit: number | null = null;
    if (calorieData.length > 0) {
        const totalDeficit = calorieData.reduce(
            (sum, entry) => sum + (entry.calories_burned - entry.calories_consumed),
            0
        );
        avgDeficit = Math.round(totalDeficit / calorieData.length);
    }

    // Tracking duration
    const allDates = [
        ...weightData.map((w) => w.date),
        ...calorieData.map((c) => c.date),
    ].sort();
    const trackingDays = allDates.length > 1
        ? differenceInDays(parseISO(allDates[allDates.length - 1]), parseISO(allDates[0])) + 1
        : 1;

    // Total weight change (from scale)
    let totalChange: number | null = null;
    if (weightData.length >= 2) {
        totalChange = weightData[weightData.length - 1].weight - weightData[0].weight;
    }

    return (
        <section className="stats-overview">
            {lastWeighIn && (
                <div className="stats-overview-card">
                    <div className="stats-overview-icon stats-icon-weight">
                        <Scale size={18} />
                    </div>
                    <div className="stats-overview-info">
                        <span className="stats-overview-label">Dernière pesée</span>
                        <span className="stats-overview-value">
                            {lastWeighIn.weight.toFixed(1)} kg
                        </span>
                        <span className="stats-overview-sub">
                            {format(parseISO(lastWeighIn.date), "d MMM yyyy")}
                        </span>
                    </div>
                </div>
            )}

            {estimatedWeight !== null && (
                <div className="stats-overview-card">
                    <div className="stats-overview-icon stats-icon-estimated">
                        <Target size={18} />
                    </div>
                    <div className="stats-overview-info">
                        <span className="stats-overview-label">Poids estimé</span>
                        <span className="stats-overview-value stats-overview-value-accent">
                            {estimatedWeight.toFixed(1)} kg
                        </span>
                        <span className="stats-overview-sub">via calories</span>
                    </div>
                </div>
            )}

            {avgDeficit !== null && (
                <div className="stats-overview-card">
                    <div className={`stats-overview-icon ${avgDeficit > 0 ? "stats-icon-deficit" : "stats-icon-surplus"}`}>
                        <Flame size={18} />
                    </div>
                    <div className="stats-overview-info">
                        <span className="stats-overview-label">Déficit moyen</span>
                        <span className={`stats-overview-value ${avgDeficit > 0 ? "stats-val-positive" : "stats-val-negative"}`}>
                            {avgDeficit > 0 ? "−" : "+"}{Math.abs(avgDeficit)} kcal
                        </span>
                        <span className="stats-overview-sub">/jour</span>
                    </div>
                </div>
            )}

            {totalChange !== null && (
                <div className="stats-overview-card">
                    <div className={`stats-overview-icon ${totalChange < 0 ? "stats-icon-deficit" : "stats-icon-surplus"}`}>
                        <TrendingDown size={18} />
                    </div>
                    <div className="stats-overview-info">
                        <span className="stats-overview-label">Progression</span>
                        <span className={`stats-overview-value ${totalChange < 0 ? "stats-val-positive" : totalChange > 0 ? "stats-val-negative" : ""}`}>
                            {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg
                        </span>
                        <span className="stats-overview-sub">depuis le début</span>
                    </div>
                </div>
            )}

            <div className="stats-overview-card">
                <div className="stats-overview-icon stats-icon-days">
                    <Calendar size={18} />
                </div>
                <div className="stats-overview-info">
                    <span className="stats-overview-label">Durée du suivi</span>
                    <span className="stats-overview-value">{trackingDays} jour{trackingDays > 1 ? "s" : ""}</span>
                    <span className="stats-overview-sub">
                        {weightData.length} pesée{weightData.length > 1 ? "s" : ""} • {calorieData.length} log{calorieData.length > 1 ? "s" : ""}
                    </span>
                </div>
            </div>
        </section>
    );
}
