"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Scale } from "lucide-react";
import { WeightEntry } from "@/lib/db";

interface WeightChartProps {
    data: WeightEntry[];
}

export default function WeightChart({ data }: WeightChartProps) {
    if (data.length === 0) {
        return (
            <div className="chart-card">
                <div className="chart-header">
                    <div className="chart-icon chart-icon-weight">
                        <Scale size={18} />
                    </div>
                    <h2 className="chart-title">Scale Weight Trend</h2>
                </div>
                <div className="chart-empty">
                    <Scale size={48} className="chart-empty-icon" />
                    <p>No weight data yet</p>
                    <p className="chart-empty-sub">Start logging your weight to see the trend</p>
                </div>
            </div>
        );
    }

    const chartData = data.map((entry) => ({
        date: entry.date,
        weight: entry.weight,
        label: format(parseISO(entry.date), "MMM d"),
    }));

    const weights = data.map((e) => e.weight);
    const minWeight = Math.floor(Math.min(...weights) - 1);
    const maxWeight = Math.ceil(Math.max(...weights) + 1);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

    const startWeight = weights[0];
    const currentWeight = weights[weights.length - 1];
    const totalChange = currentWeight - startWeight;

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-icon chart-icon-weight">
                    <Scale size={18} />
                </div>
                <h2 className="chart-title">Scale Weight Trend</h2>
            </div>

            <div className="chart-stats">
                <div className="stat">
                    <span className="stat-label">Start</span>
                    <span className="stat-value">{startWeight.toFixed(1)} kg</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Current</span>
                    <span className="stat-value stat-value-highlight">{currentWeight.toFixed(1)} kg</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Change</span>
                    <span className={`stat-value ${totalChange < 0 ? "stat-positive" : totalChange > 0 ? "stat-negative" : ""}`}>
                        {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg
                    </span>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                borderRadius: "12px",
                                color: "#e2e8f0",
                                fontSize: "13px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                            }}
                            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number) => [`${value.toFixed(1)} kg`, "Weight"]) as any}
                        />
                        <ReferenceLine
                            y={avgWeight}
                            stroke="rgba(99, 102, 241, 0.3)"
                            strokeDasharray="5 5"
                            label={{
                                value: `Avg: ${avgWeight.toFixed(1)}`,
                                fill: "#6366f1",
                                fontSize: 11,
                                position: "insideTopRight",
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={{ fill: "#6366f1", strokeWidth: 2, r: 4, stroke: "#1e1b4b" }}
                            activeDot={{ r: 6, fill: "#818cf8", stroke: "#1e1b4b", strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
