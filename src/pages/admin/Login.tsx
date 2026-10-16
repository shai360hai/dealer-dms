import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button, Input, Label } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/admin";

  if (session) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) {
      setError("אימייל או סיסמה שגויים");
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.3em] text-[var(--color-chrome-gold)]">Dealer DMS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-porcelain)]">התחברות למערכת</h1>
          <p className="mt-1 text-sm text-[var(--color-steel)]">ניהול מלאי הרכבים של הסוכנות</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[var(--radius-card)] border border-[var(--color-steel-dark)] bg-[var(--color-ink-soft)] p-6">
          <div className="mb-4">
            <Label htmlFor="email" className="text-[var(--color-steel)]">דוא"ל</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="mb-6">
            <Label htmlFor="password" className="text-[var(--color-steel)]">סיסמה</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="mb-4 rounded-[var(--radius-card)] bg-[var(--color-status-sold)]/10 px-3 py-2 text-sm text-[var(--color-status-sold)]">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "מתחבר..." : "התחברות"}
          </Button>
        </form>
      </div>
    </main>
  );
}
