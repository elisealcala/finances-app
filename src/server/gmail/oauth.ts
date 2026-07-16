import "server-only";
import { google } from "googleapis";
import { env } from "@/env";
import { db } from "@/server/db";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function createOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error(
      "Google OAuth env vars missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.",
    );
  }
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeAndStore(code: string): Promise<string> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("OAuth response missing access token");
  }
  client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress;
  if (!email) throw new Error("Could not read Gmail address from profile");

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  const existing = await db.gmailCredential.findUnique({ where: { email } });
  const refreshToken = tokens.refresh_token ?? existing?.refreshToken;
  if (!refreshToken) {
    throw new Error(
      "No refresh token returned. Revoke this app at https://myaccount.google.com/permissions and try again.",
    );
  }

  await db.gmailCredential.upsert({
    where: { email },
    create: {
      email,
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt,
    },
  });

  return email;
}

export async function getAuthorizedClient() {
  const cred = await db.gmailCredential.findFirst();
  if (!cred) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: cred.accessToken,
    refresh_token: cred.refreshToken,
    expiry_date: cred.expiresAt.getTime(),
  });

  client.on("tokens", async (tokens) => {
    const update: { accessToken?: string; expiresAt?: Date; refreshToken?: string } = {};
    if (tokens.access_token) update.accessToken = tokens.access_token;
    if (tokens.expiry_date) update.expiresAt = new Date(tokens.expiry_date);
    if (tokens.refresh_token) update.refreshToken = tokens.refresh_token;
    if (Object.keys(update).length > 0) {
      await db.gmailCredential.update({ where: { id: cred.id }, data: update });
    }
  });

  return { client, credential: cred };
}
