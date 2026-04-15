import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useFHE } from "../hooks/useFHE";
import { CONTRACT_ADDRESSES, PAYSHIELD_PAYROLL_ABI } from "../lib/config";

function ContractorView() {
  const { address } = useAccount();
  const [employerAddress, setEmployerAddress] = useState("");
  const [status, setStatus] = useState("Waiting for employer address");
  const [decryptedPay, setDecryptedPay] = useState<string>("");
  const { decryptNetPay } = useFHE();

  const statusTone =
    status === "Decryption complete"
      ? "success"
      : status === "Waiting for employer address"
        ? "warning"
        : status.toLowerCase().includes("invalid") || status.toLowerCase().includes("connect")
          ? "warning"
          : "idle";

  const { data: encryptedHandle, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.payroll,
    abi: PAYSHIELD_PAYROLL_ABI,
    functionName: "getNetPay",
    args: isAddress(employerAddress) && address ? [employerAddress, address] : undefined,
    query: {
      enabled: false,
    },
  });

  const loadAndDecrypt = async () => {
    if (!address) {
      setStatus("Connect contractor wallet first");
      return;
    }
    if (!isAddress(employerAddress)) {
      setStatus("Invalid employer address");
      return;
    }

    try {
      setStatus("Fetching encrypted net pay...");
      const result = await refetch();
      const handle = (result.data ?? encryptedHandle) as string | undefined;
      if (!handle) {
        setStatus("No payroll handle found");
        return;
      }

      setStatus("Decrypting net pay with permit...");
      const decrypted = await decryptNetPay(handle);
      setDecryptedPay(decrypted.toString());
      setStatus("Decryption complete");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="form-grid">
      <p>Decrypt and display only your own payroll value.</p>
      <div className="form-field form-field--full">
        <label htmlFor="employer-address">Employer address</label>
        <input
          id="employer-address"
          type="text"
          placeholder="Employer address"
          value={employerAddress}
          onChange={(event) => setEmployerAddress(event.target.value)}
        />
      </div>
      <button type="button" className="button button--full" onClick={loadAndDecrypt}>
        Decrypt My Pay
      </button>
      <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
      {decryptedPay ? <p>Decrypted Net Pay: {decryptedPay}</p> : null}
    </section>
  );
}

export default ContractorView;
