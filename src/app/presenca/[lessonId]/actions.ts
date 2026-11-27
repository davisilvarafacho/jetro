'use server'

import { revalidatePath } from 'next/cache'
import { checkIn, type CheckInResult } from '@/lib/check-in'

export type CheckInState = { status?: 'confirmed' | 'already'; firstName?: string; error?: string }

const NO_LESSON = 'Esta aula não foi encontrada. Fale com o professor.'

function toState(result: CheckInResult): CheckInState {
  switch (result.kind) {
    case 'invalid-cpf':
      return { error: 'Informe os 11 números do CPF.' }
    case 'no-lesson':
      return { error: NO_LESSON }
    case 'not-found':
      return {
        error: `Membro não cadastrado. Por favor, confira com o professor ${result.teacherName} o seu cadastro de membro.`,
      }
    case 'confirmed':
    case 'already':
      // Só o primeiro nome sai daqui; o sobrenome nunca chega à página pública.
      return { status: result.kind, firstName: result.firstName }
  }
}

// Sem requireUser de propósito: quem confirma a presença é o próprio aluno, sem login.
export async function confirmAttendance(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const rawLessonId = String(formData.get('lessonId') ?? '')
  const lessonId = /^\d+$/.test(rawLessonId) ? Number(rawLessonId) : NaN
  if (!Number.isSafeInteger(lessonId)) return { error: NO_LESSON }

  const result = await checkIn(lessonId, String(formData.get('cpf') ?? ''))
  if (result.kind === 'confirmed') revalidatePath('/aulas')
  return toState(result)
}
