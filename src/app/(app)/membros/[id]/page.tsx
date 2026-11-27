import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Title } from '@mantine/core'
import {
  IconArrowLeft,
  IconHeart,
  IconHeartHandshake,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react'
import { Initials, PersonPill } from '@/components/person'
import { formatCpf } from '@/lib/cpf'
import { GROUP_ROLE, roleLabel, type AssignableRole } from '@/lib/group-roles'
import { getMemberPanel, type PanelGroup } from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { EditMemberButton } from './edit-member-button'
import classes from './member-panel.module.css'

const collator = new Intl.Collator('pt-BR')
const people = (n: number) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`

type Participation = { kind: 'ministry' | 'cell'; id: number; name: string; role: AssignableRole }

// Sublíderes primeiro; dentro de cada papel, por nome.
const byRoleThenName = (a: Participation, b: Participation) =>
  (a.role === b.role ? 0 : a.role === GROUP_ROLE.SubLeader ? -1 : 1) ||
  collator.compare(a.name, b.name)

function Section({ id, title, count, children }: { id: string; title: string; count?: number; children: ReactNode }) {
  return (
    <section className={classes.section} aria-labelledby={id}>
      <div className={classes.sectionHead}>
        <h2 id={id}>{title}</h2>
        {count ? <span className={classes.count}>{count}</span> : null}
      </div>
      {children}
    </section>
  )
}

function Stat({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li className={classes.stat}>
      <div className={classes.statTop}>
        <span className={classes.kind}>{icon}</span>
        {title}
      </div>
      {children}
    </li>
  )
}

function BigNumber({ value, unit }: { value: number; unit?: string }) {
  return (
    <p className={value ? classes.statNumber : `${classes.statNumber} ${classes.zero}`}>
      {value}
      {unit && <small>{unit}</small>}
    </p>
  )
}

function GroupStat({ title, icon, led, taking }: { title: string; icon: ReactNode; led: number; taking: number }) {
  return (
    <Stat title={title} icon={icon}>
      <BigNumber value={led + taking} />
      <div className={classes.statFoot}>
        <span className={led ? `${classes.chip} ${classes.chipLead}` : `${classes.chip} ${classes.muted}`}>
          Lidera {led}
        </span>
        <span className={taking ? classes.chip : `${classes.chip} ${classes.muted}`}>Participa {taking}</span>
      </div>
    </Stat>
  )
}

type Group = { kind: 'ministry' | 'cell'; id: number; name: string }

function GroupList<T extends Group>({ groups, aside }: { groups: T[]; aside: (g: T) => ReactNode }) {
  const column = (title: string, kind: 'ministry' | 'cell') => {
    const items = groups.filter((g) => g.kind === kind)
    if (!items.length) return null
    return (
      <div className={classes.column}>
        <h3>{title}</h3>
        <ul>
          {items.map((g) => (
            <li key={g.id} className={classes.row}>
              <span className={classes.kind}>
                {g.kind === 'ministry' ? <IconHeart size={19} stroke={1.75} /> : <IconUsersGroup size={19} stroke={1.75} />}
              </span>
              <span className={classes.rowName}>
                <span className={classes.srOnly}>{g.kind === 'ministry' ? 'Ministério' : 'Célula'}: </span>
                {g.name}
              </span>
              <span className={classes.rowAside}>{aside(g)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <div className={classes.list}>
      {column('Ministérios', 'ministry')}
      {column('Células', 'cell')}
    </div>
  )
}

export default async function MemberPanelPage({ params }: PageProps<'/membros/[id]'>) {
  const { id: rawId } = await params
  const id = /^\d+$/.test(rawId) ? Number(rawId) : NaN
  if (!Number.isSafeInteger(id)) notFound()
  const panel = await getMemberPanel(id)
  if (!panel) notFound()

  const { member, leads, peopleLed, parcaOf } = panel
  const name = fullName(member)
  const participates = [...member.participates].sort(byRoleThenName)
  const count = (items: { kind: string }[], kind: string) => items.filter((g) => g.kind === kind).length
  const subs = participates.filter((g) => g.role === GROUP_ROLE.SubLeader).length
  const roles = [
    { label: roleLabel(GROUP_ROLE.Leader), value: leads.length, tone: classes.toneLeader },
    { label: roleLabel(GROUP_ROLE.SubLeader), value: subs, tone: classes.toneSub },
    { label: roleLabel(GROUP_ROLE.Member), value: participates.length - subs, tone: classes.toneMember },
  ]
  const links = leads.length + participates.length
  const hiddenParca = parcaOf.total - parcaOf.preview.length

  return (
    <>
      <Link href="/membros" className={classes.back}>
        <IconArrowLeft size={18} stroke={1.75} />
        <span>
          <span className={classes.srOnly}>Voltar para </span>Membros
        </span>
      </Link>

      <header>
        <div className={classes.head}>
          <div className={classes.who}>
            <Initials name={name} size={72} />
            <div>
              <Title order={1} className={classes.title}>
                {name}
              </Title>
              <p className={classes.cpf}>
                CPF <span className={classes.num}>{formatCpf(member.cpf)}</span>
              </p>
            </div>
          </div>
          <EditMemberButton member={member} />
        </div>
        <dl className={classes.care}>
          <dt>Parça</dt>
          <dd>
            {member.parca ? (
              <PersonPill name={fullName(member.parca)} href={`/membros/${member.parca.id}`} />
            ) : (
              <>
                <span className={classes.dash} aria-hidden="true">
                  —
                </span>
                <span className={classes.srOnly}>Sem parça</span>
              </>
            )}
          </dd>
        </dl>
      </header>

      <section aria-label={`Indicadores de ${name}`}>
        <ul className={classes.stats}>
          <GroupStat
            title="Ministérios"
            icon={<IconHeart size={19} stroke={1.75} />}
            led={count(leads, 'ministry')}
            taking={count(participates, 'ministry')}
          />
          <GroupStat
            title="Células"
            icon={<IconUsersGroup size={19} stroke={1.75} />}
            led={count(leads, 'cell')}
            taking={count(participates, 'cell')}
          />
          <Stat title="Sob sua liderança" icon={<IconUsers size={19} stroke={1.75} />}>
            <BigNumber value={peopleLed} unit={peopleLed === 1 ? 'pessoa' : 'pessoas'} />
            <div className={classes.statFoot}>
              <span className={leads.length ? `${classes.chip} ${classes.chipLead}` : `${classes.chip} ${classes.muted}`}>
                em {leads.length} {leads.length === 1 ? 'grupo' : 'grupos'}
              </span>
            </div>
          </Stat>
          <Stat title="É parça de" icon={<IconHeartHandshake size={19} stroke={1.75} />}>
            <BigNumber value={parcaOf.total} unit={parcaOf.total === 1 ? 'pessoa' : 'pessoas'} />
            <div className={classes.statFoot}>
              {parcaOf.total ? (
                <span className={classes.stack} aria-hidden="true">
                  {parcaOf.preview.slice(0, 4).map((p) => (
                    <Initials key={p.id} name={fullName(p)} size={28} />
                  ))}
                </span>
              ) : (
                <span className={`${classes.chip} ${classes.muted}`}>Ninguém ainda</span>
              )}
            </div>
          </Stat>
        </ul>

        <div className={classes.roles}>
          <div className={classes.rolesHead}>
            <b>Papéis nos vínculos</b>
            <span className={classes.num}>
              {links} {links === 1 ? 'vínculo' : 'vínculos'} no total
            </span>
          </div>
          {links ? (
            <>
              <div className={classes.bar} aria-hidden="true">
                {roles
                  .filter((r) => r.value)
                  .map((r) => (
                    <i key={r.label} className={r.tone} style={{ flex: r.value }} />
                  ))}
              </div>
              <ul className={classes.legend}>
                {roles.map((r) => (
                  <li key={r.label}>
                    <i className={r.tone} aria-hidden="true" />
                    {r.label} <b>{r.value}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={classes.rolesEmpty}>Nenhum vínculo ainda, então não há papéis para distribuir.</p>
          )}
        </div>
      </section>

      <Section id="h-lidera" title="Lidera" count={leads.length}>
        {leads.length ? (
          <GroupList groups={leads} aside={(g: PanelGroup) => <span className={classes.num}>{people(g.people)}</span>} />
        ) : (
          <p className={classes.empty}>{name} ainda não lidera nenhum ministério nem célula.</p>
        )}
      </Section>

      <Section id="h-participa" title="Participa" count={participates.length}>
        {participates.length ? (
          <GroupList
            groups={participates}
            aside={(g: Participation) =>
              g.role === GROUP_ROLE.SubLeader ? (
                <span className={classes.roleSub}>{roleLabel(g.role)}</span>
              ) : (
                roleLabel(g.role)
              )
            }
          />
        ) : (
          <p className={classes.empty}>{name} ainda não participa de nenhum ministério nem célula.</p>
        )}
      </Section>

      <Section id="h-parca" title="É parça de" count={parcaOf.total}>
        {parcaOf.total ? (
          <div className={classes.pills}>
            {parcaOf.preview.map((p) => (
              <PersonPill key={p.id} name={fullName(p)} href={`/membros/${p.id}`} />
            ))}
            {hiddenParca > 0 && (
              <span className={classes.more}>
                +{hiddenParca} {hiddenParca === 1 ? 'outra' : 'outras'}
              </span>
            )}
          </div>
        ) : (
          <p className={classes.empty}>Ninguém tem {member.firstName} como parça ainda.</p>
        )}
      </Section>
    </>
  )
}
