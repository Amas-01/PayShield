# PayShield Gas Benchmarks

## Environment
- Network: Arbitrum Sepolia
- Hardhat version: 2.26.x
- Test date: [date]

## Results

| Function | Mock Gas | Testnet Gas | Notes |
|---|---:|---:|---|
| submitPayroll() |  |  | FHE.mul on euint32 x euint32 |
| deposit() |  |  | USDC transfer + pool update |
| release() |  |  | Escrow → contractor transfer |
| registerContractor() |  |  | Registry mapping write |

## FHE Operation Overhead

Compare standard ERC-20 transfer gas vs FHE-encrypted transfer gas
