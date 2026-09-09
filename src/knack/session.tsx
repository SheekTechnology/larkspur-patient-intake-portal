import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { fetchSession, listRecords, KnackError } from "./api";
import { getTokens, logout as revokeTokens } from "./auth";
import { profileToObject } from "./config";

export type Session = {
  userId: string;
  fullName: string;
  email: string;
  profileKeys: string[];
  /** profileKey -> that role's record id, for connection-field writes. */
  roleRecordIds: Record<string, string>;
};

type SessionState = {
  session: Session | null;
  loading: boolean;
  error: KnackError | Error | null;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

function readName(name: { fullName?: string } | string | undefined, fallback: string): string {
  if (typeof name === "string") return name || fallback;
  return name?.fullName || fallback;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<KnackError | Error | null>(null);

  const load = useCallback(async () => {
    if (!getTokens()) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { session: s } = await fetchSession();
      const profileKeys = s.user.profileKeys ?? [];

      // Resolve each role-object record id. DAC guarantees the only record coming
      // back from these calls is the signed-in user's own, so no filter is needed.
      const roleRecordIds: Record<string, string> = {};
      await Promise.all(
        profileKeys.map(async (pk) => {
          const objectKey = profileToObject[pk];
          if (!objectKey) return;
          try {
            const { records } = await listRecords(objectKey, { rowsPerPage: 1 });
            if (records[0]) roleRecordIds[pk] = records[0].id;
          } catch {
            // A role whose object the user cannot read simply has no record id;
            // features needing it will say so rather than silently misbehave.
          }
        }),
      );

      setSession({
        userId: s.user.id,
        fullName: readName(s.user.name, s.user.email ?? "Signed in"),
        email: s.user.email ?? "",
        profileKeys,
        roleRecordIds,
      });
    } catch (e) {
      setError(e as Error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    await revokeTokens();
    setSession(null);
    window.location.assign("/login");
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, loading, error, reload: load, signOut }),
    [session, loading, error, load, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
