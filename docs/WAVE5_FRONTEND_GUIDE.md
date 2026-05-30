# Wave 5 Contract Interfaces - Frontend Developer Guide

## Overview

This guide details the contract interfaces needed for frontend integration of Wave 5 governance and audit features.

## PayShieldMultiSig Interface

### State Queries

```solidity
// Check if address is a signer for an employer
function _isSigner[employer][signer] → bool

// Get all signers for an employer
function getSignerSet(address employer) → address[] memory

// Get required approval count for an employer
function getThreshold(address employer) → uint256

// Get batch details
function getBatch(bytes32 batchId) → PayrollBatch memory
  // PayrollBatch { batchId, employer, contractors[], createdAt, approvalCount, executed, expired }

// Check if signer has already approved a batch
function hasApproved(bytes32 batchId, address signer) → bool
```

### State-Modifying Functions

```solidity
// Employer: Add or remove a signer
function configureSigner(address signer, bool active)
// Emits: SignerConfigured(employer, signer, active)

// Employer: Set required approval threshold
function setThreshold(uint256 threshold)
// Emits: ThresholdUpdated(employer, threshold)

// Employer: Create batch of payroll for contractors
function createBatch(address[] calldata contractors) → bytes32 batchId
// Emits: BatchCreated(batchId, employer, contractorCount)

// Signer: Approve a batch (can only call once)
function approve(bytes32 batchId)
// Emits: BatchApproved(batchId, signer, approvalCount)
// Auto-executes batch if approvalCount >= threshold
```

### Events

```solidity
event SignerConfigured(address indexed employer, address indexed signer, bool active)
event ThresholdUpdated(address indexed employer, uint256 threshold)
event BatchCreated(bytes32 indexed batchId, address indexed employer, uint256 contractorCount)
event BatchApproved(bytes32 indexed batchId, address indexed signer, uint256 approvalCount)
event BatchExecuted(bytes32 indexed batchId, address indexed employer)
```

### Constants

```solidity
MAX_SIGNERS = 10              // Max signers per employer
MIN_THRESHOLD = 1             // Min approval required
MAX_BATCH_SIZE = 50           // Max contractors per batch
BATCH_EXPIRY_SECONDS = 604800 // 7 days
```

### Error Codes

```solidity
error NotASigner(address caller)                        // Caller not in signer set
error AlreadyApproved(address signer, bytes32 batchId) // Already voted on this batch
error BatchExpired(bytes32 batchId, uint256 expiredAt)  // Expired batch cannot be approved
error BatchAlreadyExecuted(bytes32 batchId)             // Already executed batch cannot be approved
error BoundsExceeded(uint256 value, uint256 max)        // Value exceeds limit
error InvalidThreshold(uint256 threshold, uint256 count) // Threshold > signer count
error DuplicateContractor(address contractor)            // Contractor appears twice
error CrossTeamAccess(address caller, address employer)  // Non-employer cannot access
error ThresholdNotConfigured(address employer)           // Must call setThreshold first
error DuplicateSigner(address signer)                    // Signer already added
error InvalidBatch(bytes32 batchId)                      // Batch does not exist
error UnauthorizedCaller(address caller)                 // Caller has wrong role
error ZeroAddress()                                      // Address is zero
```

## PayShieldAuditLog Interface

### State Queries

```solidity
// Get entries for an employer within block range
function getLogs(
  address employer,
  uint256 fromBlock,
  uint256 toBlock
) → AuditEntry[] memory
  // AuditEntry {
  //   address actor,
  //   address subject,
  //   bytes32 actionType,
  //   bytes32 teamId,
  //   uint256 blockNumber,
  //   uint256 timestamp
  // }

// Get total log count for an employer
function getLogCount(address employer) → uint256

// Check if contract is authorized to log
function isAuthorisedLogger(address contractAddress) → bool
```

### State-Modifying Functions (Owner Only)

```solidity
// Authorize a contract to write logs
function authoriseLogger(address contractAddress)
// Emits: LoggerAuthorised(contractAddress)

// Revoke logging privileges
function revokeLogger(address contractAddress)
// Emits: LoggerRevoked(contractAddress)
```

### State-Modifying Functions (Authorized Loggers)

```solidity
// Write an audit entry
function log(
  address actor,
  address subject,
  bytes32 actionType,
  bytes32 teamId,
  uint256 timestamp
)
// Emits: LogWritten(teamId, actionType, blockNumber)
```

### Events

```solidity
event LogWritten(bytes32 indexed teamId, bytes32 indexed actionType, uint256 blockNumber)
event LoggerAuthorised(address indexed contractAddress)
event LoggerRevoked(address indexed contractAddress)
```

### Action Types (for filtering)

```solidity
keccak256("PAYROLL_SUBMITTED")
keccak256("PAYROLL_APPROVED")
keccak256("PAYROLL_RELEASED")
keccak256("CONTRACTOR_ADDED")
keccak256("CONTRACTOR_REMOVED")
keccak256("POOL_DEPOSIT")
keccak256("POOL_WITHDRAW")
keccak256("SIGNER_ADDED")
keccak256("APPROVAL_CAST")
```

## PayShieldRegistry Interface (Updated for Wave 5)

### Role System

```solidity
enum Role {
  NONE,           // 0
  EMPLOYER,       // 1
  CONTRACTOR,     // 2
  AUDITOR,        // 3
  MULTISIG_SIGNER // 4
}

// Get role for an address
function getRole(address account) → Role

// Get role as uint8 (for view function comparisons)
function getRoleAsUint(address account) → uint8
```

### Employer Functions

```solidity
// Register as an employer (auto-assigns EMPLOYER role)
function registerEmployer()
// Emits: EmployerRegistered(msg.sender)

// Register a contractor to your team
function registerContractor(address contractor)
// Emits: ContractorRegistered(employer, contractor)

// Remove a contractor from your team
function removeContractor(address contractor)
// Emits: ContractorRemoved(employer, contractor)
```

### View Functions

```solidity
// Get contractor role and update state
function getRole(address account) → Role

// Get staff for an employer
function getContractors(address employer) → address[] memory

// Check if address is a contractor for employer
function isEmployerContractor(address employer, address contractor) → bool

// Get employer for a contractor
function contractorTeam(address contractor) → address
```

## Integration Patterns

### useMultiSig Hook Skeleton

```typescript
interface UseMultiSigReturn {
  configureSigner: (signer: string, active: boolean) => Promise<void>
  setThreshold: (threshold: number) => Promise<void>
  createBatch: (contractors: string[]) => Promise<string> // returns batchId
  approve: (batchId: string) => Promise<void>
  getBatch: (batchId: string) => Promise<PayrollBatch>
  getSignerSet: (employer: string) => Promise<string[]>
  getThreshold: (employer: string) => Promise<bigint>
  isApproved: (batchId: string, signer: string) => Promise<boolean>
  data: {
    signers: string[]
    threshold: bigint
    batches: Map<string, PayrollBatch>
  }
  loading: boolean
  error?: Error
}

export function useMultiSig(): UseMultiSigReturn {
  // Implementation
}
```

### useAuditLog Hook Skeleton

```typescript
interface AuditEntry {
  actor: string
  subject: string
  actionType: string
  teamId: string
  blockNumber: bigint
  timestamp: bigint
}

interface UseAuditLogReturn {
  getLogs: (fromBlock: number, toBlock: number) => Promise<AuditEntry[]>
  getLogCount: () => Promise<bigint>
  data: {
    logs: AuditEntry[]
    count: bigint
  }
  loading: boolean
  error?: Error
}

export function useAuditLog(employer?: string): UseAuditLogReturn {
  // Implementation
}
```

## Frontend Components (To Build)

### SignerManagement.tsx

**Props**:
```typescript
interface SignerManagementProps {
  employer: string
  onError: (error: Error) => void
}
```

**Features**:
- Display current signers and threshold
- Add signer UI with validation
- Remove signer confirmation
- Set threshold with bounds checking (1 ≤ threshold ≤ signers)

### ApprovalQueue.tsx

**Props**:
```typescript
interface ApprovalQueueProps {
  employer: string
  onBatchApproved?: (batchId: string) => void
  onError: (error: Error) => void
}
```

**Features**:
- List pending batches with contractor details
- Approval button (only for signers)
- Expiry countdown (7 days)
- Execution status once threshold reached
- Link to batch details

### AuditLogViewer.tsx

**Props**:
```typescript
interface AuditLogViewerProps {
  employer: string
  fromBlock?: number
  toBlock?: number
}
```

**Features**:
- Block range filters
- Action type labels (human-readable)
- Actor/subject address truncation
- Export to JSON
- Search by action type

## Deployment Addresses (After Wave 5 Deploy)

```typescript
// deployments/arbitrum-sepolia.json
export const ADDRESSES = {
  PayShieldAuditLog: "0x...",
  PayShieldRegistry: "0x...",
  PayShieldPayroll: "0x...",
  PayShieldMultiSig: "0x...",
  PayShieldEscrow: "0x...",
  PayShieldPool: "0x..."
}
```

## ABI Imports

```typescript
import PayShieldMultiSigABI from "../contracts/PayShieldMultiSig.json"
import PayShieldAuditLogABI from "../contracts/PayShieldAuditLog.json"
import PayShieldRegistryABI from "../contracts/PayShieldRegistry.json"
```

## Common Integration Examples

### Add a Signer

```typescript
const { configureSigner } = useMultiSig()
await configureSigner("0x...", true) // active=true to add
```

### Create and Approve a Batch

```typescript
const { createBatch, approve } = useMultiSig()
const batchId = await createBatch(["0x...", "0x..."])
await approve(batchId)
// Batch auto-executes if (approvalCount >= threshold)
```

### Query Audit Trail

```typescript
const { getLogs } = useAuditLog(employerAddress)
const logs = await getLogs(0, 1000)
const approvals = logs.filter(l => l.actionType === keccak256("APPROVAL_CAST"))
```

### Check Authorization

```typescript
const registry = useContract(ADDRESSES.PayShieldRegistry)
const role = await registry.getRole(userAddress)
const isEmployer = role === 1
const isAuditor = role === 3
```

## Testing Utilities

### Generate Test Batch ID
```typescript
function createTestBatchId(employer: string, nonce: number): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [employer, nonce, Math.floor(Date.now() / 1000)]
    )
  )
}
```

### Calculate Team ID
```typescript
function getTeamId(employer: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [employer]
    )
  )
}
```

## Rate Limiting Considerations

- `MAX_BATCH_SIZE` = 50 contractors per batch
- `BATCH_EXPIRY` = 7 days (approvals beyond expiry fail)
- `MAX_SIGNERS` = 10 per employer (configurable)
- No rate limiting on getLogs (block range filtering recommended for large employers)

## Security Notes for Frontend

1. **Always validate block ranges** when querying audit logs
2. **Verify batch expiry** before showing approval button (7 days from creation)
3. **Check role before rendering** governance UI (only employers can manage signers)
4. **Debounce signer approval** to prevent double-submission
5. **Display warning** if batch approaching expiry (< 24 hours remaining)
6. **Confirm on high-value** batch approvals (> 5 contractors)
