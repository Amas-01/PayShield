import { useState, useEffect } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useFHE } from "../hooks/useFHE";
import { CONTRACT_ADDRESSES, PAYSHIELD_PAYROLL_ABI } from "../lib/config";
import { formatUserError } from "../lib/errors";

const MAX_DECRYPT_RETRIES = 3;
const RETRY_DELAY_MS = 15000;

function ContractorView() {
  const { address } = useAccount();
  const [employerAddress, setEmployerAddress] = useState("");
  const [status, setStatus] = useState("Waiting for employer address");
  const [decryptedPay, setDecryptedPay] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { decryptNetPay, isEncrypting } = useFHE();

  const statusTone =
    status === "Decryption complete"
      ? "success"
      : status === "Waiting for employer address"
        ? "warning"
        : status.toLowerCase().includes("invalid") || status.toLowerCase().includes("connect")
          ? "warning"
          : status.includes("Pending") || status.includes("Retry")
          ? "idle"
          : "error";

  const { data: encryptedHandle, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.payroll,
    abi: PAYSHIELD_PAYROLL_ABI,
    functionName: "getNetPay",
    args: isAddress(employerAddress) && address ? [employerAddress, address] : undefined,
    query: {
      enabled: false,
    },
  });

  // Auto-retry logic
  useEffect(() => {
    if (status.includes("Retry") && retryCount < MAX_DECRYPT_RETRIES && !isDecrypting) {
      const timer = setTimeout(() => {
        // Retry decryption with current state
        if (decryptedPay === "" && encryptedHandle) {
          attemptDecryption(encryptedHandle, retryCount + 1);
        }
      }, RETRY_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [status, retryCount, isDecrypting, decryptedPay, encryptedHandle]);

  const attemptDecryption = async (handle: string, attempt: number) => {
    setIsDecrypting(true);
    try {
      setStatus(`Requesting decryption from FHE network... (Attempt ${attempt}/${MAX_DECRYPT_RETRIES})`);
      const decrypted = await decryptNetPay(handle);
      
      if (decrypted && decrypted !== "null") {
        setDecryptedPay(decrypted.toString());
        setStatus("Decryption complete");
        setRetryCount(0);
      } else {
        // Decryption returned null, set up retry
        setRetryCount(attempt);
        if (attempt < MAX_DECRYPT_RETRIES) {
          setStatus(`Pending... Retrying in 15 seconds (Attempt ${attempt}/${MAX_DECRYPT_RETRIES})`);
        } else {
          setStatus("Decryption is taking longer than expected. The FHE network may be processing — check back in 30 seconds.");
        }
      }
    } catch (error) {
      const message = formatUserError(error);
      setRetryCount(attempt);
      
      if (attempt < MAX_DECRYPT_RETRIES) {
        setStatus(`${message} Retrying in 15 seconds... (Attempt ${attempt}/${MAX_DECRYPT_RETRIES})`);
      } else {
        setStatus("Decryption is taking longer than expected. The FHE network may be processing — check back in 30 seconds.");
      }
    } finally {
      setIsDecrypting(false);
    }
  };

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

      setRetryCount(0);
      setDecryptedPay("");
      await attemptDecryption(handle, 1);
    } catch (error) {
      setStatus(formatUserError(error));
    }
  };

  return (
    <section className="form-grid">
      <p>Decrypt and display only your own payroll value. Use your contractor wallet to decrypt successfully.</p>
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
      <button 
        type="button" 
        className="button button--full" 
        onClick={loadAndDecrypt}
        disabled={isDecrypting || isEncrypting}
      >
        {isDecrypting ? "Decrypting..." : "Decrypt My Pay"}
      </button>
      <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
      {decryptedPay ? <p>Decrypted Net Pay: {decryptedPay}</p> : null}
    </section>
  );
}

export default ContractorView;
