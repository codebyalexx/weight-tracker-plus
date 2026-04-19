"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from "recharts";
import { format, parseISO, subDays, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingDown, Flame, Scale, Trash2, CalendarDays } from "lucide-react";
import { WeightEntry, CalorieEntry } from "@/lib/db";

const KCAL_PER_KG = 7700;

export default function Insights() {
    const [weightData, setWeightData] = useState<WeightEntry[]>([]);
    const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<"7" | "30" | "total">("30");

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
        if (!confirm("Supprimer cette pesée ?")) return;
        await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    const handleDeleteCalorie = async (id: number) => {
        if (!confirm("Supprimer ce journal ?")) return;
        await fetch(`/api/calories?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    // Calculate Top Stats
    const topStats = useMemo(() => {
        const today = startOfDay(new Date());
        const days7Ago = subDays(today, 7);
        const days30Ago = subDays(today, 30);

        // Avg Deficit Last 7 Days
        const caloriesLast7 = calorieData.filter(c => isAfter(parseISO(c.date), days7Ago));
        let avgDeficit7 = 0;
        if (caloriesLast7.length > 0) {
            const sum = caloriesLast7.reduce((acc, c) => acc + (c.calories_burned - c.calories_consumed), 0);
            avgDeficit7 = Math.round(sum / caloriesLast7.length);
        }

        // Progression Last 30 Days
        const weightsLast30 = [...weightData].filter(w => isAfter(parseISO(w.date), days30Ago)).sort((a, b) => a.date.localeCompare(b.date));
        let prog30 = 0;
        if (weightsLast30.length >= 2) {
            prog30 = weightsLast30[weightsLast30.length - 1].weight - weightsLast30[0].weight;
        }

        return { avgDeficit7, prog30, weightsLast30Length: weightsLast30.length, caloriesLast7Length: caloriesLast7.length };
    }, [calorieData, weightData]);

    // Build Master MasterData Array
    const masterData = useMemo(() => {
        if (weightData.length === 0 && calorieData.length === 0) return [];

        const sortedWeights = [...weightData].sort((a,b) => a.date.localeCompare(b.date));
        const sortedCalories = [...calorieData].sort((a,b) => a.date.localeCompare(b.date));

        const allDatesSet = new Set<string>();
        sortedWeights.forEach(w => allDatesSet.add(w.date));
        sortedCalories.forEach(c => allDatesSet.add(c.date));
        const allDates = Array.from(allDatesSet).sort();

        let currentBaseline = sortedWeights.length > 0 ? sortedWeights[0].weight : 80;
        let baselineDate = "";
        let deficitSinceBaseline = 0;
        
        return allDates.map(date => {
            const wEntry = sortedWeights.find(w => w.date === date);
            const cEntry = sortedCalories.find(c => c.date === date);

            if (wEntry && wEntry.date !== baselineDate) {
                currentBaseline = wEntry.weight;
                baselineDate = wEntry.date;
                deficitSinceBaseline = 0;
            }

            let deficit = 0;
            if (cEntry) {
                deficit = cEntry.calories_burned - cEntry.calories_consumed;
                deficitSinceBaseline += deficit;
            }

            const estimatedWeight = currentBaseline - (deficitSinceBaseline / KCAL_PER_KG);

            return {
                date,
                label: format(parseISO(date), "dd MMM", { locale: fr }),
                realWeight: wEntry ? wEntry.weight : null,
                estimatedWeight: Number(estimatedWeight.toFixed(1)),
                deficit: deficit || 0,
                hasCalorieLog: !!cEntry
            };
        });
    }, [weightData, calorieData]);

    // Filtered Data based on timeRange
    const chartData = useMemo(() => {
        if (timeRange === "total") return masterData;
        
        const daysToKeep = timeRange === "30" ? 30 : 7;
        const cutoffDate = subDays(new Date(), daysToKeep);
        
        return masterData.filter(d => isAfter(parseISO(d.date), cutoffDate));
    }, [masterData, timeRange]);

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-main-green border-t-transparent rounded-full animate-spin"></div></div>;

    // Extents for Weight Chart
    let minW = 200, maxW = 0;
    chartData.forEach(d => {
        if (d.realWeight) {
            if (d.realWeight < minW) minW = d.realWeight;
            if (d.realWeight > maxW) maxW = d.realWeight;
        }
        if (d.estimatedWeight) {
            if (d.estimatedWeight < minW) minW = d.estimatedWeight;
            if (d.estimatedWeight > maxW) maxW = d.estimatedWeight;
        }
    });
    if (minW === 200) minW = 0;
    minW = Math.floor(minW - 1);
    maxW = Math.ceil(maxW + 1);

    return (
        <div className="flex flex-col gap-6 w-full pb-8">
            <h1 className="text-2xl font-extrabold text-text-dark text-center mt-2">Insights</h1>
            <p className="text-text-muted font-bold text-center -mt-4 mb-4">Vue d&apos;ensemble de ton aventure</p>
            
            {/* Top Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="tasty-card p-4 flex flex-col gap-2 items-center text-center">
                    <div className="bg-main-orange/10 p-3 rounded-2xl text-main-orange mb-1">
                        <Flame size={28} strokeWidth={2.5} />
                    </div>
                    <div className="text-xs font-bold text-text-muted uppercase">Déficit moyen (7j)</div>
                    <div className={`text-xl font-extrabold ${topStats.avgDeficit7 > 0 ? "text-main-green" : topStats.avgDeficit7 < 0 ? "text-main-red" : "text-text-dark"}`}>
                        {topStats.caloriesLast7Length > 0 ? `${topStats.avgDeficit7 > 0 ? "−" : "+"}${Math.abs(topStats.avgDeficit7)} kcal` : "Pas de données"}
                    </div>
                </div>
                
                <div className="tasty-card p-4 flex flex-col gap-2 items-center text-center">
                    <div className="bg-main-blue/10 p-3 rounded-2xl text-main-blue mb-1">
                        <TrendingDown size={28} strokeWidth={2.5} />
                    </div>
                    <div className="text-xs font-bold text-text-muted uppercase">Progression (30j)</div>
                    <div className={`text-xl font-extrabold ${topStats.prog30 < 0 ? "text-main-green" : topStats.prog30 > 0 ? "text-main-red" : "text-text-dark"}`}>
                        {topStats.weightsLast30Length >= 2 ? `${topStats.prog30 > 0 ? "+" : ""}${topStats.prog30.toFixed(1)} kg` : "Pas assez de pesées"}
                    </div>
                </div>
            </div>

            {/* Range Selector */}
            <div className="tasty-card p-2 flex gap-2 overflow-x-auto snap-x">
                {[
                    { val: "7", label: "7 derniers jours" },
                    { val: "30", label: "30 derniers jours" },
                    { val: "total", label: "Historique Total" }
                ].map(r => (
                    <button
                        key={r.val}
                        onClick={() => setTimeRange(r.val as "7" | "30" | "total")}
                        className={`flex-1 min-w-fit px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap snap-center shrink-0 ${timeRange === r.val ? 'bg-main-blue text-white shadow-[0_4px_0_#1899d6] translate-y-0 active:translate-y-1 active:shadow-none' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {chartData.length === 0 ? (
                <div className="tasty-card p-8 text-center text-text-muted font-bold">
                    Aucune donnée pour cette période.
                </div>
            ) : (
                <>
                    {/* Weight Chart */}
                    <div className="tasty-card p-4">
                        <div className="flex items-center gap-2 mb-4 font-extrabold text-lg text-text-dark">
                            <Scale className="text-main-blue" /> Courbe du Poids
                        </div>
                        <div className="h-64 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                    <XAxis dataKey="label" tick={{ fill: "#afafaf", fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                                    <YAxis domain={[minW, maxW]} tick={{ fill: "#afafaf", fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickMargin={10} width={40} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#afafaf', marginBottom: '8px' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="estimatedWeight" 
                                        name="Estimé"
                                        stroke="#1cb0f6" 
                                        strokeWidth={3} 
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                    <Line 
                                        connectNulls
                                        type="monotone" 
                                        dataKey="realWeight" 
                                        name="Pesée Réelle"
                                        stroke="#58cc02" 
                                        strokeWidth={4} 
                                        dot={{ fill: '#58cc02', r: 5, strokeWidth: 2, stroke: 'white' }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Deficit Chart */}
                    <div className="tasty-card p-4">
                        <div className="flex items-center gap-2 mb-4 font-extrabold text-lg text-text-dark">
                            <Flame className="text-main-orange" /> Évolution du Déficit
                        </div>
                        <div className="h-64 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.filter(d => d.hasCalorieLog)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff9600" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#ff9600" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                    <XAxis dataKey="label" tick={{ fill: "#afafaf", fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                                    <YAxis tick={{ fill: "#afafaf", fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickMargin={10} width={40} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#afafaf', marginBottom: '8px' }}
                                        formatter={(val: number) => [val > 0 ? `-${val} kcal (Déficit)` : `+${Math.abs(val)} kcal (Surplus)`, 'Bilan']}
                                    />
                                    <ReferenceLine y={0} stroke="#afafaf" strokeDasharray="3 3" />
                                    <Area 
                                        type="monotone" 
                                        dataKey="deficit" 
                                        stroke="#ff9600" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#deficitGradient)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* History Table */}
            <div className="tasty-card overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b-2 border-gray-200 flex items-center gap-2 font-extrabold text-text-dark">
                    <CalendarDays className="text-text-muted" /> Historique Brut
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-100 text-text-muted font-bold text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Poids (kg)</th>
                                <th className="px-4 py-3">Déficit (kcal)</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-text-dark divide-y-2 divide-gray-100">
                            {[...masterData].reverse().slice(0, 50).map((d) => (
                                <tr key={d.date} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4">{d.label}</td>
                                    <td className="px-4 py-4">
                                        {d.realWeight !== null ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-main-blue">{d.realWeight}</span>
                                                <button onClick={() => weightData.find(w => w.date === d.date) && handleDeleteWeight(weightData.find(w => w.date === d.date)!.id)} className="text-gray-300 hover:text-main-red transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                        {d.hasCalorieLog ? (
                                            <div className="flex items-center gap-2">
                                                <span className={d.deficit > 0 ? 'text-main-green' : d.deficit < 0 ? 'text-main-red' : 'text-text-dark'}>
                                                    {d.deficit > 0 ? `-${d.deficit}` : `+${Math.abs(d.deficit)}`}
                                                </span>
                                                <button onClick={() => calorieData.find(c => c.date === d.date) && handleDeleteCalorie(calorieData.find(c => c.date === d.date)!.id)} className="text-gray-300 hover:text-main-red transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {[...masterData].length === 0 && (
                        <div className="p-8 text-center text-text-muted font-bold">Aucune entrée trouvée.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
