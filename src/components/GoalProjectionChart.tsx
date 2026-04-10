"use client";

import { useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Target } from "lucide-react";
import { GoalRow, WeightEntry, CalorieEntry } from "@/lib/db";
import {
    GoalConfig,
    recalculatePlan,
    GoalProjection,
} from "@/lib/goalEngine";

interface GoalProjectionChartProps {
    goal: GoalRow;
    weightData: WeightEntry[];
    calorieData: CalorieEntry[];
}

export default function GoalProjectionChart({
    goal,
    weightData,
    calorieData,
}: GoalProjectionChartProps) {
    const today = format(new Date(), "yyyy-MM-dd");

    const projection = useMemo((): GoalProjection | null => {
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

    if (!projection || projection.timeline.length === 0) {
        return (
            <div className="chart-card">
                <div className="chart-header">
                    <div className="chart-icon chart-icon-goal">
                        <Target size={18} />
                    </div>
                    <h2 className="chart-title">Projection de l'objectif</h2>
                </div>
                <div className="chart-empty">
                    <Target size={48} className="chart-empty-icon" />
                    <p>Aucune projection disponible</p>
                </div>
            </div>
        );
    }

    // Sample the timeline to avoid too many data points (max ~60 points)
    const step = Math.max(1, Math.floor(projection.timeline.length / 60));
    const sampledTimeline = projection.timeline.filter(
        (_, i) =>
            i === 0 ||
            i === projection.timeline.length - 1 ||
            i % step === 0 ||
            projection.timeline[i].date === today
    );

    const chartData = sampledTimeline.map((day) => ({
        date: day.date,
        label: format(parseISO(day.date), "d MMM", { locale: fr }),
        expectedWeight: day.expectedWeight,
        actualWeight: day.actualWeight ?? undefined,
        isToday: day.date === today,
    }));

    const allWeights = chartData.map((d) => d.expectedWeight);
    const actualWeights = chartData
        .filter((d) => d.actualWeight !== undefined)
        .map((d) => d.actualWeight!);
    const allValues = [...allWeights, ...actualWeights, goal.target_weight, goal.start_weight];
    const minWeight = Math.floor(Math.min(...allValues) - 1);
    const maxWeight = Math.ceil(Math.max(...allValues) + 1);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-icon chart-icon-goal">
                    <Target size={18} />
                </div>
                <h2 className="chart-title">Projection de l'objectif</h2>
            </div>

            <div className="chart-stats">
                <div className="stat">
                    <span className="stat-label">Début</span>
                    <span className="stat-value">{goal.start_weight.toFixed(1)} kg</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Cible</span>
                    <span className="stat-value" style={{ color: "#10b981" }}>
                        {goal.target_weight.toFixed(1)} kg
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Date estimée</span>
                    <span className="stat-value stat-value-highlight">
                        {format(parseISO(projection.estimatedGoalDate), "d MMM yyyy", { locale: fr })}
                    </span>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="goalProjectionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            interval={Math.max(0, Math.floor(chartData.length / 8))}
                        />
                        <YAxis
                            domain={[minWeight, maxWeight]}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.95)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                borderRadius: "12px",
                                color: "#e2e8f0",
                                fontSize: "13px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                            }}
                            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number, name: string) => {
                                if (name === "expectedWeight") return [`${value.toFixed(1)} kg`, "Poids prévu"];
                                if (name === "actualWeight") return [`${value.toFixed(1)} kg`, "Poids réel"];
                                return [value, name];
                            }) as any}
                        />

                        {/* Target weight reference line */}
                        <ReferenceLine
                            y={goal.target_weight}
                            stroke="rgba(16, 185, 129, 0.5)"
                            strokeDasharray="6 4"
                            label={{
                                value: `Objectif: ${goal.target_weight.toFixed(1)} kg`,
                                fill: "#10b981",
                                fontSize: 11,
                                position: "insideTopRight",
                            }}
                        />

                        {/* Projected weight line */}
                        <Area
                            type="monotone"
                            dataKey="expectedWeight"
                            fill="url(#goalProjectionGradient)"
                            stroke="none"
                        />
                        <Line
                            type="monotone"
                            dataKey="expectedWeight"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={false}
                        />

                        {/* Actual weight dots */}
                        <Line
                            type="monotone"
                            dataKey="actualWeight"
                            stroke="#6366f1"
                            strokeWidth={0}
                            dot={{ fill: "#6366f1", strokeWidth: 2, r: 4, stroke: "#1e1b4b" }}
                            activeDot={{ r: 6, fill: "#818cf8", stroke: "#1e1b4b", strokeWidth: 2 }}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-info">
                <p>
                    <strong style={{ color: "#10b981" }}>— —</strong> Projection basée sur le plan •{" "}
                    <strong style={{ color: "#6366f1" }}>●</strong> Poids réel (balance).
                    Le plan se recalcule automatiquement à chaque nouvelle donnée.
                </p>
            </div>
        </div>
    );
}
