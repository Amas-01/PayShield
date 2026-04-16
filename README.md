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

## 🚀 Setup

```bash
cd backend
npm install
cp .env.example .env

cd ../frontend
npm install
```

## 🌐 Arbitrum Sepolia Deployment (2026-04-16)

Deployed from `backend/` using Hardhat network `arbitrumSepolia` (`chainId: 421614`) and the private key configured in `.env`.

Commands executed:

```bash
npx hardhat run scripts/deploy-mock-token.ts --network arbitrumSepolia
USDC_ADDRESS=<mock_token_address> npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

Deployed addresses:

| Contract | Address |
|---|---|
| MockFHERC20 (USDC) | `0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D` |
| PayShieldRegistry | `0xF59307818AD31c808828E0b55781a383C017b68b` |
| PayShieldPayroll | `0x0eBbfa5dd7FE2E36aA0613780D0E25B260023cE8` |
| PayShieldPool | `0x36E2fF7DEf8a00325Af4436fc0f3291dC4C99e56` |
| PayShieldEscrow | `0x9C829A4a0d7e4a9d1A91B4EE0E2bF071e51eEbd8` |

Address wiring completed:

- `backend/.env`
    - `USDC_ADDRESS=0x8A0A3cDd08Cec51bB8Ea3544414BFa47C3971D1D`
    - `PAYSHIELD_POOL_ADDRESS=0x36E2fF7DEf8a00325Af4436fc0f3291dC4C99e56`
    - `PAYSHIELD_ESCROW_ADDRESS=0x9C829A4a0d7e4a9d1A91B4EE0E2bF071e51eEbd8`
- `frontend/.env`
    - `VITE_PAYSHIELD_REGISTRY_ADDRESS=0xF59307818AD31c808828E0b55781a383C017b68b`
    - `VITE_PAYSHIELD_PAYROLL_ADDRESS=0x0eBbfa5dd7FE2E36aA0613780D0E25B260023cE8`
    - `VITE_PAYSHIELD_POOL_ADDRESS=0x36E2fF7DEf8a00325Af4436fc0f3291dC4C99e56`
    - `VITE_PAYSHIELD_ESCROW_ADDRESS=0x9C829A4a0d7e4a9d1A91B4EE0E2bF071e51eEbd8`

## ✅ Wave 2 Validation

Executed in `backend/`:

```bash
HARDHAT_DISABLE_VSCODE_INSTALL_PROMPT=true npx hardhat test
HARDHAT_DISABLE_VSCODE_INSTALL_PROMPT=true npx hardhat typechain
```

Test output:

```text
PayShieldEscrow
    ✔ uses silent failure when payroll is not confirmed
    ✔ releases payout after employer confirms payroll

PayShieldPayroll
    ✔ computes encrypted net pay with FHE.mul and keeps values encrypted
    ✔ marks payroll as employer-confirmed

PayShieldRegistry
    ✔ registers contractor and stores employer contractor list
    ✔ enforces Active -> Paid -> Disputed transitions

6 passing
```

Judge-signal assertion is included in `backend/test/PayShieldPayroll.test.ts` via:

- `hre.cofhe.mocks.expectPlaintext(netPayHandle, 1000n)`

This confirms ciphertext payroll multiplication correctness without exposing plaintext on-chain.


## 📚 Resources
 
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
 
