import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const entries = await prisma.calorieEntry.findMany({
            where: { user_id: auth.userId },
            orderBy: { date: "asc" },
        });
        return NextResponse.json(entries);
    } catch (error) {
        console.error("Error fetching calorie entries:", error);
        return NextResponse.json(
            { error: "Failed to fetch calorie entries" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const { date, calories_consumed, calories_burned, goal } = body;

        if (!date || calories_consumed === undefined || calories_burned === undefined) {
            return NextResponse.json(
                { error: "Date, calories_consumed, and calories_burned are required" },
                { status: 400 }
            );
        }

        const validGoal = ["deficit", "maintenance", "bulk"].includes(goal) ? goal : "deficit";

        const entry = await prisma.calorieEntry.upsert({
            where: { user_id_date: { user_id: auth.userId, date } },
            update: {
                calories_consumed: Number(calories_consumed),
                calories_burned: Number(calories_burned),
                goal: validGoal,
            },
            create: {
                user_id: auth.userId,
                date,
                calories_consumed: Number(calories_consumed),
                calories_burned: Number(calories_burned),
                goal: validGoal,
            },
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error("Error saving calorie entry:", error);
        return NextResponse.json(
            { error: "Failed to save calorie entry" },
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

        await prisma.calorieEntry.deleteMany({
            where: { id: Number(id), user_id: auth.userId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting calorie entry:", error);
        return NextResponse.json(
            { error: "Failed to delete calorie entry" },
            { status: 500 }
        );
    }
}
