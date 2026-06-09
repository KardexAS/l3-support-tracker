import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if fully onboarded (has completed profile AND phone number)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboarded: true,
      fullName: true,
      preferredContact: true,
      encryptedPhone: true,
    },
  });

  if (user?.onboarded && user.encryptedPhone) {
    redirect("/dashboard");
  }

  // Pass existing data for returning users who just need to add phone
  const existingData = user
    ? {
        fullName: user.fullName ?? "",
        preferredContact: user.preferredContact ?? "SLACK",
        phoneNumber: user.encryptedPhone ? decrypt(user.encryptedPhone) : "",
      }
    : undefined;

  return <OnboardingForm existingData={existingData} />;
}
