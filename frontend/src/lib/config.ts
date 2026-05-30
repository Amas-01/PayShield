export const CHAIN_ID = 421614;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// USDC Address (Wave 4+)
export const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS as `0x${string}` | undefined) ?? "0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D";

export const CONTRACT_ADDRESSES = {
  payroll: (import.meta.env.VITE_PAYSHIELD_PAYROLL_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  registry: (import.meta.env.VITE_PAYSHIELD_REGISTRY_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  escrow: (import.meta.env.VITE_PAYSHIELD_ESCROW_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  pool: (import.meta.env.VITE_PAYSHIELD_POOL_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  auditLog: (import.meta.env.VITE_PAYSHIELD_AUDITLOG_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  multiSig: (import.meta.env.VITE_PAYSHIELD_MULTISIG_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
};

export const PAYSHIELD_PAYROLL_ABI = [
  {
    type: "function",
    name: "submitPayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contractor", type: "address" },
      {
        name: "encryptedHours",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
      {
        name: "encryptedRate",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confirmPayroll",
    stateMutability: "nonpayable",
    inputs: [{ name: "contractor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getNetPay",
    stateMutability: "view",
    inputs: [
      { name: "employer", type: "address" },
      { name: "contractor", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export const PAYSHIELD_POOL_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const PAYSHIELD_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerContractor",
    stateMutability: "nonpayable",
    inputs: [{ name: "contractor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isEmployerContractor",
    stateMutability: "view",
    inputs: [
      { name: "employer", type: "address" },
      { name: "contractor", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const MOCK_TOKEN_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const PAYSHIELD_ESCROW_ABI = [
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contractor", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getBalance",
    stateMutability: "view",
    inputs: [{ name: "contractor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setMultiSigContract",
    stateMutability: "nonpayable",
    inputs: [{ name: "multiSigAddress", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setSettlementRouter",
    stateMutability: "nonpayable",
    inputs: [{ name: "routerAddress", type: "address" }],
    outputs: [],
  },
] as const;

// Wave 5 - MultiSig & Audit Log Configuration
export const MULTISIG_ADDRESS = (import.meta.env.VITE_PAYSHIELD_MULTISIG_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS;
export const AUDITLOG_ADDRESS = (import.meta.env.VITE_PAYSHIELD_AUDITLOG_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS;

export const PAYSHIELD_MULTISIG_ABI = [
  {
    type: "function",
    name: "configureSigner",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signerAddress", type: "address" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setThreshold",
    stateMutability: "nonpayable",
    inputs: [{ name: "threshold", type: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "createBatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "contractors", type: "address[]" }],
    outputs: [{ name: "batchId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "batchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getBatch",
    stateMutability: "view",
    inputs: [{ name: "batchId", type: "bytes32" }],
    outputs: [
      { name: "batchId", type: "bytes32" },
      { name: "employer", type: "address" },
      { name: "contractors", type: "address[]" },
      { name: "createdAt", type: "uint256" },
      { name: "approvalCount", type: "uint8" },
      { name: "executed", type: "bool" },
      { name: "expired", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getSignerSet",
    stateMutability: "view",
    inputs: [{ name: "employer", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "event",
    name: "BatchCreated",
    inputs: [
      { name: "batchId", type: "bytes32", indexed: true },
      { name: "employer", type: "address", indexed: true },
    ],
  },
] as const;

export const PAYSHIELD_AUDITLOG_ABI = [
  {
    type: "function",
    name: "log",
    stateMutability: "nonpayable",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "action", type: "uint8" },
      { name: "metadata", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getLogs",
    stateMutability: "view",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "start", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "author", type: "address" },
          { name: "action", type: "uint8" },
          { name: "metadata", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getLogCount",
    stateMutability: "view",
    inputs: [{ name: "teamId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "authoriseLogger",
    stateMutability: "nonpayable",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "logger", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeLogger",
    stateMutability: "nonpayable",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "logger", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "LogRecord",
    inputs: [
      { name: "teamId", type: "bytes32", indexed: true },
      { name: "author", type: "address", indexed: true },
      { name: "action", type: "uint8", indexed: false },
    ],
  },
] as const;

// Wave 6 - Settlement Router Configuration
export const CORRIDOR_REGISTRY_ADDRESS = (import.meta.env.VITE_PAYSHIELD_CORRIDOR_REGISTRY_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS;
export const SETTLEMENT_ROUTER_ADDRESS = (import.meta.env.VITE_PAYSHIELD_SETTLEMENT_ROUTER_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS;

export const CORRIDOR_REGISTRY_ABI = [
  {
    type: "function",
    name: "corridorCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getCorridor",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "corridorId", type: "bytes32" },
          { name: "label", type: "string" },
          { name: "sourceRegion", type: "string" },
          { name: "destRegion", type: "string" },
          { name: "active", type: "bool" },
          { name: "registeredAt", type: "uint256" },
          { name: "totalSettlements", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "corridorId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const SETTLEMENT_ROUTER_ABI = [
  {
    type: "function",
    name: "setExchangeRateRef",
    stateMutability: "nonpayable",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "rateRef", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getTeamSettlements",
    stateMutability: "view",
    inputs: [{ name: "teamId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "recordId", type: "uint256" },
          { name: "teamId", type: "bytes32" },
          { name: "employer", type: "address" },
          { name: "contractor", type: "address" },
          { name: "corridorId", type: "bytes32" },
          { name: "corridorLabel", type: "string" },
          { name: "exchangeRateRef", type: "string" },
          { name: "usdcAmount", type: "uint256" },
          { name: "settledAt", type: "uint256" },
          { name: "released", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getContractorRecords",
    stateMutability: "view",
    inputs: [
      { name: "teamId", type: "bytes32" },
      { name: "contractor", type: "address" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "recordId", type: "uint256" },
          { name: "teamId", type: "bytes32" },
          { name: "employer", type: "address" },
          { name: "contractor", type: "address" },
          { name: "corridorId", type: "bytes32" },
          { name: "corridorLabel", type: "string" },
          { name: "exchangeRateRef", type: "string" },
          { name: "usdcAmount", type: "uint256" },
          { name: "settledAt", type: "uint256" },
          { name: "released", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getSettlementCount",
    stateMutability: "view",
    inputs: [{ name: "teamId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "SettlementRouted",
    inputs: [
      { name: "teamId", type: "bytes32", indexed: true },
      { name: "contractor", type: "address", indexed: true },
      { name: "corridorId", type: "bytes32", indexed: true },
      { name: "usdcAmount", type: "uint256" },
      { name: "recordId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ExchangeRateRefSet",
    inputs: [
      { name: "teamId", type: "bytes32", indexed: true },
      { name: "rateRef", type: "string" },
    ],
  },
] as const;

// Deployment Configuration
export interface DeploymentConfig {
  contracts: {
    PayShieldAuditLog: string;
    PayShieldRegistry: string;
    PayShieldPayroll: string;
    PayShieldMultiSig: string;
    PayShieldEscrow: string;
    PayShieldPool: string;
    PayShieldCorridorRegistry: string;
    PayShieldSettlementRouter: string;
    USDC: string;
  };
  abis: {
    auditLog: typeof PAYSHIELD_AUDITLOG_ABI;
    corridorRegistry: typeof CORRIDOR_REGISTRY_ABI;
    settlementRouter: typeof SETTLEMENT_ROUTER_ABI;
    escrow: typeof PAYSHIELD_ESCROW_ABI;
    payroll: typeof PAYSHIELD_PAYROLL_ABI;
    pool: typeof PAYSHIELD_POOL_ABI;
    registry: typeof PAYSHIELD_REGISTRY_ABI;
    multiSig: typeof PAYSHIELD_MULTISIG_ABI;
    usdc: typeof ERC20_ABI;
  };
}

// Load deployment configuration from environment or defaults
export const deploymentConfig: DeploymentConfig = {
  contracts: {
    PayShieldAuditLog: AUDITLOG_ADDRESS,
    PayShieldRegistry: CONTRACT_ADDRESSES.registry,
    PayShieldPayroll: CONTRACT_ADDRESSES.payroll,
    PayShieldMultiSig: MULTISIG_ADDRESS,
    PayShieldEscrow: CONTRACT_ADDRESSES.escrow,
    PayShieldPool: CONTRACT_ADDRESSES.pool,
    PayShieldCorridorRegistry: CORRIDOR_REGISTRY_ADDRESS,
    PayShieldSettlementRouter: SETTLEMENT_ROUTER_ADDRESS,
    USDC: USDC_ADDRESS,
  },
  abis: {
    auditLog: PAYSHIELD_AUDITLOG_ABI,
    corridorRegistry: CORRIDOR_REGISTRY_ABI,
    settlementRouter: SETTLEMENT_ROUTER_ABI,
    escrow: PAYSHIELD_ESCROW_ABI,
    payroll: PAYSHIELD_PAYROLL_ABI,
    pool: PAYSHIELD_POOL_ABI,
    registry: PAYSHIELD_REGISTRY_ABI,
    multiSig: PAYSHIELD_MULTISIG_ABI,
    usdc: ERC20_ABI,
  },
};

