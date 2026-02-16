import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const db = getDb();
        const entries = db
            .prepare("SELECT * FROM weight_entries ORDER BY date ASC")
            .all();
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
    try {
        const body = await request.json();
        const { date, weight } = body;

        if (!date || weight === undefined || weight === null) {
            return NextResponse.json(
                { error: "Date and weight are required" },
                { status: 400 }
            );
        }

        const db = getDb();
        const stmt = db.prepare(`
      INSERT INTO weight_entries (date, weight, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        weight = excluded.weight,
        updated_at = datetime('now')
    `);

        stmt.run(date, weight);

        const entry = db
            .prepare("SELECT * FROM weight_entries WHERE date = ?")
            .get(date);

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
        db.prepare("DELETE FROM weight_entries WHERE id = ?").run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting weight entry:", error);
        return NextResponse.json(
            { error: "Failed to delete weight entry" },
            { status: 500 }
        );
    }
}
