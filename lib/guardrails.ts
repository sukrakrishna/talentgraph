export const SECURITY_GUARDRAIL_MESSAGE =
  "Security Guardrail Flagged: Adversarial prompt pattern detected.";

const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?previous\s+instructions?/i,
  /system\s+prompt/i,
  /developer\s+message/i,
  /reveal\s+(the\s+)?prompt/i,
  /jailbreak/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /union\s+select/i,
  /sudo\s+/i,
];

export function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export function hasAdversarialPrompt(value: string): boolean {
  return ADVERSARIAL_PATTERNS.some((pattern) => pattern.test(value));
}

export function guardText(value: string): { safe: true; text: string } | { safe: false } {
  const text = sanitizeText(value);
  return hasAdversarialPrompt(text) ? { safe: false } : { safe: true, text };
}
