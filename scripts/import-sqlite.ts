/**
 * CLI tool to import a legacy SQLite database into Postgres under a given user.
 *
 * Usage (inside the app environment, after migrations are applied):
 *   npx tsx scripts/import-sqlite.ts --sqlite ./weight-tracker.db --email you@example.com
 *
 * Existing (user_id, date) rows are preserved — the importer only inserts new ones.
 */

import path from "path";
import process from "process";
import { PrismaClient } from "@prisma/client";
import { importSqliteIntoUser } from "../src/lib/sqliteImporter";

function parseArgs(argv: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith("--")) {
                out[key] = next;
                i++;
            } else {
                out[key] = "true";
            }
        }
    }
    return out;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const sqlitePathArg = args.sqlite ?? args.db ?? args.file;
    const email = args.email;

    if (!sqlitePathArg || !email) {
        console.error("Usage: npx tsx scripts/import-sqlite.ts --sqlite <path> --email <email>");
        process.exit(1);
    }

    const sqlitePath = path.resolve(sqlitePathArg);
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`No user found with email ${email}. Sign up first via the web UI.`);
            process.exit(2);
        }

        console.log(`Importing ${sqlitePath} into user ${user.email} (${user.id})…`);

        const summary = await importSqliteIntoUser(prisma, sqlitePath, user.id);

        console.log("Import complete:");
        console.log(`  weight entries inserted : ${summary.weightEntries} (skipped ${summary.skippedWeight} existing)`);
        console.log(`  calorie entries inserted: ${summary.calorieEntries} (skipped ${summary.skippedCalorie} existing)`);
        console.log(`  goals inserted          : ${summary.goals}`);
    } catch (err) {
        console.error("Import failed:", err);
        process.exit(3);
    } finally {
        await prisma.$disconnect();
    }
}

main();
