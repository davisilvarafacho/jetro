import { redirect } from 'next/navigation'
import { Brand } from '@/components/brand'
import { getCurrentUser } from '@/lib/session'
import { LoginForm } from './login-form'
import classes from './login.module.css'

// Árvore abstrata em quatro camadas (1, 3, 6 e 12 pessoas); a última folha é a pessoa sem líder.
function Tiers() {
  const W = 560
  const H = 340
  const ys = [40, 130, 220, 310]
  const radii = [11, 9, 7.5, 6]
  const opacities = [0.95, 0.85, 0.7, 0.55]
  const counts = [1, 3, 6, 12]
  const tiers = counts.map((n) => Array.from({ length: n }, (_, i) => (W * (i + 0.5)) / n))

  const lines: { d: string }[] = []
  const dots: { cx: number; cy: number; r: number; fill: string }[] = []

  tiers.forEach((xs, k) => {
    xs.forEach((x, i) => {
      const unled = k === 3 && i === 11
      if (k > 0 && !unled) {
        const parents = tiers[k - 1]
        const p = parents[Math.min(Math.floor((i * parents.length) / xs.length), parents.length - 1)]
        const mid = (ys[k - 1] + ys[k]) / 2
        lines.push({ d: `M${p} ${ys[k - 1]}C${p} ${mid} ${x} ${mid} ${x} ${ys[k]}` })
      }
      dots.push({
        cx: x,
        cy: ys[k],
        r: radii[k],
        fill: unled ? '#F0775A' : `rgba(255,255,255,${opacities[k]})`,
      })
    })
  })

  return (
    <svg
      className={classes.tiers}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Rede de cuidado em camadas: cada pessoa cuida de algumas, e uma delas está sem líder"
    >
      {lines.map((l) => (
        <path key={l.d} d={l.d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth={1.5} />
      ))}
      {dots.map((c) => (
        <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
      ))}
    </svg>
  )
}

export default async function LoginPage() {
  // Só redireciona com usuário real; cookie órfão (usuário apagado) apenas mostra o formulário.
  if (await getCurrentUser()) redirect('/membros')

  return (
    <main className={classes.login}>
      <section className={classes.panel}>
        <Brand inverted />
        <Tiers />
        <p className={classes.verse}>
          Põe-nos sobre eles por maiorais de mil, maiorais de cem, maiorais de cinquenta e maiorais
          de dez.
          <cite>Êxodo 18:21</cite>
        </p>
      </section>
      <section className={classes.right}>
        <LoginForm />
      </section>
    </main>
  )
}
