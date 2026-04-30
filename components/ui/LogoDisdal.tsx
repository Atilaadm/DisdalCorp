interface LogoDisdalProps {
  height?: number
}

export default function LogoDisdal({ height = 48 }: LogoDisdalProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-disdal.png"
      alt="DiSDAL — Distribuindo Grandes Marcas"
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  )
}
