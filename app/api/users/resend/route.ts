import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getUserByEmail, updateUser } from "@/lib/google-sheets";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";
import * as bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pass = "Travel-";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, action } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "expire_only") {
      // Expire password without generating new temp password
      await updateUser(email, { mustChangePassword: true });
      return NextResponse.json({ message: `Password expired for ${email}` });
    }

    // Generate fresh temporary password
    const rawTempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(rawTempPassword, 10);

    await updateUser(email, {
      password: hashedPassword,
      mustChangePassword: true,
    });

    let emailResult: { success: boolean; simulated?: boolean } = { success: false, simulated: false };

    if (user.role === "admin") {
      emailResult = await sendWelcomeEmail({
        email: user.email,
        name: user.name,
        role: user.role,
        tempPassword: rawTempPassword,
      });
    } else {
      emailResult = await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        tempPassword: rawTempPassword,
      });
    }

    return NextResponse.json({
      message: `New temporary password generated and email sent to ${email}`,
      tempPassword: rawTempPassword,
      emailSent: emailResult.success,
      emailSimulated: emailResult.simulated,
    });
  } catch (error) {
    console.error("Error resending email:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
