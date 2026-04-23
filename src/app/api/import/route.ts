import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { importSqliteIntoUser } from "@/lib/sqliteImporter";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    let tempDir: string | null = null;
    let tempFilePath: string | null = null;

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof Blob)) {
            return NextResponse.json(
                { error: "Fichier manquant" },
                { status: 400 }
            );
        }
        if (file.size === 0) {
            return NextResponse.json(
                { error: "Fichier vide" },
                { status: 400 }
            );
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: "Fichier trop volumineux (max 50 Mo)" },
                { status: 413 }
            );
        }

        tempDir = await mkdtemp(path.join(tmpdir(), "kcalm-import-"));
        tempFilePath = path.join(tempDir, "upload.db");
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(tempFilePath, buffer);

        const summary = await importSqliteIntoUser(prisma, tempFilePath, auth.userId);

        return NextResponse.json(summary);
    } catch (error) {
        console.error("SQLite import failed:", error);
        return NextResponse.json(
            { error: "Import échoué. Vérifie que le fichier est une base SQLite Kcalm valide." },
            { status: 500 }
        );
    } finally {
        if (tempFilePath) {
            try { await unlink(tempFilePath); } catch { /* ignore */ }
        }
    }
}
