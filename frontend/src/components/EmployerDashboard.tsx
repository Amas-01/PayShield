import { useState } from "react";
import { isAddress } from "viem";
import { usePayroll } from "../hooks/usePayroll";
import PayrollForm from "./PayrollForm";

function EmployerDashboard() {
  const [contractorToConfirm, setContractorToConfirm] = useState("");
  const [status, setStatus] = useState("No confirmation submitted");
  const { confirmPayroll } = usePayroll();

  const handleConfirm = async () => {
    if (!isAddress(contractorToConfirm)) {
      setStatus("Invalid contractor address");
      return;
    }

    try {
      await confirmPayroll(contractorToConfirm);
      setStatus("Payroll confirmed by employer");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const statusTone =
    status === "Payroll confirmed by employer"
      ? "success"
      : status === "No confirmation submitted"
        ? "idle"
        : status === "Invalid contractor address"
          ? "warning"
          : "idle";

  return (
    <section className="dashboard-stack">
      <div className="glass-card form-card form-card--accent-top">
      <PayrollForm />
      </div>

      <div className="glass-card form-card form-card--accent-top">
        <div className="section-heading section-heading--compact">
          <h3>Confirm Payroll</h3>
        </div>
        <label htmlFor="contractor-confirm">Contractor address</label>
        <input
          id="contractor-confirm"
          type="text"
          placeholder="Contractor address"
          value={contractorToConfirm}
          onChange={(event) => setContractorToConfirm(event.target.value)}
        />
        <button type="button" className="button button--full" onClick={handleConfirm}>
          Confirm Payroll
        </button>
        <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
      </div>
    </section>
  );
}

export default EmployerDashboard;
