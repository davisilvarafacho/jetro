'use client'

import { useEffect, useState } from 'react'
import { Loader, Modal, Timeline } from '@mantine/core'
import { IconCheck, IconClock, IconX } from '@tabler/icons-react'
import { formatDateOnly } from '@/lib/date-only'
import type { PersonRef } from '@/lib/members'
import { fullName } from '@/lib/person-name'
import type { MemberTimeline } from '@/lib/timeline'
import { loadTimeline } from '../lookups'
import classes from './member-timeline.module.css'

const STATE_STYLE = {
  present: { label: 'Presente', color: 'floresta', Icon: IconCheck },
  absent: { label: 'Faltou', color: 'red', Icon: IconX },
  upcoming: { label: 'Agendada', color: 'gray', Icon: IconClock },
} as const

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; timeline: MemberTimeline }

// Carrega ao montar: o modal só monta seus filhos enquanto está aberto, então cada abertura busca de novo.
function TimelineBody({ courseId, memberId }: { courseId: number; memberId: number }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadTimeline(courseId, memberId)
      .then((timeline) => {
        if (active) setState({ status: 'ready', timeline })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [courseId, memberId])

  if (state.status === 'loading') {
    return (
      <div className={classes.loading}>
        <Loader size="sm" aria-label="Carregando frequência" />
      </div>
    )
  }
  if (state.status === 'error') {
    return <p className={classes.error}>Não foi possível carregar a frequência.</p>
  }

  const { timeline } = state
  if (timeline.lessons.length === 0) {
    return <p className={classes.message}>Este curso ainda não tem aulas.</p>
  }
  // Marca até a última aula já realizada; as agendadas depois dela ficam em cinza.
  const active = timeline.lessons.map((lesson) => lesson.state !== 'upcoming').lastIndexOf(true)

  return (
    <>
      <p className={classes.summary}>
        Presente em {timeline.attended} de {timeline.held} aulas realizadas
      </p>
      <Timeline active={active} color="floresta" bulletSize={28} lineWidth={2}>
        {timeline.lessons.map((lesson) => {
          const style = STATE_STYLE[lesson.state]
          const Icon = style.Icon
          return (
            <Timeline.Item
              key={lesson.id}
              title={lesson.name}
              color={style.color}
              lineVariant={lesson.state === 'upcoming' ? 'dashed' : 'solid'}
              bullet={<Icon size={16} stroke={2} />}
            >
              <p className={classes.itemText}>
                {formatDateOnly(lesson.date)} · {style.label}
              </p>
            </Timeline.Item>
          )
        })}
      </Timeline>
    </>
  )
}

type Props = {
  courseId: number
  member: PersonRef | null
  onClose: () => void
}

export function MemberTimelineModal({ courseId, member, onClose }: Props) {
  // Guarda a última pessoa aberta: na animação de fechamento o título e o corpo continuam os mesmos.
  const [shown, setShown] = useState<PersonRef | null>(member)
  if (member && member !== shown) setShown(member)

  return (
    <Modal
      opened={member !== null}
      onClose={onClose}
      centered
      radius="lg"
      padding={32}
      size={460}
      overlayProps={{ color: '#14261F', backgroundOpacity: 0.45 }}
      title={shown ? `Frequência de ${fullName(shown)}` : null}
      classNames={{ title: classes.title }}
    >
      {shown && <TimelineBody key={shown.id} courseId={courseId} memberId={shown.id} />}
    </Modal>
  )
}
