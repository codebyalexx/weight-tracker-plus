import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const entries = await prisma.weightEntry.findMany({
            where: { user_id: auth.userId },
            orderBy: { date: "asc" },
        });
        return NextResponse.json(entries);
    } catch (error) {
        console.error("Error fetching weight entries:", error);
        return NextResponse.json(
            { error: "Failed to fetch weight entries" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const { date, weight } = body;

        if (!date || weight === undefined || weight === null) {
            return NextResponse.json(
                { error: "Date and weight are required" },
                { status: 400 }
            );
        }

        const entry = await prisma.weightEntry.upsert({
            where: { user_id_date: { user_id: auth.userId, date } },
            update: { weight: Number(weight) },
            create: {
                user_id: auth.userId,
                date,
                weight: Number(weight),
            },
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error("Error saving weight entry:", error);
        return NextResponse.json(
            { error: "Failed to save weight entry" },
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

        await prisma.weightEntry.deleteMany({
            where: { id: Number(id), user_id: auth.userId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting weight entry:", error);
        return NextResponse.json(
            { error: "Failed to delete weight entry" },
            { status: 500 }
        );
    }
}
