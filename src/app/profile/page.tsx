"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { User, Target, Pencil, Check, X, Scale, Flame, Dumbbell } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type ProfileUser = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    height: number | null;
    createdAt: string;
};

type Goal = {
    id: number;
    target_weight: number;
    mode: string;
    initial_intensity: number;
    start_date: string;
    start_weight: number;
    active: boolean;
};

export default function ProfilePage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
    const [goal, setGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);

    const [editingProfile, setEditingProfile] = useState(false);
    const [editingGoal, setEditingGoal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [profileForm, setProfileForm] = useState({ name: "", height: "" });
    const [goalForm, setGoalForm] = useState({ target_weight: "", mode: "cut", initial_intensity: "" });

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/profile");
            if (!res.ok) return;
            const data = await res.json();
            setProfileUser(data.user);
            setGoal(data.goal);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.push("/login");
            return;
        }
        if (!isPending) fetchProfile();
    }, [isPending, session, router, fetchProfile]);

    const startEditProfile = () => {
        setProfileForm({
            name: profileUser?.name ?? "",
            height: profileUser?.height ? String(profileUser.height) : "",
        });
        setEditingProfile(true);
    };

    const startEditGoal = () => {
        if (!goal) return;
        setGoalForm({
            target_weight: String(goal.target_weight),
            mode: goal.mode,
            initial_intensity: String(Math.abs(goal.initial_intensity)),
        });
        setEditingGoal(true);
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profileForm.name,
                    height: profileForm.height ? Number(profileForm.height) : null,
                }),
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.user) setProfileUser(data.user);
            setEditingProfile(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const saveGoal = async () => {
        if (!goal) return;
        setSaving(true);
        const rawIntensity = Number(goalForm.initial_intensity);
        const intensity = goalForm.mode === "cut" ? -Math.abs(rawIntensity) : Math.abs(rawIntensity);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    target_weight: Number(goalForm.target_weight),
                    mode: goalForm.mode,
                    initial_intensity: intensity,
                }),
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.goal) setGoal(data.goal);
            setEditingGoal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const modeLabel = (mode: string) => mode === "cut" ? "Sèche" : "Prise de masse";
    const modeColor = (mode: string) => mode === "cut" ? "text-main-orange" : "text-main-green";
    const modeBg = (mode: string) => mode === "cut" ? "bg-main-orange/10" : "bg-main-green/10";

    if (loading || isPending) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-main-green border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const initials = profileUser?.name
        ? profileUser.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
        : "?";

    return (
        <div className="flex flex-col gap-6 w-full pb-8">
            <div className="text-center mt-2">
                <h1 className="text-2xl font-extrabold text-text-dark">Mon Profil</h1>
                <p className="text-text-muted font-bold">Tes données et objectifs</p>
            </div>

            {/* Profile card */}
            <div className="tasty-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-extrabold text-text-dark">
                        <User size={20} className="text-main-blue" />
                        Informations
                    </div>
                    {!editingProfile && (
                        <button
                            onClick={startEditProfile}
                            className="flex items-center gap-1.5 text-sm font-bold text-main-blue hover:opacity-80 transition-opacity"
                        >
                            <Pencil size={15} strokeWidth={2.5} />
                            Modifier
                        </button>
                    )}
                </div>

                {/* Avatar + identity */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-main-blue flex items-center justify-center text-white text-xl font-extrabold shrink-0">
                        {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-text-dark text-lg truncate">{profileUser?.name}</span>
                        <span className="text-text-muted font-bold text-sm truncate">{profileUser?.email}</span>
                        {profileUser?.createdAt && (
                            <span className="text-text-muted font-bold text-xs mt-0.5">
                                Membre depuis {format(parseISO(profileUser.createdAt), "MMMM yyyy", { locale: fr })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Edit form */}
                {editingProfile ? (
                    <div className="flex flex-col gap-3 mt-1">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nom</label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                className="border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-text-dark focus:outline-none focus:border-main-blue transition-colors"
                                placeholder="Ton prénom"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Taille (cm)</label>
                            <input
                                type="number"
                                value={profileForm.height}
                                onChange={e => setProfileForm(f => ({ ...f, height: e.target.value }))}
                                className="border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-text-dark focus:outline-none focus:border-main-blue transition-colors"
                                placeholder="Ex : 175"
                                min={100}
                                max={250}
                            />
                        </div>
                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={saveProfile}
                                disabled={saving}
                                className="tasty-button tasty-button-green flex-1 py-3 gap-2"
                            >
                                <Check size={18} strokeWidth={2.5} />
                                Enregistrer
                            </button>
                            <button
                                onClick={() => setEditingProfile(false)}
                                className="tasty-button tasty-button-gray px-5 py-3"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Scale size={18} className="text-text-muted shrink-0" strokeWidth={2.5} />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Taille</span>
                            <span className="font-extrabold text-text-dark">
                                {profileUser?.height ? `${profileUser.height} cm` : "Non renseignée"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Goal card */}
            <div className="tasty-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-extrabold text-text-dark">
                        <Target size={20} className="text-main-green" />
                        Objectif actif
                    </div>
                    {!editingGoal && goal && (
                        <button
                            onClick={startEditGoal}
                            className="flex items-center gap-1.5 text-sm font-bold text-main-blue hover:opacity-80 transition-opacity"
                        >
                            <Pencil size={15} strokeWidth={2.5} />
                            Modifier
                        </button>
                    )}
                </div>

                {!goal ? (
                    <div className="text-center py-4 text-text-muted font-bold">
                        Aucun objectif actif.
                    </div>
                ) : editingGoal ? (
                    <div className="flex flex-col gap-3">
                        {/* Mode selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: "cut", label: "Sèche", icon: Flame, color: "text-main-orange", bg: "bg-main-orange/10", border: "border-main-orange" },
                                    { value: "bulk", label: "Prise de masse", icon: Dumbbell, color: "text-main-green", bg: "bg-main-green/10", border: "border-main-green" },
                                ].map(opt => {
                                    const Icon = opt.icon;
                                    const selected = goalForm.mode === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setGoalForm(f => ({ ...f, mode: opt.value }))}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-bold transition-all ${selected ? `${opt.border} ${opt.bg} ${opt.color}` : "border-gray-200 text-text-muted hover:border-gray-300"}`}
                                        >
                                            <Icon size={22} strokeWidth={2.5} />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Poids cible (kg)</label>
                            <input
                                type="number"
                                value={goalForm.target_weight}
                                onChange={e => setGoalForm(f => ({ ...f, target_weight: e.target.value }))}
                                className="border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-text-dark focus:outline-none focus:border-main-blue transition-colors"
                                placeholder="Ex : 75"
                                step={0.1}
                                min={30}
                                max={300}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                {goalForm.mode === "cut" ? "Déficit" : "Surplus"} journalier (kcal)
                            </label>
                            <input
                                type="number"
                                value={goalForm.initial_intensity}
                                onChange={e => setGoalForm(f => ({ ...f, initial_intensity: e.target.value }))}
                                className="border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-text-dark focus:outline-none focus:border-main-blue transition-colors"
                                placeholder={goalForm.mode === "cut" ? "Ex : 200" : "Ex : 100"}
                                min={0}
                                max={1000}
                            />
                        </div>

                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={saveGoal}
                                disabled={saving}
                                className="tasty-button tasty-button-green flex-1 py-3 gap-2"
                            >
                                <Check size={18} strokeWidth={2.5} />
                                Enregistrer
                            </button>
                            <button
                                onClick={() => setEditingGoal(false)}
                                className="tasty-button tasty-button-gray px-5 py-3"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* Mode badge */}
                        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${modeBg(goal.mode)}`}>
                            {goal.mode === "cut"
                                ? <Flame size={20} className="text-main-orange" strokeWidth={2.5} />
                                : <Dumbbell size={20} className="text-main-green" strokeWidth={2.5} />
                            }
                            <span className={`font-extrabold text-lg ${modeColor(goal.mode)}`}>
                                {modeLabel(goal.mode)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Poids départ</span>
                                <span className="font-extrabold text-text-dark text-lg">{goal.start_weight} kg</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Poids cible</span>
                                <span className="font-extrabold text-text-dark text-lg">{goal.target_weight} kg</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                    {goal.mode === "cut" ? "Déficit/jour" : "Surplus/jour"}
                                </span>
                                <span className={`font-extrabold text-lg ${goal.mode === "cut" ? "text-main-orange" : "text-main-green"}`}>
                                    {goal.mode === "cut" ? "−" : "+"}{Math.abs(goal.initial_intensity)} kcal
                                </span>
                            </div>
                            <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Depuis</span>
                                <span className="font-extrabold text-text-dark">
                                    {format(parseISO(goal.start_date), "dd MMM yyyy", { locale: fr })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
