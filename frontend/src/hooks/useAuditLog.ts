import { useState } from "react";
import { ethers } from "ethers";

export type AuditEntry = {
  author: string;
  action: number;
  metadata: string;
  timestamp: bigint;
};

export default function useAuditLog(contractAddress: string, abi: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  function getProvider() {
    const win = window as any;
    return win?.ethereum ? new ethers.BrowserProvider(win.ethereum) : null;
  }

  async function getLogCount(teamId: string) {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const contract = new ethers.Contract(contractAddress, abi, provider as any);
      const c = await contract.getLogCount(teamId);
      return BigInt(c.toString());
    } catch (e: any) {
      setError(e);
      return BigInt(0);
    }
  }

  async function getLogs(teamId: string, start = 0, limit = 50): Promise<AuditEntry[]> {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const contract = new ethers.Contract(contractAddress, abi, provider as any);
      const raw = await contract.getLogs(teamId, start, limit);
      return raw.map((r: any) => ({
        author: r.author,
        action: Number(r.action),
        metadata: r.metadata,
        timestamp: BigInt(r.timestamp.toString()),
      }));
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function logAction(action: number, metadata: string, teamId: string) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer as any);
      const tx = await contract.log(teamId, action, metadata);
      await tx.wait();
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { getLogs, getLogCount, logAction, loading, error };
}
