import Link from 'next/link'

type Props = {
  backHref?: string
  backLabel?: string
  auraHref?: string
}

export default function LifePathBackLinks({ backHref = '/aura/lifepath', backLabel = 'Back to LifePath', auraHref = '/aura' }: Props) {
  return (
    <nav className="mb-5 flex flex-wrap gap-3 text-sm" aria-label="A.U.R.A LifePath navigation">
      <Link href={backHref} className="btn-secondary">
        {backLabel}
      </Link>
      <Link href={auraHref} className="btn-secondary">
        Back to A.U.R.A
      </Link>
    </nav>
  )
}
