import { FormEvent, useState } from "react";
import { isAddress } from "viem";
import { useFHE } from "../hooks/useFHE";
import { usePayroll } from "../hooks/usePayroll";
import { formatUserError } from "../lib/errors";

function PayrollForm() {
  const [contractor, setContractor] = useState("");
  const [hours, setHours] = useState("40");
  const [rate, setRate] = useState("25");
  const [status, setStatus] = useState("Ready");

  const { encryptPayrollInputs, isEncrypting } = useFHE();
  const { submitPayroll, isPending, hash } = usePayroll();

  const statusLower = status.toLowerCase();

  const statusTone =
    status === "Ready" || status === "Submitted successfully"
      ? "success"
      : status === "Invalid contractor address"
        ? "warning"
        : statusLower.includes("submitting") ||
            statusLower.includes("encrypting") ||
            statusLower.includes("register") ||
            statusLower.includes("checking") ||
            statusLower.includes("waiting") ||
            statusLower.includes("preparing")
          ? "idle"
          : "error";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAddress(contractor)) {
      setStatus("Invalid contractor address");
      return;
    }

    try {
      setStatus("Encrypting payroll inputs...");
      const encrypted = await encryptPayrollInputs(Number(hours), Number(rate));

      await submitPayroll(contractor, encrypted.encryptedHours as any, encrypted.encryptedRate as any, setStatus);
      setStatus("Submitted successfully");
    } catch (error) {
      setStatus(formatUserError(error));
    }
  };

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-field form-field--full">
        <label htmlFor="contractor">Contractor Address</label>
        <input
          id="contractor"
          name="contractor"
          type="text"
          placeholder="0x..."
          value={contractor}
          onChange={(event) => setContractor(event.target.value)}
        />
      </div>

      <div className="form-row form-row--two">
        <div className="form-field">
          <label htmlFor="hours">Encrypted Hours</label>
          <input
            id="hours"
            name="hours"
            type="number"
            min="0"
            placeholder="40"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="rate">Encrypted Rate</label>
          <input
            id="rate"
            name="rate"
            type="number"
            min="0"
            placeholder="25"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="button button--full" disabled={isEncrypting || isPending}>
        Encrypt & Submit Payroll
      </button>
      <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
      {hash ? <p>Tx: {hash}</p> : null}
    </form>
  );
}

export default PayrollForm;
