import { task } from "hardhat/config";

task("process-payout", "Triggers a contractor payout attempt")
  .addParam("token", "IFHERC20 token address")
  .addParam("recipient", "Recipient wallet")
  .addParam("amount", "Token amount")
  .setAction(async ({ token, recipient, amount }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const escrow = await hre.ethers.getContractAt("PayShieldEscrow", process.env.PAYSHIELD_ESCROW_ADDRESS || "") as any;
    const tx = await escrow.connect(signer).release(token, recipient, amount);
    await tx.wait();
    console.log(`Payout attempted: ${amount} tokens to ${recipient}`);
  });
