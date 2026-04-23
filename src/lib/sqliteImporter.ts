import type { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export interface ImportSummary {
    weightEntries: number;
    calorieEntries: number;
    goals: number;
    skippedWeight: number;
    skippedCalorie: number;
}

interface SqliteWeightRow {
    id: number;
    date: string;
    weight: number;
    created_at: string | null;
    updated_at: string | null;
}

interface SqliteCalorieRow {
    id: number;
    date: string;
    calories_consumed: number;
    calories_burned: number;
    goal: string | null;
    created_at: string | null;
    updated_at: string | null;
}

interface SqliteGoalRow {
    id: number;
    target_weight: number;
    mode: string;
    initial_intensity: number;
    start_date: string;
    start_weight: number;
    active: number;
    created_at: string | null;
    updated_at: string | null;
}

function parseSqliteDate(value: string | null | undefined): Date | undefined {
    if (!value) return undefined;
    // SQLite stores datetimes in local ISO-ish format e.g. "2025-04-10 14:23:11"
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeGoal(goal: string | null | undefined): "deficit" | "maintenance" | "bulk" {
    if (goal === "maintenance" || goal === "bulk") return goal;
    return "deficit";
}

/**
 * Imports the contents of a legacy SQLite DB into the Postgres DB, assigning
 * every row to the supplied user. Existing rows for (user_id, date) are kept —
 * only new entries are inserted.
 *
 * The connection is opened read-only so we never mutate the source file.
 */
export async function importSqliteIntoUser(
    prisma: PrismaClient,
    sqlitePath: string,
    userId: string
): Promise<ImportSummary> {
    const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });

    try {
        const tableNames = sqlite
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all() as Array<{ name: string }>;
        const tables = new Set(tableNames.map((t) => t.name));

        const weightRows = tables.has("weight_entries")
            ? (sqlite.prepare("SELECT * FROM weight_entries").all() as SqliteWeightRow[])
            : [];
        const calorieRows = tables.has("calorie_entries")
            ? (sqlite.prepare("SELECT * FROM calorie_entries").all() as SqliteCalorieRow[])
            : [];
        const goalRows = tables.has("goals")
            ? (sqlite.prepare("SELECT * FROM goals").all() as SqliteGoalRow[])
            : [];

        const summary: ImportSummary = {
            weightEntries: 0,
            calorieEntries: 0,
            goals: 0,
            skippedWeight: 0,
            skippedCalorie: 0,
        };

        await prisma.$transaction(async (tx) => {
            for (const w of weightRows) {
                const existing = await tx.weightEntry.findUnique({
                    where: { user_id_date: { user_id: userId, date: w.date } },
                });
                if (existing) {
                    summary.skippedWeight++;
                    continue;
                }
                await tx.weightEntry.create({
                    data: {
                        user_id: userId,
                        date: w.date,
                        weight: w.weight,
                        created_at: parseSqliteDate(w.created_at) ?? new Date(),
                        updated_at: parseSqliteDate(w.updated_at) ?? new Date(),
                    },
                });
                summary.weightEntries++;
            }

            for (const c of calorieRows) {
                const existing = await tx.calorieEntry.findUnique({
                    where: { user_id_date: { user_id: userId, date: c.date } },
                });
                if (existing) {
                    summary.skippedCalorie++;
                    continue;
                }
                await tx.calorieEntry.create({
                    data: {
                        user_id: userId,
                        date: c.date,
                        calories_consumed: c.calories_consumed,
                        calories_burned: c.calories_burned,
                        goal: normalizeGoal(c.goal),
                        created_at: parseSqliteDate(c.created_at) ?? new Date(),
                        updated_at: parseSqliteDate(c.updated_at) ?? new Date(),
                    },
                });
                summary.calorieEntries++;
            }

            if (goalRows.length > 0) {
                // Wipe the legacy active flag so only the most recently imported goal stays active.
                const validGoals = goalRows.filter((g) => g.mode === "cut" || g.mode === "bulk");
                if (validGoals.length > 0) {
                    await tx.goal.updateMany({
                        where: { user_id: userId, active: true },
                        data: { active: false },
                    });
                }
                for (const g of validGoals) {
                    await tx.goal.create({
                        data: {
                            user_id: userId,
                            target_weight: g.target_weight,
                            mode: g.mode,
                            initial_intensity: g.initial_intensity,
                            start_date: g.start_date,
                            start_weight: g.start_weight,
                            active: Boolean(g.active),
                            created_at: parseSqliteDate(g.created_at) ?? new Date(),
                            updated_at: parseSqliteDate(g.updated_at) ?? new Date(),
                        },
                    });
                    summary.goals++;
                }
            }
        });

        return summary;
    } finally {
        sqlite.close();
    }
}
