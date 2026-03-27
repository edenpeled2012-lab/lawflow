import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const caseType = searchParams.get("caseType");

  const clients = await prisma.client.findMany({
    where: {
      lawyerId: session.user.id,
      ...(status ? { status: status as never } : {}),
      ...(caseType ? { caseType: caseType as never } : {}),
    },
    orderBy: [
      { urgency: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      conversation: {
        select: { completed: true, updatedAt: true },
      },
    },
  });

  return NextResponse.json(clients);
}
