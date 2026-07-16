import bcrypt from 'bcryptjs'

// รหัสผ่านเก็บเป็น bcrypt hash ในฐานข้อมูล ($2a$/$2b$/$2y$ prefix)
// ค่า plaintext เดิม (ก่อน migration) ยังตรวจแบบเทียบตรงได้ เพื่อไม่ให้
// ล็อกอินพังระหว่างช่วง deploy โค้ดใหม่กับรัน migration hash ใน DB
export const isHashed = (s: string | null | undefined): boolean =>
  typeof s === 'string' && /^\$2[aby]\$/.test(s)

export const hashPassword = (plain: string): string =>
  bcrypt.hashSync(plain, 10)

export const verifyPassword = (plain: string, stored: string | null | undefined): boolean => {
  if (!stored) return false
  return isHashed(stored) ? bcrypt.compareSync(plain, stored) : stored === plain
}
