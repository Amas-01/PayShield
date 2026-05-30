import React, { useEffect, useState } from "react";
import useMultiSig from "../hooks/useMultiSig";

type Props = { contractAddress: string; abi: any; employer: string; batchIds?: string[] };

export default function ApprovalQueue({ contractAddress, abi, employer, batchIds = [] }: Props) {
  const { getBatch, approve } = useMultiSig(contractAddress, abi);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const items = [] as any[];
      for (const id of batchIds) {
        const b = await getBatch(id);
        if (b) items.push(b);
      }
      if (mounted) setBatches(items);
    })();
    return () => {
      mounted = false;
    };
  }, [batchIds.join("|")]);

  async function handleApprove(id: string) {
    await approve(id);
    setBatches((s) => s.filter((b) => b.batchId !== id));
  }

  return (
    <div>
      <h3>Approval Queue</h3>
      {batches.length === 0 && <div>No pending batches</div>}
      <ul>
        {batches.map((b) => (
          <li key={b.batchId}>
            <div>Batch: {b.batchId}</div>
            <div>Contractors: {b.contractors.join(", ")}</div>
            <div>Approvals: {String(b.approvalCount)}</div>
            <button onClick={() => handleApprove(b.batchId)}>Approve</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
