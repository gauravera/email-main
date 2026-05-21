import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const campaigns = await prisma.campaign.findMany({
      where: { userId: (session!.user as any).id },
      orderBy: { createdAt: "desc" },
      include: { drafts: true },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("Fetch Campaigns Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
