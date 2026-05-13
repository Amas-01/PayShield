# NDPR Compliance Documentation: PayShield

**Project**: PayShield - Confidential Payroll Dapp  
**Date**: January 2025  
**Status**: Wave 4 Implementation

## 1. Data Minimisation

PayShield implements strict data minimisation by storing only the minimum personal data necessary to facilitate confidential payroll computation:

- **On-Chain Storage**: Only wallet addresses (256-bit public keys) and encrypted ciphertext handles are stored on-chain. No salary figures, names, or PII are persisted.
- **Wage Data**: Payroll amounts exist only as encrypted ciphertext (`euint32` FHE values) that cannot be read without decryption permissions.
- **Transaction Scope**: Employer submits encrypted hours and rate (via FHE encryption in-browser), contract computes encrypted net pay (via `FHE.mul(}`), and result is stored encrypted.
- **Contractor Privacy**: Contractors' names, tax IDs, or identity documents are never submitted to the protocol. Only Ethereum addresses are used, providing pseudonymity.

**NDPR Chapter 3 Compliance**: By storing only encrypted ciphertext and addresses, PayShield minimises the collection and retention of personal data, as personal data cannot be extracted from on-chain storage without decryption keys.

---

## 2. Purpose Limitation

PayShield enforces purpose limitation through cryptographic access control via `FHE.allow()`:

- **Encryption Permission Binding**: When the Payroll contract encrypts wage calculations, it calls `FHE.allow(encryptedResult, address(escrow))` to permit **only** the Escrow contract to decrypt the result.
- **Single Use Case**: The decrypted value can only be accessed by the Escrow contract to release funds to the designated contractor. No other smart contract or address can decrypt the ciphertext.
- **Employer Non-Repudiation**: Employers can verify that a payroll transaction was submitted (via event logs) but cannot decrypt the computed wage to verify the amount was calculated correctly—ensuring contractor privacy even from employers.
- **Contractor-Only Decryption**: Contractors decrypt their own pay using `decryptForView()` with a self-signed permit, ensuring access is limited to the wallet associated with the encrypted value.

**NDPR Article 5(1)(b) Compliance**: Purpose limitation is enforced cryptographically. Wage data collected for payroll computation cannot be reused without explicit re-encryption and new `FHE.allow()` permissions.

---

## 3. Right of Access

PayShield enables contractors to exercise their NDPR right of access by decrypting their own payroll records:

- **Self-Decryption Flow**: Contractors access their wallet and call `decryptForView()` on the encrypted net pay stored in the Payroll contract, using a self-signed permit (`createSelf()`) as proof of control.
- **Permit-Based Authorization**: The permit mechanism verifies that the contractor signing the decryption request is the same entity whose wallet was assigned the `FHE.allow()` permission during payroll submission.
- **Portable Format**: Decrypted values are returned as plaintext USDC amounts, enabling contractors to save or export their wage records for personal records.
- **No Intermediary Decryption**: PayShield does not store plaintext copies of wages. Contractors directly access On-chain encrypted ciphertext and decrypt via the FHE network, ensuring only they can read their own data.

**NDPR Article 15 Compliance**: Contractors can access their personal payroll data by decrypting on-chain ciphertext. No administrator or PayShield team can intercept or modify the decrypted wage before the contractor receives it.

---

## 4. Right to Erasure

While blockchain data is immutable, PayShield provides practical erasure guarantees:

- **Encrypted Records Pseudonymisation**: On-chain payroll records are linked only to wallet addresses (not names or PII), and the actual salary amounts in ciphertext cannot be read by any party except authorized recipients.
- **Ciphertext Irreversibility**: Encrypted wage ciphertext is mathematically irreversible without the FHE network's decryption key (which exists only transiently during the `decryptForView()` call). Once the decrypt session ends, no copy of the plaintext exists.
- **Event Log Pseudonymisation**: Transfer logs record employer and contractor wallet addresses but never the wage amount (the amount field is cryptographic commitment, not plaintext).
- **Not Personal Data Under GDPR**: Ciphertext does not constitute "personal data" under GDPR Article 4(1) because it cannot be linked to an identified or identifiable individual without access to the FHE decryption infrastructure—which PayShield operators do not control.

**NDPR Article 17 Compliance**: Contractors cannot request erasure of blockchain data (immutable by design). However, PayShield achieves erasure-like guarantees by encrypting all sensitive data and ensuring plaintext payroll amounts are never stored, logged, or accessible to third parties.

---

## 5. Data Security

PayShield employs multiple layers of cryptographic and smart contract security:

- **FHE Encryption in Browser**: All payroll inputs (hours, rate) are encrypted **client-side** in the contractor's browser using `@cofhe/react` before transmission to Arbitrum Sepolia. No plaintext wages ever leave the contractor's device during submission.
- **Homomorphic Computation**: Wage calculation occurs as encrypted computation (`FHE.mul(euint32, euint32)`) on-chain. The contract processes only ciphertext, never accessing plaintext values.
- **Escrow Custody & ReentrancyGuard**: The Escrow contract uses OpenZeppelin's `ReentrancyGuard` to prevent reentrancy attacks during USDC transfers. Access control ensures only the Payroll contract can release funds.
- **No Plaintext Logging**: Event logs never emit plaintext salary amounts. Only encrypted handles and addresses are logged, preventing memory/log leaks.
- **Permit-Based Access Control**: Contractor decryption requires a signed permit (`createSelf()`), preventing unauthorized access attempts.

**NDPR Article 32 Compliance**: By leveraging FHE encryption for computation and ReentrancyGuard for fund security, PayShield implements appropriate technical safeguards to ensure the security of personal data (encrypted wages) and financial transactions.

---

## 6. Third-Party Processors & Transparency

PayShield transparently discloses third-party services that process encrypted payroll data:

- **Fhenix CoFHE Library (`@fhenixprotocol/cofhe-contracts` v0.1.3)**:
  - Provides FHE encryption/decryption and trusted execution environment (TEE).
  - Does not have access to plaintext wages—only processes ciphertext.
  - Operates the FHE threshold network used for `decryptForView()` calls.

- **Privara SDK (`@cofhe/sdk`, `@cofhe/react`)**:
  - Handles browser-side encryption of payroll inputs via `encryptInputsAsync()`.
  - Does not transmit plaintext data to remote services.
  - Uses client-side cryptographic operations.

- **Arbitrum Sepolia (Layer 2 Blockchain)**:
  - Hosts PayShield smart contracts and encrypted ciphertext.
  - Arbitrum operates the sequencer but cannot decrypt FHE ciphertext.
  - Transaction data is pseudonymous (wallet addresses only).

**NDPR Article 28 & 30 Compliance**: All third-party services are data processors handling only encrypted data. PayShield maintains transparency by documenting service providers in this compliance file and noting that no party can access plaintext wages without the contractor's explicit decryption request.

---

## 7. Employer Audit Access

PayShield enables employers to verify payroll submissions without compromising contractor privacy:

- **Event Log Verification**: Employers can query `PayrollSubmitted(address indexed employer, address indexed contractor)` events to confirm payroll was submitted for a specific contractor on a specific date.
- **No Wage Visibility**: The encrypted wage handle is stored but cannot be decrypted by employers. Employers can verify "payroll was submitted" but not "the employee was paid $X."
- **Transparency Without Disclosure**: Through event logs, employers receive cryptographic commitment to payroll amounts without revealing those amounts to anyone but the authorized contractor.
- **Audit Trail**: Registry state transitions (`Active → Paid → Disputed`) create an immutable audit trail of contractor lifecycle events, enabling dispute resolution without plaintext wage disclosure.

**NDPR & Corporate Governance**: This design satisfies both employer accountability (audit trails exist) and contractor privacy (wages remain encrypted even in audit contexts).

---

## 8. Legal Basis & Contact

- **Legal Basis**: PayShield processes payroll data under NDPR Articles 6(1)(b) (contract performance) and 6(1)(c) (legal obligation). Encrypted wage records are retained to fulfill payroll agreements and enable dispute resolution.
- **Retention Policy**: Encrypted payroll records are retained indefinitely on-chain; plaintext data is never retained.
- **Data Subject Rights**: Contractors can exercise data subject rights (access, erasure, portability) as documented above. For erasure requests, PayShield cannot delete immutable blockchain records, but plaintext wages are never created or retained.
- **Project Contact**:
  - GitHub Issues: [PayShield Repository](https://github.com/fhenixprotocol/payshield)
  - Documentation: Refer to README.md and on-chain contract events for detailed technical specifications.

**Effective Date**: January 2025  
**Last Updated**: January 2025

---

## Compliance Checklist

- ✅ Data Minimisation: Only encrypted ciphertext and wallet addresses stored
- ✅ Purpose Limitation: `FHE.allow()` enforces access control per-contract
- ✅ Right of Access: Contractors decrypt via self-signed permit
- ✅ Right to Erasure: Ciphertext irreversible; not personal data
- ✅ Data Security: FHE encryption + ReentrancyGuard + no plaintext logging
- ✅ Transparency: Third-party processors (Fhenix, Privara, Arbitrum) disclosed
- ✅ Employer Audit: Event logs enable audit without wage disclosure
- ✅ Legal Basis: Article 6(1)(b)-(c); retention policy documented
