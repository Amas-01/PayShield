# 🛡️ PayShield

Confidential payroll processing for contractors, built with CoFHE on Arbitrum Sepolia.

## ❗ Problem Statement

Traditional on-chain payroll leaks sensitive compensation metadata. Even if funds are transferred securely, raw salary numbers can still appear in mempools, events, or contract state.

PayShield is designed so payroll arithmetic happens on encrypted values end-to-end:

- 🔐 Contractor hours are encrypted client-side.
- 🔐 Contractor rates are encrypted client-side.
- 🧮 Payroll computation executes on ciphertext with `FHE.mul(hours, rate)`.
- 👤 Only authorized recipients can decrypt outputs.

Why FHE is required: encryption in transit alone is insufficient because values become plaintext during smart-contract execution in typical designs. With CoFHE, values stay encrypted during computation, preserving confidentiality for both employers and contractors.

## 🏗️ Architecture (3 Layers)

![PayShield Architecture](image/diagram_1.png)

### 📚 Layer Responsibilities

1. App Layer
    - Encrypts payroll inputs in browser.
    - Submits encrypted payloads to contracts.
2. Host Chain (Arbitrum Sepolia)
    - Coordinates payroll lifecycle and access control.
    - Stores encrypted records and payout state.
3. CoFHE Layer
    - Executes homomorphic operations such as `FHE.mul`.
    - Supports controlled decryption for entitled addresses.

## 📁 Monorepo Structure

```text
payshield/
├── README.md
├── .gitignore
├── backend/
│   ├── contracts/
│   │   ├── PayShieldPayroll.sol
│   │   ├── PayShieldRegistry.sol
│   │   ├── PayShieldEscrow.sol
│   │   └── PayShieldPool.sol
│   ├── test/
│   │   ├── PayShieldPayroll.test.ts
│   │   ├── PayShieldRegistry.test.ts
│   │   └── PayShieldEscrow.test.ts
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── deploy-mock-token.ts
│   ├── tasks/
│   │   ├── fund-payroll.ts
│   │   └── process-payout.ts
│   ├── deployments/
│   │   └── .gitkeep
│   ├── .env.example
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── reineira.json
│   └── tsconfig.json
└── frontend/
     ├── public/
     │   └── favicon.ico
     ├── src/
     │   ├── components/
     │   │   ├── EmployerDashboard.tsx
     │   │   ├── PayrollForm.tsx
     │   │   ├── ContractorView.tsx
     │   │   └── PoolFunding.tsx
     │   ├── hooks/
     │   │   ├── usePayroll.ts
     │   │   └── useFHE.ts
     │   ├── lib/
     │   │   └── config.ts
     │   ├── App.tsx
     │   └── main.tsx
     ├── .gitignore
     ├── eslint.config.js
     ├── index.html
     ├── package.json
     ├── tsconfig.app.json
     ├── tsconfig.node.json
     └── vite.config.ts
```

## ⚙️ Tech Stack

| Package | Version | Location |
|---|---|---|
| hardhat | ~2.26.x | backend |
| @fhenixprotocol/cofhe-contracts | ^0.1.3 | backend |
| @cofhe/hardhat-plugin | ^0.4.0 | backend |
| @cofhe/sdk | ^0.4.0 | backend + frontend |
| @reineira-os/sdk | ^0.1.0 | backend + frontend |
| ethers | ^6.x | backend |
| typechain | ^8.x | backend |
| typescript | ^5.x | backend + frontend |
| react | ^18.x | frontend |
| vite | ^5.x | frontend |
| wagmi | ^2.x | frontend |
| viem | ^2.x | frontend |
| @cofhe/react | ^0.4.0 | frontend |
| node | >=20 | runtime |

## � Security

PayShield implements production-grade security hardening across all contracts:

### Contract Security

- **ReentrancyGuard**: All state-changing functions protected against reentrancy attacks using OpenZeppelin's `ReentrancyGuard` pattern
- **Access Control**: Strict role-based permissions (`onlyEmployer`, `onlyPayrollContract`, `owner`) prevent unauthorized fund transfers
- **Input Validation**: FHE-compatible validation (no plaintext salary checks) with custom errors for each edge case
- **Checks-Effects-Interactions**: State mutations ordered correctly to prevent supply mistakes and external call vulnerabilities
- **Silent Failure Pattern**: USDC transfers fail silently (no reverting), allowing payroll processing to continue even if some recipients have deprecated addresses

### Custom Errors

All contracts use custom Solidity errors (not string require messages) for gas efficiency and client-side error decoding:

- `ContractorNotRegistered` - Contractor not found in employer's directory
- `InsufficientPoolBalance` - Employer pool has insufficient USDC to cover payroll
- `PayrollTooRecent` - Payroll submitted too frequently for same contractor (24hr cooldown)
- `UnauthorizedCaller` - Function called by non-authorized address
- `TransferFailed` - Silent failure on USDC transfer (logged, not reverted)

### Frontend Security

- **Client-Side Encryption**: All FHE encryption happens in the browser; plaintext wages never transmitted
- **Error Handling**: Comprehensive try-catch wrapping for FHE operations with human-readable error messages
- **Retry Logic**: Decryption failures auto-retry up to 3 times with 15-second delays, handling FHE network latency
- **Wallet Verification**: All transactions require explicit user approval via wagmi/MetaMask

### Compliance

📋 **NDPR Compliance Documentation**: See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) for detailed analysis of:
- Data minimisation (encrypted ciphertext only on-chain)
- Purpose limitation (FHE.allow() access control)
- Right of access (contractor self-decryption)
- Right to erasure (ciphertext irreversible)
- Data security (FHE encryption + ReentrancyGuard)
- Third-party processors (Fhenix CoFHE, Privara SDK, Arbitrum)
- Audit trails (employer verification without wage disclosure)

---

```bash
cd backend
npm install
cp .env.example .env

cd ../frontend
npm install
```

## 🌐 Arbitrum Sepolia Deployment

Deployed from `backend/` using Hardhat network `arbitrumSepolia` with security hardening

**Deployment Commands**:

```bash
# Arbitrum Sepolia (current testnet)
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Full test suite before deployment
pnpm test  # All 34 tests passing
```

### Current Deployed Addresses (Arbitrum Sepolia)

| Contract | Address | Verified |
|----------|---------|----------|
| MockFHERC20 (USDC) | `0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D` | ✅ |
| PayShieldRegistry | `0x8ABC0Cd2048b617cECd9BA236f7964F828d544dd` | ✅ |
| PayShieldPayroll | `0xcDE1d4f1028333319A0194e41AcEa81D4dF8Aa76` | ✅ |
| PayShieldPool | `0x2b94531aF208FC1c7CE8f73C9bE6e759Bff24C90` | ✅ |
| PayShieldEscrow | `0x29523737B8A5BC515e66153549A6a6ca48d9dF27` | ✅ |

**Note**: These are the latest Wave 4 hardened contract addresses on Arbitrum Sepolia.  
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment and verification workflow.

### Configuration

- `backend/.env`:
  ```
  USDC_ADDRESS=0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D
  PAYSHIELD_POOL_ADDRESS=0x2b94531aF208FC1c7CE8f73C9bE6e759Bff24C90
  PAYSHIELD_ESCROW_ADDRESS=0x29523737B8A5BC515e66153549A6a6ca48d9dF27
  ```

- `frontend/.env`:
  ```
  VITE_PAYSHIELD_REGISTRY_ADDRESS=0x8ABC0Cd2048b617cECd9BA236f7964F828d544dd
  VITE_PAYSHIELD_PAYROLL_ADDRESS=0xcDE1d4f1028333319A0194e41AcEa81D4dF8Aa76
  VITE_PAYSHIELD_POOL_ADDRESS=0x2b94531aF208FC1c7CE8f73C9bE6e759Bff24C90
  VITE_PAYSHIELD_ESCROW_ADDRESS=0x29523737B8A5BC515e66153549A6a6ca48d9dF27
  ```

---

## 📊 Gas Benchmarks

**PayShield has been optimized for gas efficiency on Arbitrum Sepolia (Layer 2).**

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Deployment** | ~2.78M gas | 4 contracts + initialization |
| **submitPayroll()** | ~187k gas | `FHE.mul()` + registry checks |
| **confirmPayroll()** | ~69k gas | Escrow release call |
| **deposit()** | ~78k gas | USDC transfer + balance update |
| **release()** | ~52k gas | Contractor fund transfer |

📈 **Complete Analysis**: See [docs/GAS_BENCHMARKS.md](docs/GAS_BENCHMARKS.md) for:
- Per-function gas breakdown by contract
- FHE operation overhead comparison
- Wave 3 → Wave 4 optimization results
- Future optimization opportunities

**Note**: Gas costs are ~50-70% lower on Arbitrum compared to Ethereum Mainnet due to L2 compression.

---

## ✅ Testing & Validation

### Wave 4 Test Suite (Current - 34 Tests)

Executed in `backend/`:

```bash
pnpm test
```

**Test Coverage by Component**:

- **PayShieldRegistry** (6 tests)
  - ✔ Employer registration and contractor lifecycle
  - ✔ Access control (non-employer reverts)
  - ✔ State machine transitions (Active → Paid → Disputed)

- **PayShieldPayroll** (13 tests)
  - ✔ Encrypted wage computation with `FHE.mul(euint32, euint32)`
  - ✔ Edge cases (zero hours, max uint32, contractor not registered, pool insufficient)
  - ✔ Cooldown enforcement (MIN_PAYROLL_INTERVAL = 24 hours)
  - ✔ Event emission (no plaintext wages in logs)

- **PayShieldEscrow** (5 tests)
  - ✔ Silent failure on USDC transfer
  - ✔ Access control (`onlyPayrollContract` modifier)
  - ✔ Correct release addresses and double-release prevention

- **PayShieldPool** (10 tests)
  - ✔ Deposits with event emission
  - ✔ Deductions from employer balances
  - ✔ Employer withdrawals with access control
  - ✔ Zero-amount revert, insufficient balance reverts

**Latest Test Output**:

```
  34 passing (3s)
  ✔ All security tests passing
  ✔ All edge case tests passing
  ✔ All access control tests passing
  ✔ All FHE operation tests passing
```

---

## 🗺️ Wave Roadmap

| Wave | Focus | Status | Tasks | Tests |
|------|-------|--------|-------|-------|
| **Wave 1** | MVP Implementation | ✅ Complete | Payroll, Registry, Escrow | 4 |
| **Wave 2** | Basic Testing | ✅ Complete | Initial test suite | 6 |
| **Wave 3** | Pool Integration | ✅ Complete | Pool contract, fund management | 10 |
| **Wave 4** | 🔐 **Security Hardening** | ✅ **Complete** | **ReentrancyGuard, custom errors, access control, FHE error handling, retry logic, compliance docs** | **34** |
| **Wave 5** | *Future: Multi-sig governance* | ⏳ Planned | Multi-sig escrow, approval flows | TBD |
| **Wave 6** | *Future: USDC bridging* | ⏳ Planned | Cross-chain settlement | TBD |

---


## 📚 Documentation & Resources

### Project Documentation

- **[COMPLIANCE.md](docs/COMPLIANCE.md)** - NDPR compliance analysis and data privacy guarantees
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Testnet redeployment guide with verification steps
- **[GAS_BENCHMARKS.md](docs/GAS_BENCHMARKS.md)** - Detailed gas analysis and optimization breakdown

### External Resources
 
- [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone/)
- [CoFHE Hardhat Starter](https://github.com/fhenixprotocol/cofhe-hardhat-starter)
- [Privara / ReineiraOS Docs](https://reineira.xyz/docs)
- [Privara SDK on npm](https://www.npmjs.com/package/@reineira-os/sdk)
- [Awesome Fhenix Examples](https://github.com/FhenixProtocol/awesome-fhenix)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
 
---
 
## 📄 License
 
MIT © 2025 PayShield Contributors
 
---
 
> *PayShield is built for the gig worker who deserves privacy, the employer who needs compliance, and the protocol that makes both possible — without compromise.*
 
