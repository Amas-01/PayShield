import { ethers } from "hardhat";

async function main() {
  const tokenFactory = await ethers.getContractFactory("MockFHERC20");
  const token = await tokenFactory.deploy();
  await token.waitForDeployment();

  console.log("MockFHERC20:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
