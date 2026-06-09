import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isValidE164 } from "@/lib/encryption";

export const runtime = "nodejs";

const VALID_CONTACT_METHODS = ["SMS", "SLACK", "TEAMS", "CALL"] as const;

// GET /api/profile - Get current user profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      image: true,
      roles: true,
      preferredContact: true,
      encryptedPhone: true,
      onboarded: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Decrypt phone number for the response
  const { encryptedPhone, ...rest } = user;
  const phoneNumber = encryptedPhone ? decrypt(encryptedPhone) : null;

  return NextResponse.json({ ...rest, phoneNumber });
}

// PUT /api/profile - Update current user profile
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fullName, image, preferredContact, onboarded, phoneNumber } = body;

  const updateData: Record<string, unknown> = {};

  if (typeof fullName === "string" && fullName.trim()) {
    updateData.fullName = fullName.trim();
  }
  if (typeof image === "string") {
    updateData.image = image;
  }
  if (typeof preferredContact === "string" && VALID_CONTACT_METHODS.includes(preferredContact as any)) {
    updateData.preferredContact = preferredContact;
  }
  if (typeof onboarded === "boolean") {
    updateData.onboarded = onboarded;
  }
  if (typeof phoneNumber === "string" && phoneNumber.trim()) {
    const trimmed = phoneNumber.trim();
    if (!isValidE164(trimmed)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (e.g. +15551234567)" },
        { status: 400 }
      );
    }
    updateData.encryptedPhone = encrypt(trimmed);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      image: true,
      roles: true,
      preferredContact: true,
      encryptedPhone: true,
      onboarded: true,
    },
  });

  // Decrypt phone for response
  const { encryptedPhone, ...rest } = updatedUser;
  const decryptedPhone = encryptedPhone ? decrypt(encryptedPhone) : null;

  return NextResponse.json({ ...rest, phoneNumber: decryptedPhone });
}
