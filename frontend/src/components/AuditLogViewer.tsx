import React, { useEffect, useState } from "react";
import useAuditLog from "../hooks/useAuditLog";

type Props = { contractAddress: string; abi: any; employer: string };

export default function AuditLogViewer({ contractAddress, abi, employer }: Props) {
  const { getLogs, getLogCount } = useAuditLog(contractAddress, abi);
  const [logs, setLogs] = useState<any[]>([]);
  const [count, setCount] = useState<BigInt>(BigInt(0));

  useEffect(() => {
    let mounted = true;
    (async () => {
      const c = await getLogCount(employer);
      const l = await getLogs(employer, 0, 50);
      if (mounted) {
        setCount(c);
        setLogs(l);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [contractAddress, employer]);

  return (
    <div>
      <h3>Audit Log ({String(count)})</h3>
      <ul>
        {logs.map((e, i) => (
          <li key={i}>
            <div>
              <strong>{e.author}</strong> — action {e.action} @ {String(e.timestamp)}
            </div>
            <div>{e.metadata}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
