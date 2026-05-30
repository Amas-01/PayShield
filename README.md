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

| Contract | Address | Deployed | Verified |
|----------|---------|----------|----------|
| MockFHERC20 (USDC) | `0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D` | ✅ | ✅ |
| PayShieldAuditLog | `0x48442F565683E7D34C2aB197f8196b8e2BB11c62` | ✅ | ⏳ |
| PayShieldRegistry | `0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC` | ✅ | ✅ |
| PayShieldPayroll | `0xd2197d44A153a76B8784d23Df1034a5F80fC3675` | ✅ | ⏳ |
| PayShieldMultiSig | `0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133` | ✅ | ⏳ |
| PayShieldPool | `0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3` | ✅ | ✅ |
| PayShieldEscrow | `0x0a0D6b01F61EA7e50208414b9D015320160F4D99` | ✅ | ⏳ |
| PayShieldCorridorRegistry | `0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7` | ✅ | ⏳ |
| PayShieldSettlementRouter | `0xC034ce5f034c4f39EF775b055c9B361fD76b0937` | ✅ | ⏳ |

**Deployment Date**: May 29, 2026  
**Network**: Arbitrum Sepolia (Chain ID: 421614)  
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment verification workflow.

### Configuration

- `backend/.env`:
  ```
  USDC_ADDRESS=0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D
  PAYSHIELD_POOL_ADDRESS=0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3
  PAYSHIELD_ESCROW_ADDRESS=0x0a0D6b01F61EA7e50208414b9D015320160F4D99
  ```

- `frontend/.env`:
  ```
  VITE_PAYSHIELD_AUDITLOG_ADDRESS=0x48442F565683E7D34C2aB197f8196b8e2BB11c62
  VITE_PAYSHIELD_REGISTRY_ADDRESS=0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC
  VITE_PAYSHIELD_PAYROLL_ADDRESS=0xd2197d44A153a76B8784d23Df1034a5F80fC3675
  VITE_PAYSHIELD_MULTISIG_ADDRESS=0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133
  VITE_PAYSHIELD_POOL_ADDRESS=0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3
  VITE_PAYSHIELD_ESCROW_ADDRESS=0x0a0D6b01F61EA7e50208414b9D015320160F4D99
  VITE_PAYSHIELD_CORRIDOR_REGISTRY_ADDRESS=0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7
  VITE_PAYSHIELD_SETTLEMENT_ROUTER_ADDRESS=0xC034ce5f034c4f39EF775b055c9B361fD76b0937
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

## 🌍 Payment Corridors (Wave 5)

PayShield Wave 5 includes **Payment Corridor Tagging** for cross-border payroll settlements:

| Corridor | Route | Status | Settlements |
|----------|-------|--------|-------------|
| Nigeria-UK | NG → GB | Active | 0 |
| Kenya-India | KE → IN | Active | 0 |

**Corridor Features**:
- 🏷️ **Corridor Labeling**: Employers tag USDC disbursements with destination corridors (e.g., "Nigeria-UK")
- 💱 **Exchange Rate References**: Employers store up to 64-byte rate metadata per team (e.g., "CBN-2025-05-23")
- 📊 **Settlement Tracking**: Each corridor tracks total disbursements and settlement counts
- 🔐 **Team Isolation**: Settlement records isolated by `teamId` (keccak256 of employer address)
- 📋 **Audit Logging**: All corridor operations logged via `PayShieldAuditLog` with immutable records
- 👁️ **Privacy Preserved**: Corridor labels are plaintext for routing; underlying wage amounts **remain encrypted from Wave 5**

**Usage Flow**:
1. Employer calls `setExchangeRateRef(teamId, rateRef)` to store corridor metadata
2. `PayShieldMultiSig` routes settlement via `routeSettlement(teamId, employer, contractor, corridorId, usdcAmount)`
3. `PayShieldSettlementRouter` verifies corridor is active, calls `PayShieldEscrow.release()`, logs to audit
4. Contractors view their records via `getContractorRecords(teamId)` without seeing exchange rate metadata
5. Employers view full settlement history via `getTeamSettlements(teamId)` including rate references

**Compliance**: See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) Section 9 for NDPR analysis of corridor tagging.

---

## ✅ Testing & Validation

### Wave 5 Test Suite (Current - 97 Tests)

Executed in `backend/`:

```bash
pnpm test
```

**Test Coverage by Component**:

- **PayShieldRegistry** (6 tests) — Wave 4 baseline
- **PayShieldPayroll** (13 tests) — Wave 4 baseline
- **PayShieldEscrow** (5 tests) — Wave 4 baseline + Wave 6 updates
- **PayShieldPool** (10 tests) — Wave 4 baseline
- **PayShieldMultiSig** (5 tests) — Wave 5
- **PayShieldAuditLog** (16 tests) — Wave 5+
- **PayShieldCorridorRegistry** (24 tests) — **Wave 5**
  - ✔ Constructor initializes Nigeria-UK and Kenya-India corridors
  - ✔ registerCorridor(), pauseCorridor(), resumeCorridor() lifecycle
  - ✔ setSettlementRouter() one-time authorization
  - ✔ incrementSettlementCount() router-only access
  - ✔ View functions and edge cases (duplicate labels, max corridors)
- **PayShieldSettlementRouter** (18 tests) — **Wave 5**
  - ✔ setExchangeRateRef() with team isolation and validation
  - ✔ routeSettlement() with MultiSig-only access, corridor validation, team isolation
  - ✔ getTeamSettlements() employer-only access
  - ✔ getContractorRecords() contractor-only access
  - ✔ Data isolation enforcement (team-based mappings)

**Latest Test Output**:

```
  97 passing (5s)
  ✔ All Wave 6 corridor tests passing
  ✔ All Wave 6 settlement router tests passing
  ✔ All data isolation tests passing
  ✔ All access control tests passing
  ✔ All FHE operation tests passing
```

---

## 📊 Gas Benchmarks (Wave 5 - Current)

**PayShield has been optimized for gas efficiency on Arbitrum Sepolia (Layer 2).**

| Function | Wave | Contract | Gas | Notes |
|----------|------|----------|-----|-------|
| submitPayroll() | W4 | Payroll | ~187k | FHE.mul() + registry checks |
| confirmPayroll() | W4 | Escrow | ~69k | Fund release |
| deposit() | W4 | Pool | ~78k | USDC transfer + balance |
| registerCorridor() | W5 | CorridorRegistry | ~65k | New corridor creation |
| routeSettlement() | W5 | SettlementRouter | ~95k | Settlement routing + audit |
| setExchangeRateRef() | W5 | SettlementRouter | ~45k | Metadata storage |

📈 **Complete Analysis**: See [docs/GAS_BENCHMARKS.md](docs/GAS_BENCHMARKS.md) for:
- Per-function gas breakdown by contract
- FHE operation overhead comparison
- Wave 4 → Wave 5 cost analysis
- Future optimization opportunities

**Note**: Gas costs are ~50-70% lower on Arbitrum compared to Ethereum Mainnet due to L2 compression.

---

---

## 🗺️ Wave Roadmap

| Wave | Focus | Status | Tasks | Tests |
|------|-------|--------|-------|-------|
| **Wave 1** | MVP Implementation | ✅ Complete | Payroll, Registry, Escrow | 4 |
| **Wave 2** | Basic Testing | ✅ Complete | Initial test suite | 6 |
| **Wave 3** | Pool Integration | ✅ Complete | Pool contract, fund management | 10 |
| **Wave 4** | 🔐 **Security Hardening** | ✅ **Complete** | **ReentrancyGuard, custom errors, access control, FHE error handling** | **34** |
| **Wave 5** | 🌍 **Multi-Sig, Audit & Corridor Settlement** | ✅ **Complete** | **MultiSig governance, AuditLog, CorridorRegistry, SettlementRouter, team isolation** | **97** |

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
 
