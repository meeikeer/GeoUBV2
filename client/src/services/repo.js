const RAW_BASE = 'https://raw.githubusercontent.com/meeikeer/GeoUBV2/main'
const COLECCIONES = ['sede', 'edificio', 'piso', 'habitacion', 'categoria']

export async function readRepoFile(path) {
  const url = `${RAW_BASE}/${path.replace(/^\/+/, '')}`
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`raw: HTTP ${res.status} para ${path}`)
  return res.json()
}

export async function readGeodata() {
  const results = await Promise.all(
    COLECCIONES.map(async (name) => {
      try {
        return await readRepoFile(`geodata/${name}.json`)
      } catch (err) {
        console.warn('repo: no se pudo leer geodata/' + name + '.json, se usa []', err)
        return []
      }
    })
  )
  return {
    sede: results[0],
    edificio: results[1],
    piso: results[2],
    habitacion: results[3],
    categoria: results[4]
  }
}
