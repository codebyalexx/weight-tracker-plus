/**
 * CLI: import a legacy SQLite DB into Postgres under a given user.
 *
 *   npx tsx scripts/import-sqlite.ts --sqlite ./weight-tracker.db --email you@example.com
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import process from "process";
import { PrismaClient } from "@prisma/client";
import { importSqliteFromBuffer } from "../src/lib/sqliteImporter";

function parseArgs(argv: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith("--")) { out[key] = next; i++; }
            else out[key] = "true";
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

    const buffer = readFileSync(resolve(sqlitePathArg));
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`No user found with email ${email}. Sign up first.`);
            process.exit(2);
        }

        console.log(`Importing into user ${user.email} (${user.id})…`);
        const summary = await importSqliteFromBuffer(prisma, buffer, user.id);

        console.log("Done:");
        console.log(`  weight entries : ${summary.weightEntries} inserted, ${summary.skippedWeight} skipped`);
        console.log(`  calorie entries: ${summary.calorieEntries} inserted, ${summary.skippedCalorie} skipped`);
        console.log(`  goals          : ${summary.goals} inserted`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => { console.error(err); process.exit(3); });
