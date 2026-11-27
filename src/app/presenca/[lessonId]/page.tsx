import { notFound } from 'next/navigation'
import { Brand } from '@/components/brand'
import { getPublicLesson } from '@/lib/check-in'
import { formatDateOnly } from '@/lib/date-only'
import { CheckInForm } from './check-in-form'
import classes from './check-in.module.css'

// Fora do grupo (app): sem menu e sem login. Quem lê o QR Code chega direto aqui pelo celular.
export default async function PresencaPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId: rawId } = await params
  const lessonId = /^\d+$/.test(rawId) ? Number(rawId) : NaN
  if (!Number.isSafeInteger(lessonId)) notFound()
  const lesson = await getPublicLesson(lessonId)
  if (!lesson) notFound()

  return (
    <main className={classes.page}>
      <section className={classes.card}>
        <Brand />
        <div className={classes.lesson}>
          <h1 className={classes.title}>{lesson.name}</h1>
          <dl className={classes.details}>
            <div>
              <dt>Curso</dt>
              <dd>{lesson.courseName}</dd>
            </div>
            <div>
              <dt>Professor</dt>
              <dd>{lesson.teacherName}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{formatDateOnly(lesson.date)}</dd>
            </div>
          </dl>
        </div>
        <CheckInForm lessonId={lesson.id} />
      </section>
    </main>
  )
}
