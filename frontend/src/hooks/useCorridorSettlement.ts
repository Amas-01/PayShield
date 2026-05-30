import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { deploymentConfig } from "../lib/config";

export interface Corridor {
  id: string;
  label: string;
  sourceRegion: string;
  destRegion: string;
  active: boolean;
  registeredAt: number;
  totalSettlements: number;
}

export interface SettlementRecord {
  recordId: number;
  teamId: string;
  employer: string;
  contractor: string;
  corridorId: string;
  corridorLabel: string;
  exchangeRateRef: string;
  usdcAmount: string;
  settledAt: number;
  released: boolean;
}

interface UseCorridorSettlementReturn {
  corridors: Corridor[];
  settlements: SettlementRecord[];
  loading: boolean;
  error: string | null;
  getSupportedCorridors: () => Promise<void>;
  getTeamSettlements: (teamId: string) => Promise<void>;
  getContractorRecords: (teamId: string, contractorAddress: string) => Promise<void>;
  setExchangeRateRef: (teamId: string, rateRef: string) => Promise<void>;
}

export function useCorridorSettlement(): UseCorridorSettlementReturn {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSupportedCorridors = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const corridorRegistry = new Contract(
        deploymentConfig.contracts.PayShieldCorridorRegistry,
        deploymentConfig.abis.corridorRegistry,
        provider
      );

      const count = await corridorRegistry.corridorCount();
      const loadedCorridors: Corridor[] = [];

      for (let i = 0; i < Number(count); i++) {
        const corridor = await corridorRegistry.getCorridor(i);
        loadedCorridors.push({
          id: corridor.corridorId,
          label: corridor.label,
          sourceRegion: corridor.sourceRegion,
          destRegion: corridor.destRegion,
          active: corridor.active,
          registeredAt: Number(corridor.registeredAt),
          totalSettlements: Number(corridor.totalSettlements),
        });
      }

      setCorridors(loadedCorridors);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load corridors";
      setError(message);
      console.error("Error loading corridors:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTeamSettlements = async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const settlementRouter = new Contract(
        deploymentConfig.contracts.PayShieldSettlementRouter,
        deploymentConfig.abis.settlementRouter,
        signer
      );

      const records = await settlementRouter.getTeamSettlements(teamId);
      setSettlements(
        records.map((r: any) => ({
          recordId: Number(r.recordId),
          teamId: r.teamId,
          employer: r.employer,
          contractor: r.contractor,
          corridorId: r.corridorId,
          corridorLabel: r.corridorLabel,
          exchangeRateRef: r.exchangeRateRef,
          usdcAmount: r.usdcAmount.toString(),
          settledAt: Number(r.settledAt),
          released: r.released,
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load team settlements";
      setError(message);
      console.error("Error loading team settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  const getContractorRecords = async (teamId: string, contractorAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const settlementRouter = new Contract(
        deploymentConfig.contracts.PayShieldSettlementRouter,
        deploymentConfig.abis.settlementRouter,
        signer
      );

      const records = await settlementRouter.getContractorRecords(teamId, contractorAddress);
      setSettlements(
        records.map((r: any) => ({
          recordId: Number(r.recordId),
          teamId: r.teamId,
          employer: r.employer,
          contractor: r.contractor,
          corridorId: r.corridorId,
          corridorLabel: r.corridorLabel,
          exchangeRateRef: r.exchangeRateRef,
          usdcAmount: r.usdcAmount.toString(),
          settledAt: Number(r.settledAt),
          released: r.released,
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load contractor records";
      setError(message);
      console.error("Error loading contractor records:", err);
    } finally {
      setLoading(false);
    }
  };

  const setExchangeRateRef = async (teamId: string, rateRef: string) => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const settlementRouter = new Contract(
        deploymentConfig.contracts.PayShieldSettlementRouter,
        deploymentConfig.abis.settlementRouter,
        signer
      );

      const tx = await settlementRouter.setExchangeRateRef(teamId, rateRef);
      await tx.wait();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set exchange rate reference";
      setError(message);
      console.error("Error setting exchange rate reference:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load corridors on mount
  useEffect(() => {
    getSupportedCorridors();
  }, []);

  return {
    corridors,
    settlements,
    loading,
    error,
    getSupportedCorridors,
    getTeamSettlements,
    getContractorRecords,
    setExchangeRateRef,
  };
}
