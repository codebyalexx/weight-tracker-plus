"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Mail, Lock, LogIn, Sparkles } from "lucide-react";

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

export default function LoginPage() {
    const router = useRouter();
    const [view, setView] = useState<"choice" | "login">("choice");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await signIn.email({
                email,
                password,
                callbackURL: "/",
            });
            if (result.error) {
                setError(result.error.message ?? "Email ou mot de passe incorrect");
                setLoading(false);
                return;
            }
            router.push("/");
            router.refresh();
        } catch (err) {
            console.error(err);
            setError("Impossible de se connecter");
            setLoading(false);
        }
    };

    const onGoogleSignIn = async () => {
        setError(null);
        setGoogleLoading(true);
        try {
            await signIn.social({ provider: "google", callbackURL: "/" });
        } catch (err) {
            console.error(err);
            setError("Connexion Google impossible");
            setGoogleLoading(false);
        }
    };

    if (view === "choice") {
        return (
            <div className="flex flex-col gap-8 items-center pt-6">
                <div className="flex flex-col items-center gap-3">
                    <Image src="/logo.svg" alt="Kcalm" width={64} height={64} className="object-contain" />
                    <h1 className="text-3xl font-extrabold text-text-dark text-center">Bienvenue sur Kcalm !</h1>
                    <p className="text-text-muted font-bold text-center text-sm">
                        Ton compagnon pour un rapport sain à la nourriture.
                    </p>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/onboarding")}
                        className="tasty-button tasty-button-green w-full py-5 text-lg cursor-pointer"
                    >
                        <Sparkles size={20} className="mr-2" strokeWidth={3} />
                        Je suis nouveau
                    </button>
                    <button
                        onClick={() => setView("login")}
                        className="tasty-button tasty-button-blue w-full py-5 text-lg"
                    >
                        <LogIn size={20} className="mr-2" strokeWidth={3} />
                        Je suis déjà membre
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 items-center pt-4">
            <div className="flex flex-col items-center gap-2">
                <Image src="/logo.svg" alt="Kcalm" width={56} height={56} className="object-contain" />
                <h1 className="text-3xl font-extrabold text-text-dark">Bon retour !</h1>
                <p className="text-text-muted font-bold text-center">Connecte-toi pour continuer ton aventure.</p>
            </div>

            <div className="tasty-card p-6 flex flex-col gap-4 w-full">
                <button
                    type="button"
                    onClick={onGoogleSignIn}
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

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="font-bold text-text-dark text-sm mb-1 flex items-center gap-2">
                            <Mail size={16} /> Email
                        </label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-blue bg-gray-50"
                            placeholder="toi@example.com"
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="font-bold text-text-dark text-sm mb-1 flex items-center gap-2">
                            <Lock size={16} /> Mot de passe
                        </label>
                        <input
                            required
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-blue bg-gray-50"
                            placeholder="••••••••"
                            autoComplete="current-password"
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
                        className="tasty-button tasty-button-blue w-full py-4 text-lg mt-2 disabled:opacity-60"
                    >
                        <LogIn size={18} className="mr-2" strokeWidth={3} />
                        {loading ? "Connexion…" : "Se connecter"}
                    </button>
                </form>
            </div>

            <button
                onClick={() => setView("choice")}
                className="text-text-muted font-bold text-sm underline"
            >
                ← Retour
            </button>
        </div>
    );
}
