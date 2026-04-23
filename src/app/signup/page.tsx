"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await signUp.email({
                email,
                password,
                name,
                callbackURL: "/",
            });
            if (result.error) {
                setError(result.error.message ?? "Inscription impossible");
                setLoading(false);
                return;
            }
            router.push("/");
            router.refresh();
        } catch (err) {
            console.error(err);
            setError("Inscription impossible");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 items-center pt-4">
            <div className="flex flex-col items-center gap-2">
                <Image src="/logo.svg" alt="Kcalm" width={56} height={56} className="object-contain" />
                <h1 className="text-3xl font-extrabold text-text-dark">Bienvenue !</h1>
                <p className="text-text-muted font-bold text-center">Crée ton compte pour démarrer ton aventure.</p>
            </div>

            <form onSubmit={onSubmit} className="tasty-card p-6 flex flex-col gap-4 w-full">
                <div>
                    <label className="font-bold text-text-dark text-sm mb-1 flex items-center gap-2">
                        <UserIcon size={16} /> Nom
                    </label>
                    <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:outline-none focus:border-main-green bg-gray-50"
                        placeholder="Ton nom"
                        autoComplete="name"
                    />
                </div>
                <div>
                    <label className="font-bold text-text-dark text-sm mb-1 flex items-center gap-2">
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
                    <label className="font-bold text-text-dark text-sm mb-1 flex items-center gap-2">
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
                    disabled={loading}
                    className="tasty-button tasty-button-green w-full py-4 text-lg mt-2 disabled:opacity-60"
                >
                    <Sparkles size={18} className="mr-2" strokeWidth={3} />
                    {loading ? "Création…" : "Créer mon compte"}
                </button>
            </form>

            <p className="text-text-muted font-bold text-sm">
                Tu as déjà un compte ?{" "}
                <Link href="/login" className="text-main-blue underline">
                    Connecte-toi
                </Link>
            </p>
        </div>
    );
}
