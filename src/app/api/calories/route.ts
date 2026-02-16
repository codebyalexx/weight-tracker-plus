import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const db = getDb();
        const entries = db
            .prepare("SELECT * FROM calorie_entries ORDER BY date ASC")
            .all();
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
    try {
        const body = await request.json();
        const { date, calories_consumed, calories_burned } = body;

        if (!date || calories_consumed === undefined || calories_burned === undefined) {
            return NextResponse.json(
                { error: "Date, calories_consumed, and calories_burned are required" },
                { status: 400 }
            );
        }

        const db = getDb();
        const stmt = db.prepare(`
      INSERT INTO calorie_entries (date, calories_consumed, calories_burned, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        calories_consumed = excluded.calories_consumed,
        calories_burned = excluded.calories_burned,
        updated_at = datetime('now')
    `);

        stmt.run(date, calories_consumed, calories_burned);

        const entry = db
            .prepare("SELECT * FROM calorie_entries WHERE date = ?")
            .get(date);

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
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "ID is required" },
                { status: 400 }
            );
        }

        const db = getDb();
        db.prepare("DELETE FROM calorie_entries WHERE id = ?").run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting calorie entry:", error);
        return NextResponse.json(
            { error: "Failed to delete calorie entry" },
            { status: 500 }
        );
    }
}
