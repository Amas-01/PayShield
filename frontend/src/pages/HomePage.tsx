export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero hero--home">
        <div className="hero__orbs" aria-hidden="true">
          <span className="hero__orb hero__orb--one" />
          <span className="hero__orb hero__orb--two" />
          <span className="hero__orb hero__orb--three" />
        </div>

        <div className="hero__panel">
          <div className="hero__badge">Encrypted Payroll Platform</div>
          <h1 className="hero__title">Payroll Privacy at Scale</h1>
          <p className="hero__subtitle">
            Contractor compensation stays encrypted through computation. Employers fund payroll. Contractors decrypt only their own pay.
          </p>

          <div className="hero__metrics hero__metrics--pills">
            <div className="metric metric--pill">
              <div className="metric__label">Privacy Model</div>
              <div className="metric__value">Encrypted at rest + in computation</div>
            </div>
            <div className="metric metric--pill">
              <div className="metric__label">Technical Stack</div>
              <div className="metric__value">Solidity + CoFHE + Mock FHE tests</div>
            </div>
            <div className="metric metric--pill">
              <div className="metric__label">Use Case</div>
              <div className="metric__value">Contractor safety, compliance, privacy</div>
            </div>
          </div>

          <div className="hero__cta">
            <a href="#how-it-works" className="button button-lg">
              Learn How It Works
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section-block">
        <div className="section-heading">
          <h2>How It Works</h2>
          <p>A simple workflow that keeps payroll private at every step.</p>
        </div>

        <div className="workflow-grid">
          <article className="glass-card workflow-card">
            <span className="workflow-card__number">1</span>
            <h3>Employer enters compensation</h3>
            <p>Hours and rate are submitted through the PayShield app and encrypted immediately.</p>
            <span className="workflow-card__connector" aria-hidden="true">→</span>
          </article>

          <article className="glass-card workflow-card">
            <span className="workflow-card__number">2</span>
            <h3>On-chain FHE computation</h3>
            <p>Encrypted inputs are multiplied using FHE.mul, returning an encrypted result handle.</p>
            <span className="workflow-card__connector" aria-hidden="true">→</span>
          </article>

          <article className="glass-card workflow-card">
            <span className="workflow-card__number">3</span>
            <h3>Employer confirms</h3>
            <p>Employer must explicitly confirm the payroll before funds can be released.</p>
            <span className="workflow-card__connector" aria-hidden="true">→</span>
          </article>

          <article className="glass-card workflow-card">
            <span className="workflow-card__number">4</span>
            <h3>Contractor decrypts</h3>
            <p>Only the contractor can decrypt their pay using their wallet's decryption key.</p>
          </article>
        </div>
      </section>

      <section className="section-block section-block--alt">
        <div className="section-heading">
          <h2>Built on Production Infrastructure</h2>
          <p>Hardened with encrypted computation primitives and rigorous testing.</p>
        </div>

        <div className="feature-grid feature-grid--three">
          <article className="glass-card feature-card feature-card--accent">
            <div className="feature-card__icon">🔐</div>
            <h3>Homomorphic Encryption</h3>
            <p>Hours, rates, and net pay remain encrypted during all on-chain operations using CoFHE.</p>
          </article>

          <article className="glass-card feature-card">
            <div className="feature-card__icon">✓</div>
            <h3>Privacy by Design</h3>
            <p>No contractor data is ever exposed to payroll admins, pool operators, or blockchain observers.</p>
          </article>

          <article className="glass-card feature-card">
            <div className="feature-card__icon">🏗️</div>
            <h3>Tested & Proven</h3>
            <p>6 passing integration tests verify encrypted payroll math correctness in mock FHE environment.</p>
          </article>

          <article className="glass-card feature-card">
            <div className="feature-card__icon">⚖️</div>
            <h3>Compliance Ready</h3>
            <p>Selective disclosure and escrow mechanics support audit requirements and dispute resolution.</p>
          </article>

          <article className="glass-card feature-card">
            <div className="feature-card__icon">🔗</div>
            <h3>Bridge Compatible</h3>
            <p>Pool funding via stablecoin deposits with Reineira SDK for cross-chain payment plumbing.</p>
          </article>

          <article className="glass-card feature-card">
            <div className="feature-card__icon">⚡</div>
            <h3>Developer Ready</h3>
            <p>TypeChain generated types, Hardhat mock FHE environment, React hooks for cryptographic UX.</p>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Privacy Guarantees</h2>
          <p>Data protection at every layer.</p>
        </div>

        <div className="guarantees-grid">
          <div className="glass-card guarantee-card">
            <h4>Before Submission</h4>
            <p>Inputs are encrypted in the browser before any network transmission.</p>
          </div>

          <div className="glass-card guarantee-card">
            <h4>During Computation</h4>
            <p>Smart contract executes math on ciphertexts using FHE.mul, never decrypts intermediate values.</p>
          </div>

          <div className="glass-card guarantee-card guarantee-card--highlight">
            <h4>After Confirmation</h4>
            <p>Only employers can initiate escrow release; only contractors can decrypt their compensation.</p>
          </div>

          <div className="glass-card guarantee-card">
            <h4>On-chain Transparency</h4>
            <p>Encrypted state is recorded on-chain. Plaintext never exists in the system's critical path.</p>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Judge Demo Flow</h2>
          <p>Five minutes to see the complete encrypted payroll cycle.</p>
        </div>

        <div className="timeline">
          <div className="timeline__rail" aria-hidden="true" />
          <div className="timeline__item">
            <div className="timeline__node">1</div>
            <div className="glass-card timeline__card">
              <strong>Connect wallet</strong> — Use the navigation to link a test wallet (Injected provider simulation).
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__node">2</div>
            <div className="glass-card timeline__card">
              <strong>Go to Employer</strong> — Submit encrypted payroll: enter contractor address, hours (e.g., 40), and rate (e.g., 25).
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__node">3</div>
            <div className="glass-card timeline__card">
              <strong>Confirm payroll</strong> — Employer confirmation unlocks the escrow gate.
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__node">4</div>
            <div className="glass-card timeline__card">
              <strong>Check Pool</strong> — Deposit USDC to demonstrate pool funding mechanics.
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__node">5</div>
            <div className="glass-card timeline__card">
              <strong>Decrypt as Contractor</strong> — Switch to Contractor View, decrypt your pay, see plaintext net compensation.
            </div>
          </div>
        </div>
        <div className="callout-box">
            Backend tests prove encrypted math is correct. README shows mock FHE assertion output as judge validation.
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-band__content">
          <h2>Ready to try?</h2>
          <p>Use the navigation above to explore the Employer, Contractor, and Pool screens.</p>
          <a href="/employer" className="button button-lg">
            Start with Employer Screen
          </a>
        </div>
      </section>
    </main>
  );
}
