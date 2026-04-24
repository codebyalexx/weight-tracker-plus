import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const { currentWeight, targetWeight, mode } = body;

        if (!currentWeight || !mode) {
            return NextResponse.json(
                { error: "currentWeight and mode are required" },
                { status: 400 }
            );
        }

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        await prisma.weightEntry.upsert({
            where: { user_id_date: { user_id: auth.userId, date: yesterday } },
            create: { user_id: auth.userId, date: yesterday, weight: Number(currentWeight) },
            update: { weight: Number(currentWeight) },
        });

        if (mode !== "maintain") {
            if (!targetWeight) {
                return NextResponse.json(
                    { error: "targetWeight is required for cut/bulk" },
                    { status: 400 }
                );
            }

            const intensity = mode === "cut" ? -200 : 100;

            await prisma.$transaction(async (tx) => {
                await tx.goal.updateMany({
                    where: { user_id: auth.userId, active: true },
                    data: { active: false },
                });
                await tx.goal.create({
                    data: {
                        user_id: auth.userId,
                        target_weight: Number(targetWeight),
                        mode: mode === "cut" ? "cut" : "bulk",
                        initial_intensity: intensity,
                        start_date: today,
                        start_weight: Number(currentWeight),
                        active: true,
                    },
                });
            });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json(
            { error: "Failed to save onboarding data" },
            { status: 500 }
        );
    }
}
