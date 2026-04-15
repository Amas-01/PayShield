import { useState } from "react";
import { usePayroll } from "../hooks/usePayroll";

function PoolFunding() {
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState("Ready to fund pool");
  const { prepareStablecoinDisbursement, depositToPool } = usePayroll();

  const statusTone =
    status === "Ready to fund pool" || status.startsWith("Pool funded")
      ? "success"
      : status.toLowerCase().includes("preparing")
        ? "idle"
        : status.toLowerCase().includes("submit")
          ? "idle"
          : "warning";

  const onDeposit = async () => {
    try {
      setStatus("Preparing Reineira USDC units...");
      const baseUnits = await prepareStablecoinDisbursement(amount);

      setStatus("Submitting pool deposit transaction...");
      await depositToPool(baseUnits);
      setStatus(`Pool funded with ${amount} USDC`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="form-grid">
      <div className="section-heading section-heading--compact">
        <h3>Pool Funding</h3>
      </div>
      <div className="form-field form-field--full">
        <label htmlFor="pool-amount">Amount</label>
        <input
          id="pool-amount"
          type="number"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="USDC amount"
        />
      </div>
      <button type="button" className="button button--full" onClick={onDeposit}>
        Deposit USDC
      </button>
      <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
    </section>
  );
}

export default PoolFunding;
