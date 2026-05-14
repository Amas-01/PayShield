import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWalletClient, useWriteContract } from "wagmi";
import { ReineiraSDK, walletClientToSigner } from "@reineira-os/sdk";
import { CONTRACT_ADDRESSES, ERC20_ABI, PAYSHIELD_PAYROLL_ABI, PAYSHIELD_POOL_ABI, PAYSHIELD_REGISTRY_ABI } from "../lib/config";

type EncryptedInputStruct = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

type SubmitPayrollStatusHandler = (status: string) => void;
type DepositStatusHandler = (status: string) => void;
type ReineiraInitStatus = "idle" | "starting" | "done" | "error";

export function usePayroll() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: employerAddress } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [payrollError, setPayrollError] = useState<string>("");
  const [reineiraSdk, setReineiraSdk] = useState<any | null>(null);
  const [reineiraInitStatus, setReineiraInitStatus] = useState<ReineiraInitStatus>("idle");
  const [reineiraInitMessage, setReineiraInitMessage] = useState("Reineira SDK idle");

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!walletClient) {
        setReineiraSdk(null);
        setReineiraInitStatus("idle");
        setReineiraInitMessage("Connect a wallet to warm up Reineira");
        return;
      }

      setReineiraInitStatus("starting");
      setReineiraInitMessage("Starting Reineira FHE warmup...");

      try {
        const signer = await walletClientToSigner(walletClient as any);
        const sdk = ReineiraSDK.create({
          network: "testnet",
          signer,
          onFHEInit: (status) => {
            if (cancelled) return;

            if (status === "starting") {
              setReineiraInitStatus("starting");
              setReineiraInitMessage("Warming up Reineira FHE services...");
            } else if (status === "done") {
              setReineiraInitStatus("done");
              setReineiraInitMessage("Reineira SDK ready");
            } else {
              setReineiraInitStatus("error");
              setReineiraInitMessage("Reineira FHE warmup failed");
            }
          },
        });

        if (cancelled) return;

        setReineiraSdk(sdk);
        setReineiraInitMessage("Reineira SDK initialized");
      } catch {
        if (cancelled) return;

        setReineiraSdk(null);
        setReineiraInitStatus("error");
        setReineiraInitMessage("Failed to initialize Reineira SDK");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [walletClient]);

  const decodeCustomError = (errorData: string): string => {
    // Custom error signature -> message mapping
    const errorMap: Record<string, string> = {
      "0xc8c8dd8c": "This contractor is not registered to your account.",
      "0x48c1e9ec": "Your payroll pool has no funds. Please deposit USDC first.",
      "0xa86f7dbe": "Payroll was already submitted for this contractor recently. Wait 24 hours between submissions.",
    };

    const selector = errorData.slice(0, 10);
    return errorMap[selector] || "Transaction failed. Please check your inputs and try again.";
  };

  const handleError = (error: unknown): string => {
    const errorStr = String(error);
    
    if (errorStr.includes("0x") && errorStr.includes("data")) {
      try {
        const match = errorStr.match(/0x[a-fA-F0-9]+/);
        if (match) {
          return decodeCustomError(match[0]);
        }
      } catch {
        // Fallback to generic message
      }
    }

    if (errorStr.includes("user rejected")) {
      return "Transaction rejected. Please approve it in your wallet.";
    }

    if (errorStr.includes("insufficient funds")) {
      return "Insufficient funds in your wallet to pay for gas.";
    }

    if (errorStr.includes("network")) {
      return "Network error. Please check your connection and try again.";
    }

    return "Transaction failed. Please try again.";
  };

  const isConfigured = useMemo(() => {
    return (
      CONTRACT_ADDRESSES.payroll !== "0x0000000000000000000000000000000000000000" &&
      CONTRACT_ADDRESSES.pool !== "0x0000000000000000000000000000000000000000" &&
      CONTRACT_ADDRESSES.registry !== "0x0000000000000000000000000000000000000000"
    );
  }, []);

  const assertConfigured = () => {
    if (!isConfigured) {
      throw new Error("Set VITE_PAYSHIELD_* contract addresses before submitting transactions");
    }
  };

  const getFeeOverrides = async () => {
    if (!publicClient) {
      return {};
    }

    try {
      const estimatedFees = await publicClient.estimateFeesPerGas();
      if (estimatedFees.maxFeePerGas && estimatedFees.maxPriorityFeePerGas) {
        return {
          maxFeePerGas: (estimatedFees.maxFeePerGas * 115n) / 100n + 1n,
          maxPriorityFeePerGas: (estimatedFees.maxPriorityFeePerGas * 115n) / 100n + 1n,
        };
      }
    } catch {
    }

    try {
      const latestBlock = await publicClient.getBlock();
      const baseFeePerGas = latestBlock.baseFeePerGas ?? 0n;
      const maxPriorityFeePerGas = 1_000_000n;
      const maxFeePerGas =
        baseFeePerGas > 0n
          ? baseFeePerGas * 2n + maxPriorityFeePerGas
          : maxPriorityFeePerGas * 2n;

      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    } catch {
      return {};
    }
  };

  const ensureContractorRegistered = async (contractor: `0x${string}`, onStatusChange?: SubmitPayrollStatusHandler) => {
    assertConfigured();

    if (!publicClient || !walletClient || !employerAddress) {
      throw new Error("Connect wallet before submitting payroll");
    }

    onStatusChange?.("Checking contractor registration...");

    const isRegistered = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: PAYSHIELD_REGISTRY_ABI,
      functionName: "isEmployerContractor",
      args: [employerAddress, contractor],
    });

    if (isRegistered) {
      onStatusChange?.("Contractor already registered. Preparing payroll transaction...");
      return;
    }

    onStatusChange?.("Registering contractor on-chain...");
    const feeOverrides = await getFeeOverrides();

    const registerHash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.registry,
      abi: PAYSHIELD_REGISTRY_ABI,
      functionName: "registerContractor",
      args: [contractor],
      ...feeOverrides,
    });

    onStatusChange?.("Waiting for contractor registration confirmation...");
    await publicClient.waitForTransactionReceipt({ hash: registerHash });
    onStatusChange?.("Contractor registered. Preparing payroll transaction...");
  };

  const submitPayroll = async (
    contractor: `0x${string}`,
    encryptedHours: EncryptedInputStruct,
    encryptedRate: EncryptedInputStruct,
    onStatusChange?: SubmitPayrollStatusHandler
  ) => {
    setPayrollError("");
    try {
      await ensureContractorRegistered(contractor, onStatusChange);
      onStatusChange?.("Submitting encrypted payroll transaction...");
      const feeOverrides = await getFeeOverrides();

      return writeContractAsync({
        address: CONTRACT_ADDRESSES.payroll,
        abi: PAYSHIELD_PAYROLL_ABI,
        functionName: "submitPayroll",
        args: [contractor, encryptedHours, encryptedRate],
        ...feeOverrides,
      });
    } catch (error) {
      const message = handleError(error);
      setPayrollError(message);
      throw error;
    }
  };

  const confirmPayroll = async (contractor: `0x${string}`) => {
    setPayrollError("");
    try {
      assertConfigured();

      const feeOverrides = await getFeeOverrides();

      return writeContractAsync({
        address: CONTRACT_ADDRESSES.payroll,
        abi: PAYSHIELD_PAYROLL_ABI,
        functionName: "confirmPayroll",
        args: [contractor],
        ...feeOverrides,
      });
    } catch (error) {
      const message = handleError(error);
      setPayrollError(message);
      throw error;
    }
  };

  const prepareStablecoinDisbursement = async (amount: string) => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Enter a valid USDC amount");
    }

    if (reineiraSdk) {
      return reineiraSdk.usdc(parsed);
    }

    return BigInt(Math.round(parsed * 1_000_000));
  };

  const fundPayrollEscrowWithReineira = async (amount: string, onStatusChange?: DepositStatusHandler) => {
    setPayrollError("");

    if (!reineiraSdk || !walletClient || !employerAddress) {
      throw new Error("Connect wallet and wait for Reineira initialization before funding via escrow");
    }

    onStatusChange?.("Preparing Reineira escrow funding...");
    const baseUnits = reineiraSdk.usdc(amount);

    onStatusChange?.("Creating Reineira escrow vault...");
    const escrow = await reineiraSdk.escrow.create({
      amount: baseUnits,
      owner: CONTRACT_ADDRESSES.pool,
    });

    onStatusChange?.("Auto-approving and funding escrow...");
    const result = await escrow.fund(baseUnits, { autoApprove: true });

    onStatusChange?.("Reineira escrow funded successfully");
    return result;
  };

  const depositToPool = async (amount: bigint) => {
    assertConfigured();

    if (!publicClient || !walletClient || !employerAddress) {
      throw new Error("Connect wallet before depositing to pool");
    }

    const poolTokenAddress = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.pool,
      abi: PAYSHIELD_POOL_ABI,
      functionName: "usdc",
    });

    const [balance, allowance] = await Promise.all([
      publicClient.readContract({
        address: poolTokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [employerAddress],
      }),
      publicClient.readContract({
        address: poolTokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [employerAddress, CONTRACT_ADDRESSES.pool],
      }),
    ]);

    if (balance < amount) {
      throw new Error("Insufficient USDC balance. Mint/fund USDC in your employer wallet, then retry.");
    }

    if (allowance < amount) {
      const approveFeeOverrides = await getFeeOverrides();
      // Approve unlimited (max uint256) to avoid re-approval on future deposits
      const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      const approveHash = await writeContractAsync({
        address: poolTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.pool, maxApproval],
        ...approveFeeOverrides,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    const feeOverrides = await getFeeOverrides();

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.pool,
      abi: PAYSHIELD_POOL_ABI,
      functionName: "deposit",
      args: [amount],
      ...feeOverrides,
    });
  };

  const depositToPoolWithStatus = async (amount: bigint, onStatusChange?: DepositStatusHandler) => {
    setPayrollError("");
    try {
      assertConfigured();

      if (!publicClient || !walletClient || !employerAddress) {
        throw new Error("Connect wallet before depositing to pool");
      }

      onStatusChange?.("Depositing USDC to payroll pool...");
      onStatusChange?.("Resolving pool token address...");
      const poolTokenAddress = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.pool,
        abi: PAYSHIELD_POOL_ABI,
        functionName: "usdc",
      });

      onStatusChange?.("Checking USDC balance and allowance...");
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({
          address: poolTokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [employerAddress],
        }),
        publicClient.readContract({
          address: poolTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [employerAddress, CONTRACT_ADDRESSES.pool],
        }),
      ]);

      if (balance < amount) {
        throw new Error("Insufficient USDC balance. Mint/fund USDC in your employer wallet, then retry.");
      }

      if (allowance < amount) {
        onStatusChange?.("Approving pool to spend USDC...");
        const approveFeeOverrides = await getFeeOverrides();
        // Approve unlimited (max uint256) to avoid re-approval on future deposits
        const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        const approveHash = await writeContractAsync({
          address: poolTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.pool, maxApproval],
          ...approveFeeOverrides,
        });

        onStatusChange?.("Waiting for approval confirmation...");
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      onStatusChange?.("Submitting pool deposit transaction...");
      const feeOverrides = await getFeeOverrides();

      return writeContractAsync({
        address: CONTRACT_ADDRESSES.pool,
        abi: PAYSHIELD_POOL_ABI,
        functionName: "deposit",
        args: [amount],
        ...feeOverrides,
      });
    } catch (error) {
      const message = handleError(error);
      setPayrollError(message);
      throw error;
    }
  };

  const clearError = () => setPayrollError("");

  return {
    hash,
    isPending,
    isConfigured,
    receipt,
    payrollError,
    reineiraInitStatus,
    reineiraInitMessage,
    clearError,
    getFeeOverrides,
    submitPayroll,
    confirmPayroll,
    prepareStablecoinDisbursement,
    fundPayrollEscrowWithReineira,
    depositToPool,
    depositToPoolWithStatus,
  };
}
