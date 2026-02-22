import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: token.email },
  });

  if (!user) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  await prisma.order.createMany({
    data: [
      { amount: 1200, status: "completed", userId: user.id },
      { amount: 800, status: "completed", userId: user.id },
      { amount: 450, status: "pending", userId: user.id },
      { amount: 2300, status: "completed", userId: user.id },
    ],
  });

  return NextResponse.json({ message: "Orders seeded" });
}
