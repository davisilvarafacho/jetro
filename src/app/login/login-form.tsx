'use client'

import { useActionState, useState } from 'react'
import { Alert, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconLock, IconMail } from '@tabler/icons-react'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)
  // Controlado para o email não ser apagado quando a ação reinicia o formulário após um erro.
  const [email, setEmail] = useState('')
  const invalid = Boolean(state.error)

  return (
    <form action={formAction} style={{ width: '100%', maxWidth: 392 }}>
      <Stack gap={20}>
        <Title order={1} fz={36} lh={1.1} style={{ letterSpacing: '-0.02em' }}>
          Entrar
        </Title>
        <Text c="dimmed" mt={-6}>
          Acesso para a equipe e os líderes da Oitava Igreja Presbiteriana de Belo Horizonte.
        </Text>
        {state.error && (
          <Alert
            role="alert"
            color="red"
            radius="md"
            variant="light"
            icon={<IconAlertCircle size={22} />}
            styles={{
              root: { background: '#FDECEE', color: '#8E1F2B', padding: '14px 16px' },
              message: { color: '#8E1F2B', fontWeight: 600 },
            }}
          >
            {state.error}
          </Alert>
        )}
        <TextInput
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="nome@exemplo.com.br"
          leftSection={<IconMail size={18} />}
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          error={invalid || undefined}
          required
        />
        <PasswordInput
          label="Senha"
          name="senha"
          autoComplete="current-password"
          leftSection={<IconLock size={18} />}
          error={invalid || undefined}
          required
        />
        <Button type="submit" fullWidth h={52} fz={17} loading={pending}>
          Entrar
        </Button>
      </Stack>
    </form>
  )
}
