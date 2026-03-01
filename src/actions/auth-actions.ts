"use server";

import { redirect } from "next/navigation";
import { uploadImage } from "@/lib/cloudinary";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { createAuthSession, destroySession, verifyAuthAndRefresh } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthFormState = {
  errors?: Record<string, string>;
};

export async function signup(prevState: AuthFormState, formData: FormData): Promise<AuthFormState & { redirectTo?: string }> {
  const errors: Record<string, string> = {};

  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const profilePicture = formData.get("profilePicture") as File;

  if (!username || username.trim().length < 1) errors.username = "Username is required";
  if (!email || !email.includes("@")) errors.email = "Invalid email address";
  if (!password || password.trim().length < 8) errors.password = "Password must be at least 8 characters";
  if (!profilePicture || profilePicture.size === 0) errors.profilePicture = "Profile picture is required";

  if (Object.keys(errors).length > 0) return { errors };

  let imageUrl: string;
  try {
    imageUrl = await uploadImage(profilePicture);
  } catch {
    return { errors: { profilePicture: "Failed to upload profile picture" } };
  }

  const hashedPassword = hashPassword(password);

  try {
    const result = db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      profilePicture: imageUrl,
    }).returning({ id: users.id }).get();

    await createAuthSession(result.id);
  } catch (error: unknown) {
    const sqlError = error as { code?: string };
    if (sqlError.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { errors: { email: "Email or username already in use" } };
    }
    return { errors: { email: "Something went wrong. Please try again." } };
  }

  const redirectTo = formData.get("redirectTo") as string;
  redirect(redirectTo || "/");
}

export async function login(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const existingUser = db.select().from(users).where(eq(users.username, username)).get();

  if (!existingUser) {
    return { errors: { credentials: "Invalid username or password" } };
  }

  const isValidPassword = verifyPassword(existingUser.password, password);
  if (!isValidPassword) {
    return { errors: { credentials: "Invalid username or password" } };
  }

  await createAuthSession(existingUser.id);
  const redirectTo = formData.get("redirectTo") as string;
  redirect(redirectTo || "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function getUserProfile() {
  const { user } = await verifyAuthAndRefresh();
  if (!user) return null;

  const userData = db.select().from(users).where(eq(users.id, Number(user.id))).get();
  if (!userData) return null;

  return {
    username: userData.username,
    profilePicture: userData.profilePicture,
    email: userData.email,
    phone: userData.phone,
    street: userData.street,
    apartment: userData.apartment,
    city: userData.city,
    zipCode: userData.zipCode,
    createdAt: userData.createdAt,
  };
}
