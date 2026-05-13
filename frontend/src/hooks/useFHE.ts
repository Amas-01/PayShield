import { useState } from "react";
import { useCofheClient, useCofheEncrypt } from "@cofhe/react";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useAccount } from "wagmi";

export function useFHE() {
  const { encryptInputsAsync, isEncrypting } = useCofheEncrypt();
  const client = useCofheClient();
  const { address } = useAccount();
  const [fheError, setFheError] = useState<string>("");

  const encryptPayrollInputs = async (hours: number, rate: number) => {
    setFheError("");
    
    try {
      if (hours < 0 || rate < 0) {
        throw new Error("Hours and rate must be non-negative");
      }

      const encryptedInputs = await encryptInputsAsync([
        Encryptable.uint32(BigInt(hours)),
        Encryptable.uint32(BigInt(rate)),
      ] as const);

      return {
        encryptedHours: encryptedInputs[0],
        encryptedRate: encryptedInputs[1],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const userMessage = "Failed to encrypt payroll data. Please try again.";
      setFheError(userMessage);
      throw new Error(userMessage);
    }
  };

  const decryptNetPay = async (ciphertextHandle: string, retryCount = 0): Promise<string | null> => {
    setFheError("");
    
    try {
      if (!address) {
        throw new Error("Connect wallet to decrypt payroll");
      }

      const permit = await client.permits.createSelf({
        issuer: address,
        name: "PayShield Contractor Permit",
      });

      const decrypted = await Promise.race([
        client
          .decryptForView(ciphertextHandle, FheTypes.Uint32)
          .withPermit(permit)
          .execute(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Decryption timeout")), 60000)
        ) as Promise<never>,
      ]);

      return decrypted;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      if (message.includes("timeout") || message.toLowerCase().includes("processing")) {
        const userMessage = "Decryption is taking longer than expected. The FHE network may be processing — check back in 30 seconds.";
        setFheError(userMessage);
        return null;
      }
      
      if (message.includes("permission") || message.includes("permit")) {
        const userMessage = "You do not have permission to view this pay record.";
        setFheError(userMessage);
        throw new Error(userMessage);
      }

      setFheError(message);
      throw error;
    }
  };

  const clearError = () => setFheError("");

  return {
    isEncrypting,
    fheError,
    clearError,
    encryptPayrollInputs,
    decryptNetPay,
  };
}
