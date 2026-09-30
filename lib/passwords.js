import "server-only";
import { randomInt } from "node:crypto";

// One rule everywhere: workspace users, their teammates and Lasan console staff.
export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number";
  if (password.length > 128) return "Use at most 128 characters";
  return null;
}

// Easy to read aloud or type from a message: no 0/O, 1/l/I. Always has letters and digits.
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

export function temporaryPassword() {
  const pick = (set, n) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(LETTERS, 4)}-${pick(DIGITS, 4)}-${pick(LETTERS, 4)}`;
}
