import { z } from 'zod'

const phone = z
  .string()
  .trim()
  .min(6, 'Слишком короткий номер')
  .max(32, 'Слишком длинный номер')
  .regex(/^[+\d\s\-()]+$/, 'Только цифры, +, пробел, скобки, дефис')

export const updateParentSchema = z.object({
  fullName: z.string().trim().min(2, 'Введите имя'),
  phone,
  email: z
    .union([z.string().trim().email('Неверный email'), z.literal('')])
    .optional()
    .transform((v) => (v ? v : null)),
})

export type UpdateParentInput = z.infer<typeof updateParentSchema>
