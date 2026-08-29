// TODO (Person 4 — Account/Profile):
// Build sign-up/login UI and profile editing here, plus lists of the
// current user's joined and created matches. Auth helpers already live in
// src/services/profileService.ts.
export default function Profile() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthSubmitting(true);

    try {
      if (authMode === "signup") {
        const data = await signUp({ name, email, password });
        if (!data.session) {
          setAuthNotice("Account created! Check your email to confirm, then log in.");
          setAuthMode("login");
        }
      } else {
        await signIn({ email, password });
      }
      setPassword("");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <section className="page">
        <h1>Your Profile</h1>
        <p className="page-subtitle">Loading...</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="page">
        <h1>Your Profile</h1>
        <p className="page-subtitle">Sign up or log in to continue.</p>

        <div>
          <button type="button" onClick={() => setAuthMode("login")}>Log In</button>
          <button type="button" onClick={() => setAuthMode("signup")}>Sign Up</button>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {authError && <p style={{ color: "red" }}>{authError}</p>}
            {authNotice && <p>{authNotice}</p>}

            <button type="submit" disabled={authSubmitting}>
              {authSubmitting ? "Please wait..." : authMode === "signup" ? "Create Account" : "Log In"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="page page-narrow">
      <p className="eyebrow">Your account</p>
      <h1>Profile</h1>
      <p className="page-subtitle">
        Sign-up, login and profile details go here, along with the matches
        you've joined and created.
      </p>
      <p className="placeholder-note">This page is still being built.</p>
    </section>
  );
}