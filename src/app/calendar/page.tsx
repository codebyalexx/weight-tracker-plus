"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isFuture } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalorieEntry, GoalType } from "@/lib/db";
import Link from "next/link";

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

export default function CalendarPage() {
    const [calorieData, setCalorieData] = useState<CalorieEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchData = useCallback(async () => {
        try {
            const c = await fetch("/api/calories").then(r => r.json());
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

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getDayColor = (dateObj: Date) => {
        if (!isSameMonth(dateObj, currentMonth)) return "bg-gray-50 border-gray-100 text-gray-300 pointer-events-none";

        const dateStr = format(dateObj, "yyyy-MM-dd");
        const entry = calorieData.find(c => c.date === dateStr);
        
        if (isFuture(dateObj) && !isToday(dateObj)) return "bg-main-gray border-main-gray-shadow text-text-muted";
        if (!entry) return "bg-main-red border-main-red-shadow text-white";

        const deficit = entry.calories_burned - entry.calories_consumed;
        const status = getGoalStatus(deficit, entry.goal as GoalType);
        
        if (status === "positive" || status === "warning") {
            return status === "positive" ? "bg-main-green border-main-green-shadow text-white" : "bg-main-orange border-main-orange-shadow text-white";
        }
        return "bg-main-orange border-main-orange-shadow text-white";
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-main-green border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col gap-6 w-full pb-8">
            <h1 className="text-2xl font-extrabold text-text-dark text-center mt-2">Calendrier</h1>
            <p className="text-text-muted font-bold text-center -mt-4 mb-4">Ton historique mois par mois</p>

            <div className="tasty-card p-4">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={prevMonth} className="p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100">
                        <ChevronLeft size={24} className="text-text-dark" strokeWidth={3} />
                    </button>
                    <h2 className="text-xl font-extrabold text-text-dark capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: fr })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100" disabled={isFuture(addMonths(currentMonth, 1))}>
                        <ChevronRight size={24} className={`stroke-[3px] ${isFuture(addMonths(currentMonth, 1)) ? 'text-gray-300' : 'text-text-dark'}`} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
                        <div key={i} className="text-center font-bold text-sm text-text-muted uppercase">{day}</div>
                    ))}
                    
                    {/* Add empty spots for days before start of month */}
                    {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-14"></div>
                    ))}
                    
                    {days.map(d => {
                        const colorClass = getDayColor(d);
                        const isCurrentDay = isToday(d);
                        return (
                            <Link 
                                href={`/?date=${format(d, "yyyy-MM-dd")}`}
                                key={d.toISOString()}
                                className={`flex items-center justify-center h-14 rounded-xl border-b-4 ${colorClass} ${isCurrentDay ? 'ring-2 ring-offset-2 ring-main-blue' : ''}`}
                            >
                                <span className="font-extrabold">{format(d, "d")}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
            
            <div className="mt-2 text-center text-sm font-bold text-text-muted">
                <div className="flex items-center justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-main-green"></div> Objectif Vise</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-main-orange"></div> Objectif Rate</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-main-red"></div> Manquant</div>
                </div>
            </div>
        </div>
    );
}
