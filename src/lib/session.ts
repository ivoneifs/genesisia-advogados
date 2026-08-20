import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "genesis_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "fallback-dev-secret"
);

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: string;
  escritorioId: string | null;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireEscritorioId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.escritorioId) redirect("/admin/usuarios");
  return session.escritorioId;
}

export { COOKIE_NAME };
