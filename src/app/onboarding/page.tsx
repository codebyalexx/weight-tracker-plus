"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { Scale, User as UserIcon, Target, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

const STORAGE_KEY = "kcalm_onboarding_v1";
const KCAL_PER_KG = 7700;

type Mode = "cut" | "maintain" | "bulk";

function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex gap-1.5 w-full">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        i < current ? "bg-main-green" : "bg-main-gray"
                    }`}
                />
            ))}
        </div>
    );
}

function estimateTime(diff: number, mode: Mode): string {
    if (mode === "maintain" || diff <= 0) return "";
    const intensity = mode === "cut" ? 200 : 100;
    const days = Math.ceil((diff * KCAL_PER_KG) / intensity);
    const weeks = Math.round(days / 7);
    if (weeks <= 1) return "moins d'une semaine";
    if (weeks <= 16) return `environ ${weeks} semaine${weeks > 1 ? "s" : ""}`;
    const months = Math.round(days / 30);
    return `environ ${months} mois`;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    const [currentWeight, setCurrentWeight] = useState("");
    const [age, setAge] = useState("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [targetWeight, setTargetWeight] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const cw = parseFloat(currentWeight) || 0;
    const tw = parseFloat(targetWeight) || 0;
    const diff = Math.abs(tw - cw);
    const timeEstimate = mode && mode !== "maintain" ? estimateTime(diff, mode) : "";

    const step1Valid = currentWeight && age && parseFloat(currentWeight) > 0 && parseInt(age) > 0;
    const step2Valid =
        mode !== null &&
        (mode === "maintain" || (targetWeight && parseFloat(targetWeight) > 0));

    const getPayload = () => ({
        currentWeight: cw,
        targetWeight: mode === "maintain" ? cw : tw,
        mode: mode!,
    });

    const saveToStorage = () =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getPayload()));

    const handleGoogleSignUp = async () => {
        saveToStorage();
        setGoogleLoading(true);
        try {
            await signIn.social({ provider: "google", callbackURL: "/onboarding/complete" });
        } catch (err) {
            console.error(err);
            setError("Connexion Google impossible");
            setGoogleLoading(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        saveToStorage();
        try {
            const result = await signUp.email({ email, password, name, callbackURL: "/" });
            if (result.error) {
                setError(result.error.message ?? "Inscription impossible");
                setLoading(false);
                return;
            }
            await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(getPayload()),
            });
            localStorage.removeItem(STORAGE_KEY);
            router.push("/");
            router.refresh();
        } catch (err) {
            console.error(err);
            setError("Inscription impossible");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 items-center pt-2">
            <div className="w-full flex flex-col items-center gap-3">
                <Image src="/logo.svg" alt="Kcalm" width={48} height={48} className="object-contain" />
                <ProgressBar current={step} total={4} />
            </div>

            {/* Step 1 — Poids & âge */}
            {step === 1 && (
                <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-extrabold text-text-dark">Par où commencer ?</h1>
                        <p className="text-text-muted font-bold text-sm">
                            On a besoin de quelques infos pour personnaliser ton expérience.
                        </p>
                    </div>

                    <div className="tasty-card p-5 flex flex-col gap-4">
                        <div>
                            <label className="font-bold text-text-dark text-sm mb-1.5 flex items-center gap-2">
                                <Scale size={16} /> Ton poids actuel
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="30"
                                    max="300"
                                    value={currentWeight}
                                    onChange={(e) => setCurrentWeight(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 pr-12 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder="75.0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                                    kg
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-text-dark text-sm mb-1.5 flex items-center gap-2">
                                <UserIcon size={16} /> Ton âge
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="10"
                                    max="100"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 pr-14 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder="28"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                                    ans
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={!step1Valid}
                        onClick={() => setStep(2)}
                        className="tasty-button tasty-button-green w-full py-4 text-lg disabled:opacity-40"
                    >
                        Continuer <ArrowRight size={18} className="ml-2" strokeWidth={3} />
                    </button>
                </div>
            )}

            {/* Step 2 — Objectif */}
            {step === 2 && (
                <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-extrabold text-text-dark">Quel est ton objectif ?</h1>
                        <p className="text-text-muted font-bold text-sm">
                            Choisis le programme qui te correspond.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {(
                            [
                                {
                                    value: "cut" as Mode,
                                    emoji: "🔥",
                                    label: "Perdre du poids",
                                    selectedClass: "border-main-orange bg-orange-50",
                                },
                                {
                                    value: "maintain" as Mode,
                                    emoji: "⚖️",
                                    label: "Maintenir mon poids",
                                    selectedClass: "border-main-blue bg-blue-50",
                                },
                                {
                                    value: "bulk" as Mode,
                                    emoji: "💪",
                                    label: "Prendre du poids",
                                    selectedClass: "border-main-green bg-green-50",
                                },
                            ] as const
                        ).map(({ value, emoji, label, selectedClass }) => (
                            <button
                                key={value}
                                onClick={() => setMode(value)}
                                className={`w-full border-2 rounded-2xl p-4 flex items-center gap-3 font-bold text-text-dark text-left transition-all cursor-pointer ${
                                    mode === value
                                        ? selectedClass
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                                <span className="text-2xl">{emoji}</span>
                                <span className="text-base">{label}</span>
                                {mode === value && (
                                    <span className="ml-auto text-main-green font-extrabold">✓</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {mode && mode !== "maintain" && (
                        <div className="tasty-card p-5">
                            <label className="font-bold text-text-dark text-sm mb-2 flex items-center gap-2">
                                <Target size={16} /> Ton poids cible
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="30"
                                    max="300"
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 pr-12 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder={mode === "cut" ? "70.0" : "80.0"}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                                    kg
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="tasty-button tasty-button-gray py-3 px-5 text-lg"
                        >
                            ←
                        </button>
                        <button
                            disabled={!step2Valid}
                            onClick={() => setStep(3)}
                            className="tasty-button tasty-button-green flex-1 py-4 text-lg disabled:opacity-40"
                        >
                            Continuer <ArrowRight size={18} className="ml-2" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3 — Plan récapitulatif */}
            {step === 3 && (
                <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-extrabold text-text-dark">Ton plan personnalisé ✨</h1>
                        <p className="text-text-muted font-bold text-sm">Conçu pour être sain et durable.</p>
                    </div>

                    <div className="tasty-card p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">
                                {mode === "cut" ? "🔥" : mode === "bulk" ? "💪" : "⚖️"}
                            </span>
                            <div>
                                <p className="font-extrabold text-text-dark text-xl">
                                    {mode === "cut"
                                        ? "Sèche douce"
                                        : mode === "bulk"
                                        ? "Prise de masse"
                                        : "Maintien"}
                                </p>
                                {mode !== "maintain" && (
                                    <p className="text-text-muted font-bold text-sm">
                                        {currentWeight} kg → {targetWeight} kg
                                    </p>
                                )}
                            </div>
                        </div>

                        {mode !== "maintain" && (
                            <>
                                <div className="h-[2px] bg-main-gray rounded-full" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-text-muted text-sm">Objectif calorique</span>
                                    <span
                                        className={`font-extrabold text-lg ${
                                            mode === "cut" ? "text-main-orange" : "text-main-green"
                                        }`}
                                    >
                                        {mode === "cut" ? "−200 kcal/jour" : "+100 kcal/jour"}
                                    </span>
                                </div>
                                {timeEstimate && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-text-muted text-sm">Estimation</span>
                                        <span className="font-extrabold text-text-dark">{timeEstimate}</span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="h-[2px] bg-main-gray rounded-full" />
                        <p className="text-text-muted font-bold text-xs leading-relaxed">
                            🌱 Ce programme préserve ta santé mentale et ton rapport à la nourriture. Un
                            petit pas chaque jour vaut mieux qu'un sprint épuisant.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="tasty-button tasty-button-gray py-3 px-5 text-lg"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => setStep(4)}
                            className="tasty-button tasty-button-green flex-1 py-4 text-lg"
                        >
                            Créer mon compte <ArrowRight size={18} className="ml-2" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4 — Inscription */}
            {step === 4 && (
                <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-extrabold text-text-dark">Plus qu'une étape !</h1>
                        <p className="text-text-muted font-bold text-sm">
                            Crée ton compte pour démarrer l'aventure.
                        </p>
                    </div>

                    <div className="tasty-card p-6 flex flex-col gap-4">
                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
                            disabled={googleLoading || loading}
                            className="w-full flex items-center justify-center gap-3 border-2 border-main-gray rounded-xl py-3 px-4 font-bold text-text-dark bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all disabled:opacity-60 cursor-pointer"
                        >
                            <GoogleIcon />
                            {googleLoading ? "Redirection…" : "Continuer avec Google"}
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-[2px] bg-main-gray rounded-full" />
                            <span className="text-text-muted font-bold text-sm">ou</span>
                            <div className="flex-1 h-[2px] bg-main-gray rounded-full" />
                        </div>

                        <form onSubmit={handleEmailSignUp} className="flex flex-col gap-3">
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1.5 flex items-center gap-2">
                                    <UserIcon size={16} /> Ton prénom
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder="Ton prénom"
                                    autoComplete="name"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1.5 flex items-center gap-2">
                                    <Mail size={16} /> Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder="toi@example.com"
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-text-dark text-sm mb-1.5 flex items-center gap-2">
                                    <Lock size={16} /> Mot de passe
                                </label>
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                                    placeholder="8 caractères minimum"
                                    autoComplete="new-password"
                                    minLength={8}
                                />
                            </div>

                            {error && (
                                <div className="bg-main-red/10 border-2 border-main-red text-main-red rounded-xl p-3 font-bold text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || googleLoading}
                                className="tasty-button tasty-button-green w-full py-4 text-lg mt-1 disabled:opacity-60"
                            >
                                <Sparkles size={18} className="mr-2" strokeWidth={3} />
                                {loading ? "Création…" : "C'est parti !"}
                            </button>
                        </form>
                    </div>

                    <button
                        onClick={() => setStep(3)}
                        className="tasty-button tasty-button-gray py-3 px-5 text-lg self-start"
                    >
                        ←
                    </button>
                </div>
            )}
        </div>
    );
}
