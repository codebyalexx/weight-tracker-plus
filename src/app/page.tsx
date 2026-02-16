"use client";

import { useState, useEffect, useCallback } from "react";
import WeightForm from "@/components/WeightForm";
import CalorieForm from "@/components/CalorieForm";
import WeightChart from "@/components/WeightChart";
import EstimatedWeightChart from "@/components/EstimatedWeightChart";
import DataTable from "@/components/DataTable";
import { WeightEntry, CalorieEntry } from "@/lib/db";
import { TrendingDown, Activity } from "lucide-react";

export default function Home() {
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [weightRes, calorieRes] = await Promise.all([
        fetch("/api/weight"),
        fetch("/api/calories"),
      ]);
      const weights = await weightRes.json();
      const calories = await calorieRes.json();
      setWeightData(weights);
      setCalorieData(calories);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWeightSubmit = async (date: string, weight: number) => {
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight }),
    });
    if (!res.ok) throw new Error("Failed to save weight");
    await fetchData();
  };

  const handleCalorieSubmit = async (
    date: string,
    calories_consumed: number,
    calories_burned: number
  ) => {
    const res = await fetch("/api/calories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, calories_consumed, calories_burned }),
    });
    if (!res.ok) throw new Error("Failed to save calories");
    await fetchData();
  };

  const handleDeleteWeight = async (id: number) => {
    const res = await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete weight");
    await fetchData();
  };

  const handleDeleteCalorie = async (id: number) => {
    const res = await fetch(`/api/calories?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete calorie entry");
    await fetchData();
  };

  return (
    <div className="app-container">
      {/* Hero Header */}
      <header className="app-header">
        <div className="header-glow" />
        <div className="header-content">
          <div className="header-icon">
            <TrendingDown size={32} />
          </div>
          <h1 className="header-title">Weight Tracker+</h1>
          <p className="header-subtitle">
            Track your weight, monitor your calories, and visualize your progress
          </p>
          {!loading && (weightData.length > 0 || calorieData.length > 0) && (
            <div className="header-stats">
              <div className="header-stat">
                <Activity size={16} />
                <span>{weightData.length} weigh-ins</span>
              </div>
              <div className="header-stat-divider" />
              <div className="header-stat">
                <Activity size={16} />
                <span>{calorieData.length} calorie logs</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading your data...</p>
          </div>
        ) : (
          <>
            {/* Input Forms */}
            <section className="forms-section">
              <WeightForm onSubmit={handleWeightSubmit} />
              <CalorieForm onSubmit={handleCalorieSubmit} />
            </section>

            {/* Charts */}
            <section className="charts-section">
              <WeightChart data={weightData} />
              <EstimatedWeightChart
                calorieData={calorieData}
                weightData={weightData}
              />
            </section>

            {/* Data Table */}
            <section className="table-section">
              <DataTable
                weightData={weightData}
                calorieData={calorieData}
                onDeleteWeight={handleDeleteWeight}
                onDeleteCalorie={handleDeleteCalorie}
              />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Weight Tracker+ • 7,700 kcal = 1 kg rule</p>
      </footer>
    </div>
  );
}
