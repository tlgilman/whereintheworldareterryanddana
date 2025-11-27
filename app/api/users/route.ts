import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";
import { createUser, getUserByEmail, updateUser } from "@/lib/google-sheets";
import * as bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      role,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);
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
    const { password, name, email } = body;

    // Users can only update their own profile, unless they are admin
    // But for now, let's stick to "update self" logic for the /profile page usage
    // If we want admin to update others, we'd need to pass an ID or email to target
    
    // For this implementation, we assume the user is updating themselves via /profile
    // OR an admin is updating someone else (not implemented in this block yet, keeping it simple)
    
    // Let's assume the body contains the target email if admin, otherwise use session email
    let targetEmail = session.user?.email;
    
    // If admin and target email provided, use that
    if (session.user?.role === 'admin' && email) {
      targetEmail = email;
    }

    if (!targetEmail) {
       return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
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
