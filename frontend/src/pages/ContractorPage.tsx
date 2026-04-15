import ContractorView from "../components/ContractorView";

export default function ContractorPage() {
  return (
    <main className="page-wrapper page-wrapper--stacked">
      <section className="page-section page-section--hero">
        <div className="page-header page-header--hero">
          <h1>Contractor View</h1>
          <p>Decrypt and view your encrypted payroll compensation.</p>
        </div>

        <div className="page-content">
          <ContractorView />
        </div>

        <div className="glass-card page-info-card">
          <h3>Privacy Guarantee</h3>
          <ul className="info-list">
            <li><span className="info-list__bullet info-list__bullet--lock" aria-hidden="true" />Only your wallet can decrypt your pay using your private key.</li>
            <li><span className="info-list__bullet info-list__bullet--lock" aria-hidden="true" />The employer never sees the plaintext amount they confirm.</li>
            <li><span className="info-list__bullet info-list__bullet--lock" aria-hidden="true" />Contract state is encrypted; plaintext never touches the blockchain.</li>
            <li><span className="info-list__bullet info-list__bullet--lock" aria-hidden="true" />Decryption requires a permit issued specifically for your wallet address.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
