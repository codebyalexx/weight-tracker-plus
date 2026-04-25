"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";

const STORAGE_KEY = "kcalm_onboarding_v1";

export default function OnboardingCompletePage() {
    const router = useRouter();

    useEffect(() => {
        const complete = async () => {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                router.replace("/");
                return;
            }

            try {
                const data = JSON.parse(raw);

                // After OAuth redirect, the session cookie may not be readable
                // by the server immediately — poll until the session is confirmed.
                let sessionEstablished = false;
                for (let i = 0; i < 8; i++) {
                    const session = await getSession();
                    if (session?.data?.user?.id) {
                        sessionEstablished = true;
                        break;
                    }
                    await new Promise((r) => setTimeout(r, 500));
                }

                if (!sessionEstablished) {
                    router.replace("/login");
                    return;
                }

                const res = await fetch("/api/onboarding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                if (res.ok) {
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    console.error("Onboarding API error:", res.status, await res.text());
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
