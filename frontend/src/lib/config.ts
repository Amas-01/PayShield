export const CHAIN_ID = 421614;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const CONTRACT_ADDRESSES = {
  payroll: (import.meta.env.VITE_PAYSHIELD_PAYROLL_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  registry: (import.meta.env.VITE_PAYSHIELD_REGISTRY_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  escrow: (import.meta.env.VITE_PAYSHIELD_ESCROW_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
  pool: (import.meta.env.VITE_PAYSHIELD_POOL_ADDRESS as `0x${string}` | undefined) ?? ZERO_ADDRESS,
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
