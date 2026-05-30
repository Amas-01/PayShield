import { useCorridorSettlement, Corridor } from "../hooks/useCorridorSettlement";
import styles from "../styles.css";

interface CorridorSelectorProps {
  selectedCorridorId: string;
  onSelect: (corridorId: string, label: string) => void;
}

export function CorridorSelector({ selectedCorridorId, onSelect }: CorridorSelectorProps) {
  const { corridors, loading, error } = useCorridorSettlement();

  if (loading) {
    return <div className="loading">Loading corridors...</div>;
  }

  if (error) {
    return <div className="error">Error loading corridors: {error}</div>;
  }

  const activCorridors = corridors.filter((c) => c.active);

  return (
    <div className="form-group">
      <label htmlFor="corridor">Payment Corridor</label>
      <select
        id="corridor"
        value={selectedCorridorId}
        onChange={(e) => {
          const selected = activCorridors.find((c) => c.id === e.target.value);
          if (selected) {
            onSelect(selected.id, selected.label);
          }
        }}
        className="form-control"
      >
        <option value="">Select a corridor...</option>
        {activCorridors.map((corridor) => (
          <option key={corridor.id} value={corridor.id}>
            {corridor.label} ({corridor.sourceRegion} → {corridor.destRegion})
          </option>
        ))}
      </select>
      {activCorridors.length === 0 && (
        <p className="text-warning">No active corridors available</p>
      )}
      <p className="text-muted">
        {activCorridors.length > 0 &&
          `${activCorridors.length} active corridor(s) available`}
      </p>
    </div>
  );
}
