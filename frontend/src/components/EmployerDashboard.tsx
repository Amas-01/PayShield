import { useState } from "react";
import { isAddress } from "viem";
import { formatUserError } from "../lib/errors";
import { usePayroll } from "../hooks/usePayroll";
import { useFHE } from "../hooks/useFHE";
import PayrollForm from "./PayrollForm";
import { ErrorBanner } from "./ErrorBanner";

function EmployerDashboard() {
  const [contractorToConfirm, setContractorToConfirm] = useState("");
  const [status, setStatus] = useState("No confirmation submitted");
  const { confirmPayroll, payrollError, clearError: clearPayrollError } = usePayroll();
  const { fheError, clearError: clearFheError } = useFHE();

  // Show the most recent error
  const displayError = payrollError || fheError;

  const handleConfirm = async () => {
    clearPayrollError();
    clearFheError();
    
    if (!isAddress(contractorToConfirm)) {
      setStatus("Invalid contractor address");
      return;
    }

    try {
      await confirmPayroll(contractorToConfirm);
      setStatus("Payroll confirmed by employer");
    } catch (error) {
      setStatus(formatUserError(error));
    }
  };

  const handleContractorChange = (value: string) => {
    setContractorToConfirm(value);
    // Clear errors on input change
    clearPayrollError();
    clearFheError();
  };

  const statusTone =
    status === "Payroll confirmed by employer"
      ? "success"
      : status === "No confirmation submitted"
        ? "idle"
        : status === "Invalid contractor address"
          ? "warning"
          : "error";

  return (
    <section className="dashboard-stack">
      {displayError && (
        <ErrorBanner
          error={displayError}
          onDismiss={() => {
            clearPayrollError();
            clearFheError();
          }}
        />
      )}

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
          onChange={(event) => handleContractorChange(event.target.value)}
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
