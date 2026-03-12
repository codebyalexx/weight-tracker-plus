"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    ComposedChart,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Flame } from "lucide-react";
import { CalorieEntry, WeightEntry } from "@/lib/db";

interface EstimatedWeightChartProps {
    calorieData: CalorieEntry[];
    weightData: WeightEntry[];
}

const KCAL_PER_KG = 7700;

export default function EstimatedWeightChart({
    calorieData,
    weightData,
}: EstimatedWeightChartProps) {
    if (calorieData.length === 0) {
        return (
            <div className="chart-card">
                <div className="chart-header">
                    <div className="chart-icon chart-icon-calorie">
                        <Flame size={18} />
                    </div>
                    <h2 className="chart-title">Poids estimé (via calories)</h2>
                </div>
                <div className="chart-empty">
                    <Flame size={48} className="chart-empty-icon" />
                    <p>Aucune donnée de calories</p>
                    <p className="chart-empty-sub">Commencez à enregistrer vos calories pour voir la tendance estimée</p>
                </div>
            </div>
        );
    }

    // Get the starting weight from the first weight entry, or use a default
    const sortedWeightData = [...weightData].sort(
        (a, b) => a.date.localeCompare(b.date)
    );

    // Find the earliest weight entry on or before the first calorie entry
    const firstCalorieDate = calorieData[0].date;
    let startingWeight = 80; // default if no weight data

    if (sortedWeightData.length > 0) {
        // Find the closest weight entry to or before the first calorie entry
        const prior = sortedWeightData.filter(
            (w) => w.date <= firstCalorieDate
        );
        if (prior.length > 0) {
            startingWeight = prior[prior.length - 1].weight;
        } else {
            startingWeight = sortedWeightData[0].weight;
        }
    }

    // Calculate cumulative weight change based on calorie deficit
    let cumulativeDeficit = 0;
    const chartData = calorieData.map((entry, index) => {
        const dailyDeficit = entry.calories_burned - entry.calories_consumed;
        cumulativeDeficit += dailyDeficit;
        const estimatedWeightChange = cumulativeDeficit / KCAL_PER_KG;
        const estimatedWeight = startingWeight - estimatedWeightChange;

        return {
            date: entry.date,
            label: format(parseISO(entry.date), "MMM d"),
            estimatedWeight: parseFloat(estimatedWeight.toFixed(2)),
            dailyDeficit: Math.round(dailyDeficit),
            cumulativeDeficit: Math.round(cumulativeDeficit),
        };
    });

    const estimatedWeights = chartData.map((d) => d.estimatedWeight);
    const minWeight = Math.floor(Math.min(...estimatedWeights) - 1);
    const maxWeight = Math.ceil(Math.max(...estimatedWeights) + 1);

    const totalEstimatedChange =
        chartData[chartData.length - 1].estimatedWeight - startingWeight;
    const totalDeficit = chartData[chartData.length - 1].cumulativeDeficit;
    const avgDailyDeficit = Math.round(totalDeficit / chartData.length);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-icon chart-icon-calorie">
                    <Flame size={18} />
                </div>
                <h2 className="chart-title">Estimated Weight (from Calories)</h2>
            </div>

            <div className="chart-stats">
                <div className="stat">
                    <span className="stat-label">Début</span>
                    <span className="stat-value">{startingWeight.toFixed(1)} kg</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Estimé actuel</span>
                    <span className="stat-value stat-value-highlight">
                        {chartData[chartData.length - 1].estimatedWeight.toFixed(1)} kg
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Évolution est.</span>
                    <span
                        className={`stat-value ${totalEstimatedChange < 0 ? "stat-positive" : totalEstimatedChange > 0 ? "stat-negative" : ""}`}
                    >
                        {totalEstimatedChange > 0 ? "+" : ""}
                        {totalEstimatedChange.toFixed(1)} kg
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Déficit moy.</span>
                    <span className={`stat-value ${avgDailyDeficit > 0 ? "stat-positive" : "stat-negative"}`}>
                        {avgDailyDeficit > 0 ? "−" : "+"}{Math.abs(avgDailyDeficit)} kcal
                    </span>
                </div>
            </div>

            <div className="chart-info">
                <p>
                    Basé sur la règle <strong>7 700 kcal = 1 kg</strong>. Votre déficit/surplus calorique
                    quotidien est accumulé pour estimer l'évolution de votre poids.
                </p>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="estimatedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        />
                        <YAxis
                            domain={[minWeight, maxWeight]}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            tickFormatter={(val) => `${val}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.95)",
                                border: "1px solid rgba(249, 115, 22, 0.3)",
                                borderRadius: "12px",
                                color: "#e2e8f0",
                                fontSize: "13px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                            }}
                            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number, name: string) => {
                                if (name === "estimatedWeight")
                                    return [`${value.toFixed(1)} kg`, "Poids est."];
                                return [value, name];
                            }) as any}
                        />
                        <Area
                            type="monotone"
                            dataKey="estimatedWeight"
                            fill="url(#estimatedGradient)"
                            stroke="none"
                        />
                        <Line
                            type="monotone"
                            dataKey="estimatedWeight"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={{ fill: "#f97316", strokeWidth: 2, r: 4, stroke: "#451a03" }}
                            activeDot={{ r: 6, fill: "#fb923c", stroke: "#451a03", strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
