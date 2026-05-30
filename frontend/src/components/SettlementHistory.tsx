import { useEffect, useState } from "react";
import { useCorridorSettlement, SettlementRecord } from "../hooks/useCorridorSettlement";

interface SettlementHistoryProps {
  teamId: string;
}

export function SettlementHistory({ teamId }: SettlementHistoryProps) {
  const { settlements, loading, error, getTeamSettlements } = useCorridorSettlement();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      setIsLoading(true);
      getTeamSettlements(teamId)
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
    }
  }, [teamId]);

  if (isLoading || loading) {
    return <div className="loading">Loading settlements...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (settlements.length === 0) {
    return <div className="info">No settlements found for this team.</div>;
  }

  const handleExport = () => {
    const csv = [
      ["Record ID", "Contractor", "Corridor", "Amount (USDC)", "Rate Reference", "Settled At", "Released"],
      ...settlements.map((s) => [
        s.recordId,
        s.contractor,
        s.corridorLabel,
        s.usdcAmount,
        s.exchangeRateRef,
        new Date(s.settledAt * 1000).toISOString(),
        s.released ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlements-${teamId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settlement-history">
      <div className="header">
        <h3>Settlement History</h3>
        <button onClick={handleExport} className="btn btn-secondary">
          Export CSV
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Contractor</th>
            <th>Corridor</th>
            <th>Amount (USDC)</th>
            <th>Rate Reference</th>
            <th>Settled At</th>
            <th>Released</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((settlement) => (
            <tr key={settlement.recordId}>
              <td>#{settlement.recordId}</td>
              <td>
                <span className="address">{settlement.contractor.slice(0, 6)}...{settlement.contractor.slice(-4)}</span>
              </td>
              <td>{settlement.corridorLabel}</td>
              <td className="amount">${(Number(settlement.usdcAmount) / 1e6).toFixed(2)}</td>
              <td className="rate-ref">{settlement.exchangeRateRef || "—"}</td>
              <td>{new Date(settlement.settledAt * 1000).toLocaleDateString()}</td>
              <td>
                <span className={settlement.released ? "status-released" : "status-pending"}>
                  {settlement.released ? "✓ Released" : "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stats">
        <p>Total Settlements: {settlements.length}</p>
        <p>Total Amount: ${(settlements.reduce((acc, s) => acc + Number(s.usdcAmount), 0) / 1e6).toFixed(2)}</p>
        <p>Released: {settlements.filter((s) => s.released).length}</p>
      </div>
    </div>
  );
}
