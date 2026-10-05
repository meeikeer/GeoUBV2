import { assetUrl } from '../../lib/assets.js'

const ICONS = {
  back: '/assets/icons/button-back.svg',
  pin: '/assets/icons/button-ubication.svg',
  route: '/assets/icons/button-calculate.svg',
  list: '/assets/icons/button-list.svg',
  logout: '/assets/icons/button-singout.svg',
  restart: '/assets/icons/button-restart.svg',
  zoomin: '/assets/icons/button-zoomin.svg',
  zoomout: '/assets/icons/button-zoomout.svg',
  edit: '/assets/icons/button-edit.svg',
  trash: '/assets/icons/button-delete.svg',
  search: '/assets/icons/button-search.svg',

  aula: '/assets/icons/categ-classroom.svg',
  banoMujeres: '/assets/icons/categ-womans.svg',
  banoHombres: '/assets/icons/categ-mans.svg',
  biblioteca: '/assets/icons/categ-library.svg',
  cafeteria: '/assets/icons/categ-coffeeshop.svg',
  comedor: '/assets/icons/categ-food.svg',
  coordinacion: '/assets/icons/categ-coordination.svg',
  entrada: '/assets/icons/categ-entrance.svg',
  escaleras: '/assets/icons/categ-stairs.svg',
  gym: '/assets/icons/categ-gym.svg',
  laboratorio: '/assets/icons/categ-laboratory.svg',
  oficina: '/assets/icons/categ-office.svg',
  salud: '/assets/icons/categ-health.svg'
}

export default function AssetIcon({ name, src, className = '', style }) {
  const url = src || (name && ICONS[name])
  if (!url) return null
  const href = assetUrl(url)
  return (
    <span
      aria-hidden="true"
      className={`mask-icon ${className}`}
      style={{ ...style, WebkitMaskImage: `url(${href})`, maskImage: `url(${href})` }}
    />
  )
}