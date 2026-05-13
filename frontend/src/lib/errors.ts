export function formatUserError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  // PayShield custom errors
  if (/0xc8c8dd8c|ContractorNotRegistered/i.test(message)) {
    return "This contractor is not registered to your account.";
  }
  if (/0x48c1e9ec|InsufficientPoolBalance/i.test(message)) {
    return "Your payroll pool has no funds. Please deposit USDC first.";
  }
  if (/0xa86f7dbe|PayrollTooRecent/i.test(message)) {
    return "Payroll was already submitted for this contractor recently. Wait 24 hours between submissions.";
  }

  // General transaction errors
  if (/max fee per gas less than block base fee/i.test(message)) {
    return "Transaction failed because network base fee increased. Retry and approve the updated gas fee.";
  }
  
  if (/transfer failed/i.test(message)) {
    return "Transaction reverted: transfer failed (check USDC balance and approve the pool allowance first).";
  }

  if (/user rejected/i.test(message)) {
    return "Transaction rejected. Please approve it in your wallet.";
  }

  if (/insufficient.*funds/i.test(message)) {
    return "Insufficient funds to complete transaction.";
  }

  const reasonMatch = message.match(/reverted with the following reason:\s*([^\n]+)/i);
  if (reasonMatch?.[1]) {
    return `Transaction reverted: ${reasonMatch[1].trim()}`;
  }

  const executionMatch = message.match(/execution reverted:\s*([^\n]+)/i);
  if (executionMatch?.[1]) {
    return `Transaction reverted: ${executionMatch[1].trim()}`;
  }

  if (message.length > 320) {
    return `${message.slice(0, 317)}...`;
  }

  return message;
}

// FHE-specific error helpers
export function formatFheError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/timeout|processing/i.test(message)) {
    return "Decryption is taking longer than expected. The FHE network may be processing — check back in 30 seconds.";
  }
  if (/permission|permit/i.test(message)) {
    return "You do not have permission to view this pay record.";
  }
  if (/encrypt/i.test(message)) {
    return "Failed to encrypt payroll data. Please try again.";
  }

  return "FHE operation failed. Please try again.";
}