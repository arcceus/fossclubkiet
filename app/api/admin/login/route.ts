import { NextResponse } from "next/server";
import {
  createSessionToken,
  getExpectedAdminCredentials,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const expected = getExpectedAdminCredentials();

    if (
      body.username?.trim() !== expected.username ||
      body.password !== expected.password
    ) {
      return NextResponse.json(
        { error: "Invalid admin username or password." },
        { status: 401 }
      );
    }

    const token = createSessionToken(expected.username);
    const response = NextResponse.json({
      ok: true,
      username: expected.username,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Malformed login request." },
      { status: 400 }
    );
  }
}
