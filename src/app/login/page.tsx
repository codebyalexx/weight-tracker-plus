"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="flex flex-col gap-6 items-center pt-4">
            <div className="flex flex-col items-center gap-2">
                <Image src="/logo.svg" alt="Kcalm" width={56} height={56} className="object-contain" />
                <h1 className="text-3xl font-extrabold text-text-dark">Bon retour !</h1>
                <p className="text-text-muted font-bold text-center">Connecte-toi pour continuer ton aventure.</p>
            </div>

            <form onSubmit={onSubmit} className="tasty-card p-6 flex flex-col gap-4 w-full">
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
                    disabled={loading}
                    className="tasty-button tasty-button-blue w-full py-4 text-lg mt-2 disabled:opacity-60"
                >
                    <LogIn size={18} className="mr-2" strokeWidth={3} />
                    {loading ? "Connexion…" : "Se connecter"}
                </button>
            </form>

            <p className="text-text-muted font-bold text-sm">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-main-blue underline">
                    Inscris-toi
                </Link>
            </p>
        </div>
    );
}
