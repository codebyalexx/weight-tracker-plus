"use client";

import { useState, useEffect, useCallback } from "react";
import WeightForm from "@/components/WeightForm";
import CalorieForm from "@/components/CalorieForm";
import WeightChart from "@/components/WeightChart";
import EstimatedWeightChart from "@/components/EstimatedWeightChart";
import StatsOverview from "@/components/StatsOverview";
import DataTable from "@/components/DataTable";
import { WeightEntry, CalorieEntry, GoalType } from "@/lib/db";
import { TrendingDown, Scale, Flame, X } from "lucide-react";

export default function Home() {
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [weightRes, calorieRes] = await Promise.all([
        fetch("/api/weight"),
        fetch("/api/calories"),
      ]);
      const weights = await weightRes.json();
      const calories = await calorieRes.json();
      setWeightData(Array.isArray(weights) ? weights : []);
      setCalorieData(Array.isArray(calories) ? calories : []);
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
    setShowWeightModal(false);
  };

  const handleCalorieSubmit = async (
    date: string,
    calories_consumed: number,
    calories_burned: number,
    goal: GoalType
  ) => {
    const res = await fetch("/api/calories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, calories_consumed, calories_burned, goal }),
    });
    if (!res.ok) throw new Error("Failed to save calories");
    await fetchData();
    setShowCalorieModal(false);
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

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowWeightModal(false);
        setShowCalorieModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

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
            {/* Stats Overview */}
            <StatsOverview weightData={weightData} calorieData={calorieData} />

            {/* Action Buttons */}
            <section className="action-buttons">
              <button
                className="action-btn action-btn-weight"
                onClick={() => setShowWeightModal(true)}
              >
                <Scale size={20} />
                <span>Log Weight</span>
              </button>
              <button
                className="action-btn action-btn-calorie"
                onClick={() => setShowCalorieModal(true)}
              >
                <Flame size={20} />
                <span>Log Calories</span>
              </button>
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

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="modal-overlay" onClick={() => setShowWeightModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowWeightModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <WeightForm onSubmit={handleWeightSubmit} />
          </div>
        </div>
      )}

      {/* Calorie Modal */}
      {showCalorieModal && (
        <div className="modal-overlay" onClick={() => setShowCalorieModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowCalorieModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <CalorieForm onSubmit={handleCalorieSubmit} />
          </div>
        </div>
      )}
    </div>
  );
}
