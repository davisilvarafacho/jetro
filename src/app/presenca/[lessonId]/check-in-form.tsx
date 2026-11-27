'use client'

import { useActionState, useState } from 'react'
import { Alert, Button, TextInput } from '@mantine/core'
import { IconAlertCircle, IconCircleCheck, IconId } from '@tabler/icons-react'
import { confirmAttendance, type CheckInState } from './actions'
import classes from './check-in.module.css'

const initialState: CheckInState = {}

export function CheckInForm({ lessonId }: { lessonId: number }) {
  const [state, formAction, pending] = useActionState(confirmAttendance, initialState)
  // Controlado para o CPF continuar na tela quando a ação reinicia o formulário após um erro.
  const [cpf, setCpf] = useState('')

  return (
    <form action={formAction} className={classes.form} noValidate>
      <input type="hidden" name="lessonId" value={lessonId} />
      <TextInput
        label="CPF"
        name="cpf"
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        leftSection={<IconId size={18} />}
        value={cpf}
        onChange={(event) => setCpf(event.currentTarget.value)}
        classNames={{ input: classes.cpf }}
        required
      />

      {state.error && (
        <Alert
          role="alert"
          color="red"
          radius="md"
          variant="light"
          icon={<IconAlertCircle size={22} />}
          className={classes.alert}
        >
          {state.error}
        </Alert>
      )}
      {state.status && state.firstName && (
        <Alert
          role="status"
          color="floresta"
          radius="md"
          variant="light"
          icon={<IconCircleCheck size={22} />}
          className={classes.alert}
        >
          {state.status === 'confirmed'
            ? `Presença confirmada, ${state.firstName}!`
            : `Sua presença já estava registrada, ${state.firstName}.`}
        </Alert>
      )}

      <Button type="submit" fullWidth h={52} fz={17} loading={pending}>
        Confirmar presença
      </Button>
    </form>
  )
}
