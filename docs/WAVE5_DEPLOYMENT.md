# PayShield Wave 5 - Deployment Guide

## Overview

Wave 5 implements enterprise-grade governance and audit logging for the PayShield confidential payroll protocol. This guide covers deployment of all Wave 5 contracts to Arbitrum Sepolia.

## Contracts Deployed

### 1. PayShieldAuditLog
- **Purpose**: Immutable, team-isolated audit trail for all protocol operations
- **Key Features**:
  - Append-only logging (entries never modified or deleted)
  - Team-based data isolation (via employer address hashing)
  - Queryable log entries with block range filtering
  - ReentrancyGuard for safe concurrent access
  - Logger authorization (only approved contracts can write)

### 2. PayShieldMultiSig
- **Purpose**: M-of-N approval governance between employers and release signers
- **Key Features**:
  - Signer management per employer (add/remove signers, set threshold)
  - Batch payroll creation and approval flow
  - Automatic batch execution when approval threshold reached
  - 7-day batch expiry window
  - Team-isolated data (cross-employer approval blocked)
  - Audit log integration for all actions

### 3. PayShieldCorridorRegistry
- **Purpose**: Manages approved payment corridors (Nigeria-UK, Kenya-India) with pause/resume capability
- **Key Features**:
  - Register new payment corridors with source/dest regions
  - Pause active corridors (stop new settlements through corridor)
  - Resume paused corridors
  - Track settlement volume per corridor
  - One-time authorization of SettlementRouter contract

### 4. PayShieldSettlementRouter
- **Purpose**: Routes USDC payments through approved corridors with exchange rate tracking
- **Key Features**:
  - Route settlements through active corridors to escrow
  - Set and store exchange rate references per team (e.g., "CBN-2025-05-30")
  - Enforce team isolation (keccak256 derived employer teamId)
  - Employer-only access to rate references
  - Contractor privacy enforcement (no rate ref visibility)
  - Increment corridor settlement counters for volume tracking
  - Audit log integration for all settlement routes

### 3. Updated Contracts (Waves 1-4)

#### PayShieldRegistry
- Added role-based access control (EMPLOYER, CONTRACTOR, AUDITOR, MULTISIG_SIGNER)
- Added team tracking (contractor→employer inverse mapping)
- Added getRoleAsUint() for view function role checks
- Integrated audit log hooks on contractor registration/removal

#### PayShieldPayroll
- Multi-sig awareness: setMultiSigContract(), releaseFor() function
- Now only PayShieldMultiSig can call release flows
- Integrated audit log hooks on payroll submission and release

#### PayShieldEscrow  
- Modified to accept calls only from PayShieldMultiSig (not Payroll directly)
- Added setMultiSigContract() setter

#### PayShieldPool
- Added setAuditLog() for audit integration

## Deployment Order (Critical)

```
1. PayShieldAuditLog
2. PayShieldRegistry
3. PayShieldPayroll(registryAddress)
4. PayShieldMultiSig(payrollAddress, registryAddress, auditLogAddress)
5. PayShieldEscrow(payrollAddress)
6. PayShieldPool(usdcAddress, payrollAddress)
7. PayShieldCorridorRegistry() - depends on none, Owner-managed
8. PayShieldSettlementRouter(multiSigAddress, corridorRegistryAddress, escrowAddress, auditLogAddress)
```

## Wiring Steps (Post-Deployment)

After all contracts are deployed:

```solidity
// Registry
registry.setAuditLog(auditLogAddress)

// Payroll
payroll.setAuditLog(auditLogAddress)
payroll.setMultiSigContract(multiSigAddress)
payroll.setEscrow(escrowAddress)

// MultiSig
multisig.setEscrow(escrowAddress)

// Escrow
escrow.setMultiSigContract(multiSigAddress)

// Pool
pool.setAuditLog(auditLogAddress)
pool.setEscrow(escrowAddress)

// Corridor Registry
corridorRegistry.setSettlementRouter(settlementRouterAddress)

// Settlement Router (deployments/arbitrum-sepolia.json must contain corridorRegistryAddress)
// No explicit wiring needed; constructor args provide all dependencies
```

## Logger Authorization

Call on PayShieldAuditLog for each contract:

```solidity
auditLog.authoriseLogger(registryAddress)
auditLog.authoriseLogger(payrollAddress)
auditLog.authoriseLogger(multiSigAddress)
auditLog.authoriseLogger(escrowAddress)
auditLog.authoriseLogger(corridorRegistryAddress)
auditLog.authoriseLogger(settlementRouterAddress)
```

## Environment Variables Required

```
USDC_ADDRESS=0x...  // USDC contract address on Arbitrum Sepolia
PRIVATE_KEY=0x...   // Deployer private key
```

## Test Results

Wave 5 includes comprehensive test coverage:

- **PayShieldAuditLog**: 8 tests (access control, log functionality, authorization)
- **PayShieldMultiSig**: 14 tests (signer management, batch flow, data isolation)
- **PayShieldCorridorRegistry**: 8 tests (corridor management, settlement counting, router authorization)
- **PayShieldSettlementRouter**: 10 tests (settlement routing, rate references, privacy enforcement)
- **Integration tests**: 57 tests across all Wave 1-4 contracts + Wave 5 integrations

**Total: 97 tests, all passing ✅ (May 29, 2026 Deployment)**

## Deployment Script

```bash
cd backend
export USDC_ADDRESS=0x...
export PRIVATE_KEY=0x...
pnpm hardhat run scripts/deploy.ts --network arbitrumSepolia
```

The script will:
1. Deploy all 8 contracts in correct order
2. Wire contract dependencies
3. Authorize all contracts as audit loggers
4. Register initial payment corridors (Nigeria-UK, Kenya-India)
5. Output contract addresses to `deployments/arbitrum-sepolia.json`

## Post-Deployment Verification

After deployment:

1. Verify all 8 contract addresses in `deployments/arbitrum-sepolia.json`
2. Run Arbiscan verification for each contract:
   ```bash
   npx hardhat verify <ADDRESS> <CONSTRUCTOR_ARGS> --network arbitrumSepolia
   ```
3. Confirm on Arbiscan that:
   - All 8 contracts are verified
   - Role system properly initialized
   - Audit log is operational
   - Payment corridors are registered (Nigeria-UK, Kenya-India)
   - Settlement router has access to corridor registry

## Arbitrum Sepolia Deployment (May 29, 2026)

```json
{
  "PayShieldAuditLog": "0x48442F565683E7D34C2aB197f8196b8e2BB11c62",
  "PayShieldRegistry": "0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC",
  "PayShieldPayroll": "0xd2197d44A153a76B8784d23Df1034a5F80fC3675",
  "PayShieldMultiSig": "0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133",
  "PayShieldEscrow": "0x0a0D6b01F61EA7e50208414b9D015320160F4D99",
  "PayShieldPool": "0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3",
  "PayShieldCorridorRegistry": "0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7",
  "PayShieldSettlementRouter": "0xC034ce5f034c4f39EF775b055c9B361fD76b0937",
  "chainId": 421614,
  "wave": 5,
  "timestamp": "2026-05-29T18:45:30Z"
}
```

## Frontend Integration

### Environment Variables (.env)

```
VITE_PAYSHIELD_AUDITLOG_ADDRESS=0x48442F565683E7D34C2aB197f8196b8e2BB11c62
VITE_PAYSHIELD_REGISTRY_ADDRESS=0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC
VITE_PAYSHIELD_PAYROLL_ADDRESS=0xd2197d44A153a76B8784d23Df1034a5F80fC3675
VITE_PAYSHIELD_MULTISIG_ADDRESS=0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133
VITE_PAYSHIELD_ESCROW_ADDRESS=0x0a0D6b01F61EA7e50208414b9D015320160F4D99
VITE_PAYSHIELD_POOL_ADDRESS=0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3
VITE_PAYSHIELD_CORRIDOR_REGISTRY_ADDRESS=0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7
VITE_PAYSHIELD_SETTLEMENT_ROUTER_ADDRESS=0xC034ce5f034c4f39EF775b055c9B361fD76b0937
VITE_RPC_URL=https://arbitrum-sepolia.blockpi.network/v1/rpc/public
VITE_USDC_ADDRESS=0x...
```

### Config Update (src/lib/config.ts)

```typescript
export const PAYSHIELD_AUDITLOG = "0x48442F565683E7D34C2aB197f8196b8e2BB11c62"
export const PAYSHIELD_MULTISIG = "0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133"
export const PAYSHIELD_CORRIDOR_REGISTRY = "0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7"
export const PAYSHIELD_SETTLEMENT_ROUTER = "0xC034ce5f034c4f39EF775b055c9B361fD76b0937"

export const MULTISIG_BATCH_EXPIRY_DAYS = 7
export const MULTISIG_MAX_SIGNERS = 10
export const MULTISIG_MAX_BATCH_SIZE = 50

export const SUPPORTED_CORRIDORS = [
  { id: "nga-gbr", label: "Nigeria-UK", source: "NG", dest: "GB" },
  { id: "ken-ind", label: "Kenya-India", source: "KE", dest: "IN" }
]
```

### New Hooks Implemented ✅

- `useMultiSig.ts`: Signer management and batch approval
- `useAuditLog.ts`: Query audit trail with block range filtering
- `useCorridorSettlement.ts`: Corridor queries, settlement history, rate reference management

### New Components Implemented ✅

- `SignerManagement.tsx`: Add/remove signers, set threshold
- `ApprovalQueue.tsx`: Pending batch approvals with expiry countdown
- `AuditLogViewer.tsx`: Queryable audit trail with filtering
- `CorridorSelector.tsx`: Dropdown for corridor selection in payroll form
- `SettlementHistory.tsx`: Employer settlement view with CSV export
- `ContractorSettlements.tsx`: Contractor privacy-enforced settlement records

## Access Control Model (4-Layer)

1. **Role-Based**: Registry.getRole() determines EMPLOYER/CONTRACTOR/AUDITOR status
2. **Team-Based**: Derived from employer address hash (keccak256(abi.encodePacked(employer)))
3. **Data-Type-Based**: Contractors isolated per employer (via team)
4. **Action-Based**: Different modifiers for configureSigner vs approve vs createBatch

## Key Security Features

- ✅ Immutable audit logs (append-only, never deleted)
- ✅ Team-isolated data (no cross-employer access)
- ✅ Multi-signature requirements (configurable threshold)
- ✅ Batch expiry (stale approvals rejected)
- ✅ Input validation (bounds, duplicates, zero addresses)
- ✅ ReentrancyGuard on state-modifying functions

## Troubleshooting

**Issue**: Batch creation fails with "ThresholdNotConfigured"
- **Solution**: Call `setThreshold()` before `createBatch()`

**Issue**: Approval fails with "NotASigner"
- **Solution**: Ensure signer was added via `configureSigner(signer, true)`

**Issue**: Cross-team access shows "CrossTeamAccess"
- **Solution**: Signers can only approve batches from their own employer, or auditors (role=3) can cross-team query

**Issue**: Log entries not visible in audit trail
- **Solution**: Ensure contract is authorized via `auditLog.authoriseLogger(contractAddress)`

## Deployment Manifest (Wave 5 - May 29, 2026)

Once deployed, `deployments/arbitrum-sepolia.json` contains:

```json
{
  "PayShieldAuditLog": {
    "address": "0x48442F565683E7D34C2aB197f8196b8e2BB11c62",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0x48442F565683E7D34C2aB197f8196b8e2BB11c62"
  },
  "PayShieldRegistry": {
    "address": "0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0x25F8cAa0C6942A5B01f253EBfbf9e24d4368F1eC"
  },
  "PayShieldPayroll": {
    "address": "0xd2197d44A153a76B8784d23Df1034a5F80fC3675",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0xd2197d44A153a76B8784d23Df1034a5F80fC3675"
  },
  "PayShieldMultiSig": {
    "address": "0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0x273544fFF7f7b7a80d37D12d9C4EEb1C91cEa133"
  },
  "PayShieldEscrow": {
    "address": "0x0a0D6b01F61EA7e50208414b9D015320160F4D99",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0x0a0D6b01F61EA7e50208414b9D015320160F4D99"
  },
  "PayShieldPool": {
    "address": "0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0x5bE4b774b1bae31992bF2e2CD9aab6a7Ee0e71F3"
  },
  "PayShieldCorridorRegistry": {
    "address": "0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0xD9a6Ae51dcfb5969e38a628a67999Dc0A750c4B7"
  },
  "PayShieldSettlementRouter": {
    "address": "0xC034ce5f034c4f39EF775b055c9B361fD76b0937",
    "verified": true,
    "arbiscan": "https://sepolia.arbiscan.io/address/0xC034ce5f034c4f39EF775b055c9B361fD76b0937"
  },
  "chainId": 421614,
  "wave": 5,
  "timestamp": "2026-05-29T18:45:30Z"
}
```

## Next Steps

1. ✅ Deploy all 8 contracts to Arbitrum Sepolia (May 29, 2026)
2. ✅ Verify contracts on Arbiscan
3. ✅ Test multi-sig workflow end-to-end
4. ✅ Test settlement routing through corridors
5. ✅ Create frontend governance UI (hooks + components)
6. ✅ Run full integration tests with live contracts
7. Document API endpoints for governance queries
8. Set up monitoring/alerting for corridor settlement events
