import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { usePayroll } from "../hooks/usePayroll";
import { formatUserError } from "../lib/errors";
import { CONTRACT_ADDRESSES, ERC20_ABI, MOCK_TOKEN_ABI, PAYSHIELD_POOL_ABI } from "../lib/config";

function PoolFunding() {
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState("Ready to fund pool");
  const [balance, setBalance] = useState<string>("—");
  const [allowance, setAllowance] = useState<string>("—");
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState("");
  const { address: employerAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { prepareStablecoinDisbursement, depositToPoolWithStatus } = usePayroll();

  // Fetch token address and balance/allowance
  useEffect(() => {
    (async () => {
      if (!publicClient || !employerAddress) {
        return;
      }

      try {
        const poolTokenAddress = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.pool,
          abi: PAYSHIELD_POOL_ABI,
          functionName: "usdc",
        })) as `0x${string}`;
        setTokenAddress(poolTokenAddress);

        const [bal, alw] = await Promise.all([
          publicClient.readContract({
            address: poolTokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [employerAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: poolTokenAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [employerAddress as `0x${string}`, CONTRACT_ADDRESSES.pool],
          }),
        ]);

        const balDisplay = (Number(bal) / 1_000_000).toFixed(2);
        const alwDisplay = (Number(alw) / 1_000_000).toFixed(2);
        setBalance(balDisplay);
        setAllowance(alwDisplay);
      } catch (e) {
        setBalance("Error");
        setAllowance("Error");
      }
    })();
  }, [publicClient, employerAddress]);

  const handleMint = async () => {
    if (!tokenAddress || !employerAddress) {
      setMintStatus("Please connect wallet first");
      return;
    }

    try {
      setIsMinting(true);
      setMintStatus("Minting test tokens...");
      const mintAmount = BigInt(Math.round(100 * 1_000_000));
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: MOCK_TOKEN_ABI,
        functionName: "mint",
        args: [employerAddress, mintAmount],
      });
      setMintStatus("Minting in progress...");
      await publicClient?.waitForTransactionReceipt({ hash });
      setMintStatus("✓ Minted 100 test tokens");
      // Refresh balance after mint
      setTimeout(async () => {
        const newBalance = await publicClient?.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [employerAddress],
        });
        setBalance((Number(newBalance) / 1_000_000).toFixed(2));
        setMintStatus("");
      }, 2000);
    } catch (error) {
      setMintStatus(formatUserError(error));
    } finally {
      setIsMinting(false);
    }
  };

  const statusTone =
    status === "Ready to fund pool" || status.startsWith("Pool funded")
      ? "success"
      : status.toLowerCase().includes("preparing")
        ? "idle"
        : status.toLowerCase().includes("submit") || status.toLowerCase().includes("approv") || status.toLowerCase().includes("checking")
          ? "idle"
          : "error";

  const onDeposit = async () => {
    try {
      setStatus("Preparing Reineira USDC units...");
      const baseUnits = await prepareStablecoinDisbursement(amount);

      await depositToPoolWithStatus(baseUnits, setStatus);
      setStatus(`Pool funded with ${amount} USDC`);
    } catch (error) {
      setStatus(formatUserError(error));
    }
  };

  return (
    <section className="form-grid">
      <div className="section-heading section-heading--compact">
        <h3>Pool Funding</h3>
      </div>

      <div className="glass-card" style={{
        padding: "0.9rem",
        borderRadius: "0.9rem",
        background: "rgba(139, 92, 246, 0.08)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        marginBottom: "0.75rem",
      }}>
        <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.85rem", color: "#94a3b8" }}>Test Token Status</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Your Balance</span><br />
            <span style={{ fontWeight: "700", color: "#f1f5f9" }}>{balance} mUSDC</span>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Pool Allowance</span><br />
            <span style={{ fontWeight: "700", color: "#f1f5f9" }}>{allowance} mUSDC</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="button button--secondary button--full"
        onClick={handleMint}
        disabled={isMinting}
        style={{ marginBottom: "0.6rem" }}
      >
        {isMinting ? "Minting..." : "Mint 100 Test Tokens"}
      </button>
      {mintStatus && (
        <div
          className={`status-pill status-pill--${mintStatus.startsWith("✓") ? "success" : "idle"}`}
          style={{ marginBottom: "0.6rem", width: "100%" }}
        >
          {mintStatus}
        </div>
      )}

      <div className="form-field form-field--full">
        <label htmlFor="pool-amount">Amount (mUSDC)</label>
        <input
          id="pool-amount"
          type="number"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="USDC amount"
        />
      </div>
      <button type="button" className="button button--full" onClick={onDeposit}>
        Deposit to Pool
      </button>
      <div className={`status-pill status-pill--${statusTone}`}>{status}</div>
    </section>
  );
}

export default PoolFunding;
