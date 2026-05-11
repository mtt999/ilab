import bcrypt from 'bcryptjs'

const ROUNDS = 10

export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, ROUNDS)
}

export async function verifyPassword(plaintext, stored) {
  if (!stored) return false
  if (stored.startsWith('$2')) return bcrypt.compare(plaintext, stored)
  return plaintext === stored
}
