import PoolFunding from "../components/PoolFunding";

export default function PoolPage() {
  return (
    <main className="page-wrapper page-wrapper--stacked">
      <section className="page-section page-section--hero">
        <div className="page-header page-header--hero">
          <h1>Pool Management</h1>
          <p>Deposit stablecoin liquidity for escrow disbursement.</p>
        </div>

        <div className="page-content">
          <PoolFunding />
        </div>

        <div className="glass-card page-info-card">
          <h3>Pool Mechanics</h3>
          <ul className="info-list">
            <li><span className="info-list__bullet" aria-hidden="true" />Employers deposit USDC to fund outgoing contractor payments.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Escrow contract holds funds and releases only after payroll confirmation.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Pool balance is tracked on-chain but never reveals individual contractor amounts.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Selective disclosure allows employers to prove funding without exposing amounts.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
