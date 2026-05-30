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
```

## Logger Authorization

Call on PayShieldAuditLog for each contract:

```solidity
auditLog.authoriseLogger(registryAddress)
auditLog.authoriseLogger(payrollAddress)
auditLog.authoriseLogger(multiSigAddress)
auditLog.authoriseLogger(escrowAddress)
```

## Environment Variables Required

```
USDC_ADDRESS=0x...  // USDC contract address on Arbitrum Sepolia
PRIVATE_KEY=0x...   // Deployer private key
```

## Test Results

Wave 5 includes comprehensive test coverage:

- **PayShieldAuditLog**: 5 tests (access control, log functionality)
- **PayShieldMultiSig**: 16 tests (signer management, batch flow, data isolation, audit integration)
- **Integration tests**: 34 tests across all Wave 1-4 contracts

**Total: 55 tests, all passing ✅**

## Deployment Script

```bash
cd backend
export USDC_ADDRESS=0x...
export PRIVATE_KEY=0x...
pnpm hardhat run scripts/deploy.ts --network arbitrumSepolia
```

The script will:
1. Deploy all 6 contracts in correct order
2. Wire contract dependencies
3. Authorize all contracts as audit loggers
4. Output contract addresses to `deployments/arbitrum-sepolia.json`

## Post-Deployment Verification

After deployment:

1. Verify all contract addresses in `deployments/arbitrum-sepolia.json`
2. Run Arbiscan verification for each contract:
   ```bash
   npx hardhat verify <ADDRESS> <CONSTRUCTOR_ARGS> --network arbitrumSepolia
   ```
3. Confirm on Arbiscan that:
   - All 6 contracts are verified
   - Role system properly initialized
   - Audit log is operational

## Frontend Integration

### Config Update (src/lib/config.ts)

```typescript
export const PAYSHIELD_AUDIT_LOG = "0x..."
export const PAYSHIELD_MULTISIG = "0x..."

export const MULTISIG_BATCH_EXPIRY_DAYS = 7
export const MULTISIG_MAX_SIGNERS = 10
export const MULTISIG_MAX_BATCH_SIZE = 50
```

### New Hooks Required

- `useMultiSig.ts`: Signer management and batch approval
- `useAuditLog.ts`: Query audit trail

### New Components Required  

- `SignerManagement.tsx`: Add/remove signers, set threshold
- `ApprovalQueue.tsx`: Pending batch approvals
- `AuditLogViewer.tsx`: Queryable audit trail

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

## Deployment Manifest

Once deployed, `deployments/arbitrum-sepolia.json` contains:

```json
{
  "PayShieldAuditLog": "0x...",
  "PayShieldRegistry": "0x...",
  "PayShieldPayroll": "0x...",
  "PayShieldMultiSig": "0x...",
  "PayShieldEscrow": "0x...",
  "PayShieldPool": "0x...",
  "chainId": 421614,
  "wave": 5,
  "timestamp": "2024-..."
}
```

## Next Steps

1. Deploy contracts to Arbitrum Sepolia
2. Verify contracts on Arbiscan
3. Test multi-sig workflow end-to-end
4. Create frontend governance UI (hooks + components)
5. Run full integration tests with live contracts
6. Document API endpoints for governance queries
