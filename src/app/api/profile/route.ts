import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const [user, goal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: auth.userId },
                select: { id: true, name: true, email: true, image: true, height: true, sex: true, createdAt: true },
            }),
            prisma.goal.findFirst({
                where: { user_id: auth.userId, active: true },
                orderBy: { created_at: "desc" },
            }),
        ]);

        return NextResponse.json({ user, goal });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const { name, height, sex, target_weight, mode, initial_intensity } = body;

        const userUpdateData: { name?: string; height?: number | null; sex?: string | null } = {};
        if (name !== undefined) userUpdateData.name = String(name).trim();
        if (height !== undefined) userUpdateData.height = height ? Number(height) : null;
        if (sex !== undefined) userUpdateData.sex = sex ? String(sex) : null;

        let user = null;
        if (Object.keys(userUpdateData).length > 0) {
            user = await prisma.user.update({
                where: { id: auth.userId },
                data: userUpdateData,
                select: { id: true, name: true, email: true, image: true, height: true, sex: true, createdAt: true },
            });
        }

        let goal = null;
        if (target_weight !== undefined || mode !== undefined || initial_intensity !== undefined) {
            const currentGoal = await prisma.goal.findFirst({
                where: { user_id: auth.userId, active: true },
                orderBy: { created_at: "desc" },
            });

            if (currentGoal) {
                goal = await prisma.goal.update({
                    where: { id: currentGoal.id },
                    data: {
                        ...(target_weight !== undefined && { target_weight: Number(target_weight) }),
                        ...(mode !== undefined && { mode }),
                        ...(initial_intensity !== undefined && { initial_intensity: Number(initial_intensity) }),
                    },
                });
            }
        }

        return NextResponse.json({ user, goal });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
