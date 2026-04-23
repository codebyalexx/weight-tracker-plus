import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { importSqliteFromBuffer } from "@/lib/sqliteImporter";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof Blob)) {
            return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
        }
        if (file.size === 0) {
            return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const summary = await importSqliteFromBuffer(prisma, buffer, auth.userId);

        return NextResponse.json(summary);
    } catch (error) {
        console.error("SQLite import failed:", error);
        return NextResponse.json(
            { error: "Import échoué. Vérifie que le fichier est une base SQLite Kcalm valide." },
            { status: 500 }
        );
    }
}
