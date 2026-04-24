"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const STORAGE_KEY = "kcalm_onboarding_v1";

export default function OnboardingCompletePage() {
    const router = useRouter();

    useEffect(() => {
        const complete = async () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const data = JSON.parse(raw);
                    await fetch("/api/onboarding", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                    });
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (err) {
                console.error("Onboarding completion error:", err);
            }
            router.replace("/");
        };

        complete();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
            <Image src="/logo.svg" alt="Kcalm" width={64} height={64} className="object-contain" />
            <div className="flex flex-col items-center gap-2">
                <p className="font-extrabold text-text-dark text-xl">Création de ton profil…</p>
                <p className="text-text-muted font-bold text-sm">On prépare tout pour toi ✨</p>
            </div>
        </div>
    );
}
