import React, { useEffect, useState } from "react";
import useMultiSig from "../hooks/useMultiSig";

type Props = { contractAddress: string; abi: any; employer: string };

export default function SignerManagement({ contractAddress, abi, employer }: Props) {
  const { getSignerSet, configureSigner, setThreshold, loading, error } = useMultiSig(
    contractAddress,
    abi
  );
  const [signers, setSigners] = useState<string[]>([]);
  const [newSigner, setNewSigner] = useState("");
  const [threshold, setThresholdLocal] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getSignerSet(employer);
      if (mounted) setSigners(s);
    })();
    return () => {
      mounted = false;
    };
  }, [contractAddress, employer]);

  async function handleAdd() {
    if (!newSigner) return;
    await configureSigner(newSigner, true);
    const s = await getSignerSet(employer);
    setSigners(s);
    setNewSigner("");
  }

  async function handleSetThreshold() {
    await setThreshold(Number(threshold));
    setThresholdLocal(Number(threshold));
  }

  return (
    <div>
      <h3>Signer Management</h3>
      <div>
        <input value={newSigner} onChange={(e) => setNewSigner(e.target.value)} placeholder="0x..." />
        <button onClick={handleAdd} disabled={loading}>Add Signer</button>
      </div>
      <div>
        <label>Threshold:</label>
        <input type="number" value={threshold} onChange={(e) => setThresholdLocal(Number(e.target.value))} />
        <button onClick={handleSetThreshold} disabled={loading}>Set</button>
      </div>
      <div>
        <h4>Current Signers</h4>
        <ul>
          {signers.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      {error && <div style={{ color: "red" }}>{String(error)}</div>}
    </div>
  );
}
