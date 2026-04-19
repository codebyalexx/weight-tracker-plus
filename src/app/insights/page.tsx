"use client";

import { useState, useEffect, useCallback } from "react";
import WeightChart from "@/components/WeightChart";
import EstimatedWeightChart from "@/components/EstimatedWeightChart";
import StatsOverview from "@/components/StatsOverview";
import DataTable from "@/components/DataTable";
import { WeightEntry, CalorieEntry, GoalRow } from "@/lib/db";

export default function Insights() {
    const [weightData, setWeightData] = useState<WeightEntry[]>([]);
    const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [w, c] = await Promise.all([
                fetch("/api/weight").then(r => r.json()),
                fetch("/api/calories").then(r => r.json()),
            ]);
            setWeightData(Array.isArray(w) ? w : []);
            setCalorieData(Array.isArray(c) ? c : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteWeight = async (id: number) => {
        await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    const handleDeleteCalorie = async (id: number) => {
        await fetch(`/api/calories?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-main-green border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col gap-6 w-full pb-8">
            <h1 className="text-2xl font-extrabold text-text-dark text-center mt-2">Insights</h1>
            <p className="text-text-muted font-bold text-center -mt-4 mb-4">Vue d'ensemble de ton aventure</p>
            
            <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
                <StatsOverview weightData={weightData} calorieData={calorieData} />
                <WeightChart data={weightData} />
                <EstimatedWeightChart weightData={weightData} calorieData={calorieData} />
                <div className="tasty-card overflow-hidden">
                    <DataTable 
                        weightData={weightData} 
                        calorieData={calorieData} 
                        onDeleteWeight={handleDeleteWeight}
                        onDeleteCalorie={handleDeleteCalorie}
                    />
                </div>
            </div>
        </div>
    );
}
