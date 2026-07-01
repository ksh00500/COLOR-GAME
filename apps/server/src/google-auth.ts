import { OAuth2Client } from "google-auth-library";

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface GoogleTokenVerifier {
  readonly enabled: boolean;
  verify(idToken: string): Promise<VerifiedGoogleIdentity | null>;
}

export class NullGoogleTokenVerifier implements GoogleTokenVerifier {
  readonly enabled = false;

  async verify(): Promise<VerifiedGoogleIdentity | null> {
    return null;
  }
}

export class GoogleTokenVerifierImpl implements GoogleTokenVerifier {
  readonly enabled = true;
  private readonly client = new OAuth2Client();

  constructor(private readonly audience: string) {}

  async verify(idToken: string): Promise<VerifiedGoogleIdentity | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience,
      });
      const payload = ticket.getPayload();
      if (
        payload?.sub === undefined
        || payload.email === undefined
        || payload.email_verified !== true
      ) {
        return null;
      }
      return {
        subject: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: typeof payload.name === "string" ? payload.name : null,
        picture: typeof payload.picture === "string" ? payload.picture : null,
      };
    } catch {
      return null;
    }
  }
}

export const createGoogleTokenVerifierFromEnv = (): GoogleTokenVerifier => {
  const clientId = process.env.GOOGLE_WEB_CLIENT_ID?.trim();
  return clientId === undefined || clientId === ""
    ? new NullGoogleTokenVerifier()
    : new GoogleTokenVerifierImpl(clientId);
};
