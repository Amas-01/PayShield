import EmployerDashboard from "../components/EmployerDashboard";

export default function EmployerPage() {
  return (
    <main className="page-wrapper page-wrapper--stacked">
      <section className="page-section page-section--hero">
        <div className="page-header page-header--hero">
          <h1>Employer Dashboard</h1>
          <p>Submit and confirm encrypted payroll for contractors.</p>
        </div>

        <div className="page-content">
          <EmployerDashboard />
        </div>

        <div className="glass-card page-info-card">
          <h3>How this works</h3>
          <ul className="info-list">
            <li><span className="info-list__bullet" aria-hidden="true" />Enter the contractor's wallet address.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Submit encrypted hours and rate. These values are encrypted in the browser before submission.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Confirm the payroll to unlock escrow release.</li>
            <li><span className="info-list__bullet" aria-hidden="true" />Once confirmed, the contractor can decrypt their net pay.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
