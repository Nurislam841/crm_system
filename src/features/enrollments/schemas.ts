import { z } from 'zod'

export const createEnrollmentSchema = z.object({
  studentId: z.string().trim().min(1),
  courseId: z.string().trim().min(1, 'Выберите курс'),
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
