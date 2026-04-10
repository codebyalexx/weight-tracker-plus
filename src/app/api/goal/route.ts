import { getDb, GoalRow } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch the active goal (or all goals)
export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") !== "false";

        if (activeOnly) {
            const goal = db
                .prepare("SELECT * FROM goals WHERE active = 1 ORDER BY created_at DESC LIMIT 1")
                .get() as GoalRow | undefined;
            return NextResponse.json(goal ?? null);
        } else {
            const goals = db
                .prepare("SELECT * FROM goals ORDER BY created_at DESC")
                .all();
            return NextResponse.json(goals);
        }
    } catch (error) {
        console.error("Error fetching goals:", error);
        return NextResponse.json(
            { error: "Failed to fetch goals" },
            { status: 500 }
        );
    }
}

// POST: Create a new goal (deactivates existing ones)
export async function POST(request: NextRequest) {
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

        // Validate intensity bounds
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

        const db = getDb();

        // Deactivate all existing goals
        db.prepare("UPDATE goals SET active = 0, updated_at = datetime('now')").run();

        // Create new goal
        const stmt = db.prepare(`
      INSERT INTO goals (target_weight, mode, initial_intensity, start_date, start_weight, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

        const result = stmt.run(target_weight, mode, initial_intensity, start_date, start_weight);

        const goal = db
            .prepare("SELECT * FROM goals WHERE id = ?")
            .get(result.lastInsertRowid) as GoalRow;

        return NextResponse.json(goal, { status: 201 });
    } catch (error) {
        console.error("Error creating goal:", error);
        return NextResponse.json(
            { error: "Failed to create goal" },
            { status: 500 }
        );
    }
}

// DELETE: Deactivate or delete a goal
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
        db.prepare("UPDATE goals SET active = 0, updated_at = datetime('now') WHERE id = ?").run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting goal:", error);
        return NextResponse.json(
            { error: "Failed to delete goal" },
            { status: 500 }
        );
    }
}
