"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, isFuture, isToday, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Flame, Scale, Check, Plus, AlertCircle, X } from "lucide-react";
import { WeightEntry, CalorieEntry, GoalRow, GoalType } from "@/lib/db";

const KCAL_PER_KG = 7700;

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
            const surplus = -deficit;
            if (surplus >= 0 && surplus <= 300) return "positive";
            if (surplus > 300 && surplus <= 500) return "warning";
            if (deficit > 0 && deficit <= 100) return "warning";
            return "negative";
        }
        default:
            return "negative";
    }
}

function getEstimatedWeightForDate(date: string, calorieData: CalorieEntry[], weightData: WeightEntry[]): number | null {
    const sortedWeightData = [...weightData].sort((a,b) => a.date.localeCompare(b.date));
    const sortedCalorieData = [...calorieData].sort((a,b) => a.date.localeCompare(b.date));
    
    if (sortedWeightData.length === 0) return null;
    if (sortedCalorieData.length === 0) return sortedWeightData[sortedWeightData.length - 1].weight;
    
    let startingWeight = sortedWeightData[0].weight;
    const firstCalDate = sortedCalorieData[0].date;
    const priorWeights = sortedWeightData.filter(w => w.date <= firstCalDate);
    if (priorWeights.length > 0) startingWeight = priorWeights[priorWeights.length - 1].weight;

    let currentBaseline = startingWeight;
    let baselineDate = "";
    let deficitSinceBaseline = 0;
    let estimatedWeight = startingWeight;

    for (const entry of sortedCalorieData) {
        if (entry.date > date) break;

        const scaleReadings = sortedWeightData.filter(w => w.date <= entry.date);
        if (scaleReadings.length > 0) {
            const latestScale = scaleReadings[scaleReadings.length - 1];
            if (latestScale.date !== baselineDate) {
                currentBaseline = latestScale.weight;
                baselineDate = latestScale.date;
                deficitSinceBaseline = 0;
            }
        }
        const dailyDeficit = entry.calories_burned - entry.calories_consumed;
        deficitSinceBaseline += dailyDeficit;
        estimatedWeight = currentBaseline - (deficitSinceBaseline / KCAL_PER_KG);
    }

    // if no calorie entries exist up to 'date', fallback to latest known scale
    const finalScaleReads = sortedWeightData.filter(w => w.date <= date);
    if (sortedCalorieData.filter(c => c.date <= date).length === 0 && finalScaleReads.length > 0) {
        return finalScaleReads[finalScaleReads.length - 1].weight;
    }

    return estimatedWeight;
}

const GOAL_LABELS: Record<GoalType, string> = {
    deficit: "Sèche",
    maintenance: "Maintien",
    bulk: "Prise de masse",
};

export default function Home() {
    const [weightData, setWeightData] = useState<WeightEntry[]>([]);
    const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
    const [goalData, setGoalData] = useState<GoalRow | null>(null);
    const [loading, setLoading] = useState(true);

    const [activeDateObj, setActiveDateObj] = useState(new Date());
    
    useEffect(() => {
        if (typeof window !== "undefined") {
            const queryDate = new URLSearchParams(window.location.search).get("date");
            if (queryDate) {
                const parsed = parseISO(queryDate);
                if (!isNaN(parsed.getTime())) setActiveDateObj(parsed);
            }
        }
    }, []);

    const activeDate = format(activeDateObj, "yyyy-MM-dd");

    const [modal, setModal] = useState<"none" | "calories" | "weight">("none");

    const fetchData = useCallback(async () => {
        try {
            const [w, c, g] = await Promise.all([
                fetch("/api/weight").then(r => r.json()),
                fetch("/api/calories").then(r => r.json()),
                fetch("/api/goal").then(r => r.json()),
            ]);
            setWeightData(Array.isArray(w) ? w : []);
            setCalorieData(Array.isArray(c) ? c : []);
            setGoalData(g && g.id ? g : null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeCalorieEntry = calorieData.find(c => c.date === activeDate);
    const activeEstimatedWeight = getEstimatedWeightForDate(activeDate, calorieData, weightData);

    const days = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i - 3)); // 3 days ago to 3 days future

    const getDayColor = (dateObj: Date) => {
        const dateStr = format(dateObj, "yyyy-MM-dd");
        const entry = calorieData.find(c => c.date === dateStr);
        if (isFuture(dateObj) && !isToday(dateObj)) return "bg-main-gray border-main-gray-shadow text-text-muted";
        
        if (!entry) return "bg-main-red border-main-red-shadow text-white"; // Missing

        const deficit = entry.calories_burned - entry.calories_consumed;
        const status = getGoalStatus(deficit, entry.goal as GoalType);
        
        if (status === "positive" || status === "warning") {
            const isGreen = status === "positive";
            return isGreen ? "bg-main-green border-main-green-shadow text-white" : "bg-main-orange border-main-orange-shadow text-white";
        }
        return "bg-main-orange border-main-orange-shadow text-white"; // Even negative deficit can be orange if they logged it, wait prompt says "orange si on a rentre les kcal mais que ca ne respecte pas l'objectif". Let's stick to Orange!
    };


    // Modal states
    const [cConsumed, setCConsumed] = useState("");
    const [cBurned, setCBurned] = useState("");
    const [cGoal, setCGoal] = useState<GoalType>("deficit");
    const [wWeight, setWWeight] = useState("");

    const handleSaveCalories = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch("/api/calories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: activeDate,
                    calories_consumed: Number(cConsumed),
                    calories_burned: Number(cBurned),
                    goal: cGoal
                }),
            });
            await fetchData();
            setModal("none");
            setCConsumed("");
            setCBurned("");
        } catch (err) {}
    };

    const handleSaveWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch("/api/weight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: activeDate,
                    weight: Number(wWeight)
                }),
            });
            await fetchData();
            setModal("none");
            setWWeight("");
        } catch (err) {}
    };


    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-main-green border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col gap-6">
            
            {/* Days Strip */}
            <div className="flex justify-between items-center gap-2 overflow-x-auto pb-4 pt-2 snap-x">
                {days.map(d => {
                    const isActive = format(d, "yyyy-MM-dd") === activeDate;
                    const colorClass = getDayColor(d);
                    const dayName = format(d, "EE", { locale: fr }).substring(0, 2);
                    
                    return (
                        <button 
                            key={d.toISOString()}
                            onClick={() => setActiveDateObj(d)}
                            className={`flex flex-col items-center justify-center min-w-[56px] h-16 rounded-xl border-b-4 transition-transform active:scale-95 snap-center shrink-0 ${colorClass} ${isActive ? 'ring-4 ring-offset-2 ring-main-blue' : ''}`}
                        >
                            <span className="text-xs uppercase font-bold opacity-80">{dayName}</span>
                            <span className="text-lg font-extrabold">{format(d, "d")}</span>
                        </button>
                    )
                })}
            </div>

            {/* Content view for Active Date */}
            <div className="text-center font-bold text-text-dark text-xl">
                {isToday(activeDateObj) ? "Aujourd'hui" : format(activeDateObj, "d MMMM yyyy", { locale: fr })}
            </div>

            {activeEstimatedWeight !== null && (
                <div className="tasty-card p-4 flex items-center justify-between">
                    <div className="font-bold text-text-muted flex items-center gap-2 text-sm">
                        <Scale size={18} /> Poids Estimé
                    </div>
                    <div className="font-extrabold text-main-blue text-2xl">
                        {activeEstimatedWeight.toFixed(1)} kg
                    </div>
                </div>
            )}

            {!activeCalorieEntry ? (
                <div className="tasty-card p-6 flex flex-col items-center text-center gap-4">
                    <div className="bg-main-red text-white p-4 rounded-full shadow-[0_4px_0_#ea2b2b]">
                        <AlertCircle size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-extrabold">Tu n&apos;as pas rentré tes calories ce jour-là !</h2>
                    <p className="text-text-muted font-bold">Garde le rythme pour atteindre tes objectifs de poids.</p>
                    <button 
                        onClick={() => setModal("calories")}
                        className="tasty-button tasty-button-blue w-full py-4 text-lg mt-2"
                    >
                        Rentrer mes calories
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="tasty-card p-4">
                        <h3 className="font-bold text-text-muted text-sm uppercase tracking-wider mb-3">Résumé du jour</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-100 flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-main-orange uppercase">Consommé</span>
                                <span className="text-xl font-extrabold text-text-dark">{activeCalorieEntry.calories_consumed} <span className="text-sm">kcal</span></span>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-100 flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-main-green uppercase">Brûlé</span>
                                <span className="text-xl font-extrabold text-text-dark">{activeCalorieEntry.calories_burned} <span className="text-sm">kcal</span></span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t-2 border-gray-100 grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs font-bold text-text-muted uppercase">Objectif</div>
                                <div className="font-extrabold text-main-blue text-lg">
                                    {GOAL_LABELS[activeCalorieEntry.goal as GoalType] || "Sèche"}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-text-muted uppercase">Impact Est.</div>
                                <div className={`font-extrabold text-lg ${(activeCalorieEntry.calories_burned - activeCalorieEntry.calories_consumed) > 0 ? "text-main-green" : "text-main-red"}`}>
                                    {((activeCalorieEntry.calories_burned - activeCalorieEntry.calories_consumed) > 0 ? "−" : "+")}
                                    {Math.abs(Math.round(((activeCalorieEntry.calories_burned - activeCalorieEntry.calories_consumed) / 7700) * 1000))} g
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setModal("calories")}
                        className="tasty-button tasty-button-orange w-full py-3 text-white bg-main-orange shadow-[0_4px_0_#e57900] active:shadow-[0_0px_0_#e57900]"
                    >
                        Modifier les calories
                    </button>
                </div>
            )}

            <button 
                onClick={() => setModal("weight")}
                className="tasty-button tasty-button-gray w-full py-4 mt-2"
            >
                <Plus size={20} className="mr-2" strokeWidth={3} />
                Ajouter une vraie pesée
            </button>

            {/* Modals */}
            {modal === "calories" && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl border-4 border-gray-200 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                        <div className="bg-main-blue p-4 flex items-center justify-between text-white">
                            <h2 className="font-extrabold text-xl">Calories du {format(activeDateObj, "d MMM", { locale: fr })}</h2>
                            <button onClick={() => setModal("none")}><X size={28} strokeWidth={3} /></button>
                        </div>
                        <form onSubmit={handleSaveCalories} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1 block">Calories consommées</label>
                                <input required type="number" value={cConsumed} onChange={e=>setCConsumed(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-lg focus:outline-none focus:border-main-blue text-center bg-gray-50" placeholder="Ex: 1800" />
                            </div>
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1 block">Calories brûlées</label>
                                <input required type="number" value={cBurned} onChange={e=>setCBurned(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-lg focus:outline-none focus:border-main-blue text-center bg-gray-50" placeholder="Ex: 2200" />
                            </div>
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-2 block">Objectif</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["deficit", "maintenance", "bulk"] as GoalType[]).map(g => (
                                        <button 
                                            key={g} type="button" onClick={() => setCGoal(g)}
                                            className={`p-2 rounded-xl border-2 font-bold text-xs uppercase ${cGoal === g ? 'bg-main-blue/10 border-main-blue text-main-blue' : 'border-gray-200 text-text-muted hover:border-gray-300'}`}
                                        >
                                            {GOAL_LABELS[g]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="tasty-button tasty-button-blue w-full py-4 mt-2 text-lg">Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}

            {modal === "weight" && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl border-4 border-gray-200 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                        <div className="bg-main-green p-4 flex items-center justify-between text-white">
                            <h2 className="font-extrabold text-xl">Pesée du {format(activeDateObj, "d MMM", { locale: fr })}</h2>
                            <button onClick={() => setModal("none")}><X size={28} strokeWidth={3} /></button>
                        </div>
                        <form onSubmit={handleSaveWeight} className="p-6 flex flex-col gap-6">
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1 block text-center">Poids actuel (kg)</label>
                                <input required step="0.1" type="number" value={wWeight} onChange={e=>setWWeight(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-4 font-extrabold text-3xl focus:outline-none focus:border-main-green text-center bg-gray-50 text-main-green placeholder-gray-300" placeholder="00.0" />
                            </div>
                            <button type="submit" className="tasty-button tasty-button-green w-full py-4 text-lg">Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
