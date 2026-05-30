import { useEffect, useState } from "react";
import { useCorridorSettlement, SettlementRecord } from "../hooks/useCorridorSettlement";

interface ContractorSettlementsProps {
  teamId: string;
  contractorAddress: string;
}

export function ContractorSettlements({ teamId, contractorAddress }: ContractorSettlementsProps) {
  const { settlements, loading, error, getContractorRecords } = useCorridorSettlement();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teamId && contractorAddress) {
      setIsLoading(true);
      getContractorRecords(teamId, contractorAddress)
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
    }
  }, [teamId, contractorAddress]);

  if (isLoading || loading) {
    return <div className="loading">Loading your settlements...</div>;
  }

  if (error) {
    return (
      <div className="error">
        Unable to load settlements: {error}
      </div>
    );
  }

  if (settlements.length === 0) {
    return <div className="info">You have no settlement records yet.</div>;
  }

  const totalAmount = settlements.reduce((acc, s) => acc + Number(s.usdcAmount), 0);
  const releasedAmount = settlements
    .filter((s) => s.released)
    .reduce((acc, s) => acc + Number(s.usdcAmount), 0);

  return (
    <div className="contractor-settlements">
      <div className="info-cards">
        <div className="card">
          <h4>Total Settlements</h4>
          <p className="value">{settlements.length}</p>
        </div>
        <div className="card">
          <h4>Total Amount</h4>
          <p className="value">${(totalAmount / 1e6).toFixed(2)}</p>
        </div>
        <div className="card">
          <h4>Released</h4>
          <p className="value">${(releasedAmount / 1e6).toFixed(2)}</p>
        </div>
        <div className="card">
          <h4>Pending</h4>
          <p className="value">${((totalAmount - releasedAmount) / 1e6).toFixed(2)}</p>
        </div>
      </div>

      <div className="settlements-list">
        <h3>Your Settlement Records</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Corridor</th>
              <th>Amount (USDC)</th>
              <th>Settled At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((settlement) => (
              <tr key={settlement.recordId}>
                <td>#{settlement.recordId}</td>
                <td className="corridor-label">{settlement.corridorLabel}</td>
                <td className="amount">${(Number(settlement.usdcAmount) / 1e6).toFixed(2)}</td>
                <td>{new Date(settlement.settledAt * 1000).toLocaleDateString()}</td>
                <td>
                  <span className={settlement.released ? "status-released" : "status-pending"}>
                    {settlement.released ? "✓ Released" : "⏳ Processing"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note">
        <p className="text-muted">
          💡 Your settlements are tagged with their payment corridor for compliance tracking.
          Rate references are visible to your employer and auditors only.
        </p>
      </div>
    </div>
  );
}
