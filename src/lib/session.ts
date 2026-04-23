import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function getCurrentSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUserId(): Promise<
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse }
> {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { userId: session.user.id };
}
