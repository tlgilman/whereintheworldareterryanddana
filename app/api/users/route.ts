import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { createUser, getUserByEmail, getUsers, updateUser } from "@/lib/google-sheets";
import { sendWelcomeEmail } from "@/lib/email";
import * as bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pass = "Travel-";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await getUsers();
    // Strip passwords before returning
    const safeUsers = allUsers.map(({ password: _p, ...u }) => u);
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields (name, email, role)' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const rawTempPassword = password && password.trim() ? password.trim() : generateTempPassword();
    const hashedPassword = await bcrypt.hash(rawTempPassword, 10);

    const newUser = await createUser({
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      role,
      mustChangePassword: true,
    });

    // Send welcome email with role-customized content
    let emailResult: { success: boolean; simulated?: boolean } = { success: false, simulated: false };
    try {
      emailResult = await sendWelcomeEmail({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tempPassword: rawTempPassword,
      });
    } catch (e) {
      console.error("Failed to send welcome email:", e);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = newUser;
    return NextResponse.json({
      ...userWithoutPassword,
      tempPassword: rawTempPassword,
      emailSent: emailResult.success,
      emailSimulated: emailResult.simulated,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { password, name, email, mustChangePassword } = body;

    let targetEmail = session.user?.email;
    
    // If admin and target email provided, use that
    if (session.user?.role === 'admin' && email) {
      targetEmail = email;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const updates: Record<string, string | boolean> = {};
    if (name) updates.name = name;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    if (mustChangePassword !== undefined) {
      updates.mustChangePassword = mustChangePassword;
    }

    const updatedUser = await updateUser(targetEmail, updates);
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
