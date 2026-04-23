import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") !== "false";

        if (activeOnly) {
            const goal = await prisma.goal.findFirst({
                where: { user_id: auth.userId, active: true },
                orderBy: { created_at: "desc" },
            });
            return NextResponse.json(goal ?? null);
        }

        const goals = await prisma.goal.findMany({
            where: { user_id: auth.userId },
            orderBy: { created_at: "desc" },
        });
        return NextResponse.json(goals);
    } catch (error) {
        console.error("Error fetching goals:", error);
        return NextResponse.json(
            { error: "Failed to fetch goals" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const { target_weight, mode, initial_intensity, start_date, start_weight } = body;

        if (!target_weight || !mode || !initial_intensity || !start_date || !start_weight) {
            return NextResponse.json(
                { error: "All fields are required: target_weight, mode, initial_intensity, start_date, start_weight" },
                { status: 400 }
            );
        }

        if (!["cut", "bulk"].includes(mode)) {
            return NextResponse.json(
                { error: "Mode must be 'cut' or 'bulk'" },
                { status: 400 }
            );
        }

        if (mode === "cut" && (initial_intensity > -300 || initial_intensity < -1000)) {
            return NextResponse.json(
                { error: "Deficit must be between -300 and -1000 kcal/day" },
                { status: 400 }
            );
        }
        if (mode === "bulk" && (initial_intensity < 200 || initial_intensity > 500)) {
            return NextResponse.json(
                { error: "Surplus must be between +200 and +500 kcal/day" },
                { status: 400 }
            );
        }

        const goal = await prisma.$transaction(async (tx) => {
            await tx.goal.updateMany({
                where: { user_id: auth.userId, active: true },
                data: { active: false },
            });
            return tx.goal.create({
                data: {
                    user_id: auth.userId,
                    target_weight: Number(target_weight),
                    mode,
                    initial_intensity: Number(initial_intensity),
                    start_date,
                    start_weight: Number(start_weight),
                    active: true,
                },
            });
        });

        return NextResponse.json(goal, { status: 201 });
    } catch (error) {
        console.error("Error creating goal:", error);
        return NextResponse.json(
            { error: "Failed to create goal" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "ID is required" },
                { status: 400 }
            );
        }

        await prisma.goal.updateMany({
            where: { id: Number(id), user_id: auth.userId },
            data: { active: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting goal:", error);
        return NextResponse.json(
            { error: "Failed to delete goal" },
            { status: 500 }
        );
    }
}
