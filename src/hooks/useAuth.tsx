import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);
  // Keyed by user id so a profile can never be shown for the wrong
  // account, and so "loading" is derivable without an extra flag.
  const [loaded, setLoaded] = React.useState<{ userId: string; profile: Profile | null } | null>(null);

  React.useEffect(() => {
    // onAuthStateChange emits INITIAL_SESSION on subscribe, so it also
    // covers the first load — no separate getSession() call to race it.
    // Nothing here may call Supabase: the auth client holds a lock while
    // this callback runs, and awaiting another request inside it can
    // deadlock. The profile is fetched by the effect below instead.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLoaded({ userId, profile: data ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profile = userId && loaded?.userId === userId ? loaded.profile : null;
  const loading = sessionLoading || (Boolean(userId) && loaded?.userId !== userId);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook live together on purpose
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
