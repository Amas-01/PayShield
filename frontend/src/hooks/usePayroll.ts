import { useMemo } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWalletClient, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, ERC20_ABI, PAYSHIELD_PAYROLL_ABI, PAYSHIELD_POOL_ABI, PAYSHIELD_REGISTRY_ABI } from "../lib/config";

type EncryptedInputStruct = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

type SubmitPayrollStatusHandler = (status: string) => void;
type DepositStatusHandler = (status: string) => void;

export function usePayroll() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: employerAddress } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

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
  };

  const confirmPayroll = async (contractor: `0x${string}`) => {
    assertConfigured();

    const feeOverrides = await getFeeOverrides();

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.payroll,
      abi: PAYSHIELD_PAYROLL_ABI,
      functionName: "confirmPayroll",
      args: [contractor],
      ...feeOverrides,
    });
  };

  const prepareStablecoinDisbursement = async (amount: string) => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Enter a valid USDC amount");
    }
    return BigInt(Math.round(parsed * 1_000_000));
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
      const approveHash = await writeContractAsync({
        address: poolTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.pool, amount],
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
    assertConfigured();

    if (!publicClient || !walletClient || !employerAddress) {
      throw new Error("Connect wallet before depositing to pool");
    }

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
      const approveHash = await writeContractAsync({
        address: poolTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.pool, amount],
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
  };

  return {
    hash,
    isPending,
    isConfigured,
    receipt,
    submitPayroll,
    confirmPayroll,
    prepareStablecoinDisbursement,
    depositToPool,
    depositToPoolWithStatus,
  };
}
