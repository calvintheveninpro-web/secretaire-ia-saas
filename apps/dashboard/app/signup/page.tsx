export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Créer un cabinet</h1>
        <p className="muted">Lance ta secrétaire IA en quelques secondes.</p>
        {searchParams.error === "exists" && <p style={{ color: "var(--danger)" }}>Cet email existe déjà.</p>}
        {searchParams.error === "invalid" && <p style={{ color: "var(--danger)" }}>Mot de passe trop court (min. 6).</p>}
        <form method="post" action="/api/auth/signup">
          <label>Nom du cabinet</label>
          <input name="nomCabinet" required placeholder="Cabinet du Dr Martin" />
          <label>Métier</label>
          <select name="metier" defaultValue="medecin">
            <option value="medecin">Médecin</option>
            <option value="chirurgien">Chirurgien</option>
            <option value="avocat">Avocat</option>
            <option value="entrepreneur">Entrepreneur</option>
          </select>
          <label>Email</label>
          <input name="email" type="email" required />
          <label>Mot de passe</label>
          <input name="password" type="password" required minLength={6} />
          <div style={{ marginTop: 18 }}>
            <button className="btn" type="submit">Créer mon compte</button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Déjà inscrit ? <a href="/login">Se connecter</a>
        </p>
      </div>
    </div>
  );
}
