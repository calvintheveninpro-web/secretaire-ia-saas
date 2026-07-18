export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Connexion</h1>
        <p className="muted">Console Secrétaire IA</p>
        {searchParams.error && <p style={{ color: "var(--danger)" }}>Identifiants incorrects.</p>}
        <form method="post" action="/api/auth/login">
          <label>Email</label>
          <input name="email" type="email" required defaultValue="demo@cabinet.fr" />
          <label>Mot de passe</label>
          <input name="password" type="password" required defaultValue="demo1234" />
          <div style={{ marginTop: 18 }}>
            <button className="btn" type="submit">Se connecter</button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Pas encore de compte ? <a href="/signup">Créer un cabinet</a>
        </p>
      </div>
    </div>
  );
}
