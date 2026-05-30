import { useState } from "react";
import { ethers } from "ethers";

type PayrollBatch = {
  batchId: string;
  employer: string;
  contractors: string[];
  createdAt: bigint;
  approvalCount: bigint;
  executed: boolean;
  expired: boolean;
};

export default function useMultiSig(contractAddress: string, abi: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  function getProvider() {
    const win = window as any;
    return win?.ethereum ? new ethers.BrowserProvider(win.ethereum) : null;
  }

  async function configureSigner(signerAddress: string, active: boolean) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer as any);
      const tx = await contract.configureSigner(signerAddress, active);
      await tx.wait();
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function setThreshold(threshold: number) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer as any);
      const tx = await contract.setThreshold(threshold);
      await tx.wait();
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function createBatch(contractors: string[]) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer as any);
      const tx = await contract.createBatch(contractors);
      const receipt = await tx.wait();
      const ev = receipt.events?.find((e: any) => e.event === "BatchCreated");
      return ev?.args?.batchId ?? null;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function approve(batchId: string) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer as any);
      const tx = await contract.approve(batchId);
      await tx.wait();
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function getBatch(batchId: string): Promise<PayrollBatch | null> {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const contract = new ethers.Contract(contractAddress, abi, provider as any);
      const b = await contract.getBatch(batchId);
      return {
        batchId: b.batchId,
        employer: b.employer,
        contractors: b.contractors,
        createdAt: BigInt(b.createdAt.toString()),
        approvalCount: BigInt(b.approvalCount.toString()),
        executed: b.executed,
        expired: b.expired,
      };
    } catch (e: any) {
      setError(e);
      return null;
    }
  }

  async function getSignerSet(employer: string) {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("No provider");
      const contract = new ethers.Contract(contractAddress, abi, provider as any);
      const set: string[] = await contract.getSignerSet(employer);
      return set;
    } catch (e: any) {
      setError(e);
      return [];
    }
  }

  return {
    configureSigner,
    setThreshold,
    createBatch,
    approve,
    getBatch,
    getSignerSet,
    loading,
    error,
  };
}
