export function formatUserError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/max fee per gas less than block base fee/i.test(message)) {
    return "Transaction failed because network base fee increased. Retry and approve the updated gas fee.";
  }
  
  if (/transfer failed/i.test(message)) {
    return "Transaction reverted: transfer failed (check USDC balance and approve the pool allowance first).";
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