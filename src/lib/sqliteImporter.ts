import type { PrismaClient } from "@prisma/client";
import initSqlJs from "sql.js";
import { join } from "path";

export interface ImportSummary {
    weightEntries: number;
    calorieEntries: number;
    goals: number;
    skippedWeight: number;
    skippedCalorie: number;
}

function normalizeGoal(goal: string | null | undefined): string {
    if (goal === "maintenance" || goal === "bulk") return goal;
    return "deficit";
}

function parseSqliteDate(value: string | null | undefined): Date | undefined {
    if (!value) return undefined;
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Import all rows from a SQLite DB buffer into Postgres under the given user.
 * Uses sql.js (pure WASM) — no native bindings required.
 * Existing (user_id, date) rows are preserved.
 */
export async function importSqliteFromBuffer(
    prisma: PrismaClient,
    buffer: Buffer,
    userId: string
): Promise<ImportSummary> {
    const SQL = await initSqlJs({
        locateFile: (file) => join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });

    const db = new SQL.Database(buffer);

    const tables = new Set(
        (db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values ?? [])
            .map((r) => r[0] as string)
    );

    function queryAll(sql: string): Record<string, unknown>[] {
        const result = db.exec(sql);
        if (!result.length) return [];
        const { columns, values } = result[0];
        return values.map((row) =>
            Object.fromEntries(columns.map((col, i) => [col, row[i]]))
        );
    }

    const weightRows = tables.has("weight_entries") ? queryAll("SELECT * FROM weight_entries") : [];
    const calorieRows = tables.has("calorie_entries") ? queryAll("SELECT * FROM calorie_entries") : [];
    const goalRows = tables.has("goals") ? queryAll("SELECT * FROM goals") : [];

    db.close();

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
                where: { user_id_date: { user_id: userId, date: w.date as string } },
            });
            if (existing) { summary.skippedWeight++; continue; }
            await tx.weightEntry.create({
                data: {
                    user_id: userId,
                    date: w.date as string,
                    weight: w.weight as number,
                    created_at: parseSqliteDate(w.created_at as string) ?? new Date(),
                    updated_at: parseSqliteDate(w.updated_at as string) ?? new Date(),
                },
            });
            summary.weightEntries++;
        }

        for (const c of calorieRows) {
            const existing = await tx.calorieEntry.findUnique({
                where: { user_id_date: { user_id: userId, date: c.date as string } },
            });
            if (existing) { summary.skippedCalorie++; continue; }
            await tx.calorieEntry.create({
                data: {
                    user_id: userId,
                    date: c.date as string,
                    calories_consumed: c.calories_consumed as number,
                    calories_burned: c.calories_burned as number,
                    goal: normalizeGoal(c.goal as string),
                    created_at: parseSqliteDate(c.created_at as string) ?? new Date(),
                    updated_at: parseSqliteDate(c.updated_at as string) ?? new Date(),
                },
            });
            summary.calorieEntries++;
        }

        const validGoals = goalRows.filter((g) => g.mode === "cut" || g.mode === "bulk");
        if (validGoals.length > 0) {
            await tx.goal.updateMany({ where: { user_id: userId, active: true }, data: { active: false } });
            for (const g of validGoals) {
                await tx.goal.create({
                    data: {
                        user_id: userId,
                        target_weight: g.target_weight as number,
                        mode: g.mode as string,
                        initial_intensity: g.initial_intensity as number,
                        start_date: g.start_date as string,
                        start_weight: g.start_weight as number,
                        active: Boolean(g.active),
                        created_at: parseSqliteDate(g.created_at as string) ?? new Date(),
                        updated_at: parseSqliteDate(g.updated_at as string) ?? new Date(),
                    },
                });
                summary.goals++;
            }
        }
    });

    return summary;
}
