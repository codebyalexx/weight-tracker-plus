"use client";

import { format, parseISO } from "date-fns";
import { Trash2, Scale, Flame } from "lucide-react";
import { WeightEntry, CalorieEntry } from "@/lib/db";

interface DataTableProps {
    weightData: WeightEntry[];
    calorieData: CalorieEntry[];
    onDeleteWeight: (id: number) => Promise<void>;
    onDeleteCalorie: (id: number) => Promise<void>;
}

export default function DataTable({
    weightData,
    calorieData,
    onDeleteWeight,
    onDeleteCalorie,
}: DataTableProps) {
    // Merge all dates from both datasets
    const allDates = new Set<string>();
    weightData.forEach((w) => allDates.add(w.date));
    calorieData.forEach((c) => allDates.add(c.date));

    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

    const weightMap = new Map(weightData.map((w) => [w.date, w]));
    const calorieMap = new Map(calorieData.map((c) => [c.date, c]));

    if (sortedDates.length === 0) {
        return null;
    }

    return (
        <div className="card table-card">
            <h2 className="card-title" style={{ marginBottom: "1rem" }}>
                📋 History
            </h2>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Weight (kg)</th>
                            <th>Eaten (kcal)</th>
                            <th>Burned (kcal)</th>
                            <th>Deficit</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedDates.map((date) => {
                            const weight = weightMap.get(date);
                            const calorie = calorieMap.get(date);
                            const deficit = calorie
                                ? calorie.calories_burned - calorie.calories_consumed
                                : null;

                            return (
                                <tr key={date}>
                                    <td className="table-date">
                                        {format(parseISO(date), "MMM d, yyyy")}
                                    </td>
                                    <td>
                                        {weight ? (
                                            <span className="table-weight">
                                                <Scale size={14} />
                                                {weight.weight.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="table-empty">—</span>
                                        )}
                                    </td>
                                    <td>
                                        {calorie ? (
                                            <span className="table-calorie">
                                                {calorie.calories_consumed.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="table-empty">—</span>
                                        )}
                                    </td>
                                    <td>
                                        {calorie ? (
                                            <span className="table-calorie">
                                                {calorie.calories_burned.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="table-empty">—</span>
                                        )}
                                    </td>
                                    <td>
                                        {deficit !== null ? (
                                            <span
                                                className={`table-deficit ${deficit > 0 ? "deficit-pos" : deficit < 0 ? "deficit-neg" : ""}`}
                                            >
                                                {deficit > 0 ? "−" : "+"}{Math.abs(deficit).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="table-empty">—</span>
                                        )}
                                    </td>
                                    <td className="table-actions">
                                        {weight && (
                                            <button
                                                onClick={() => onDeleteWeight(weight.id)}
                                                className="delete-btn"
                                                title="Delete weight entry"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        {calorie && (
                                            <button
                                                onClick={() => onDeleteCalorie(calorie.id)}
                                                className="delete-btn"
                                                title="Delete calorie entry"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
