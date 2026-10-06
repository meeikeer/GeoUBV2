const REPO_OWNER = 'meeikeer'
const REPO_NAME = 'GeoUBV2'

const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

export function getRepoInfo() {
  return { owner: REPO_OWNER, repo: REPO_NAME }
}

export async function githubFetch(path, options = {}, token = null) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers
  }
  if (token) {
    headers['Authorization'] = `token ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    throw new Error('Token inválido o expirado')
  }
  if (res.status === 403) {
    const remaining = res.headers.get('X-RateLimit-Remaining')
    if (remaining === '0') {
      throw new Error('Rate limit de GitHub alcanzado. Espera 1 hora.')
    }
    throw new Error('Permisos insuficientes')
  }
  if (res.status === 404) {
    throw new Error('Recurso no encontrado')
  }
  if (!res.ok) {
    throw new Error(`Error GitHub API: ${res.status}`)
  }

  return res
}

/* base64 <-> texto pasando por bytes UTF-8.

   btoa/atob son de 1 byte por carácter (Latin-1): btoa escribía la ñ como el
   byte suelto 0xF1 y dejaba el JSON del repo como UTF-8 inválido, y atob leía
   los bytes UTF-8 de GitHub uno a uno y daba mojibake ("BaÃ±o"). Con
   TextEncoder/TextDecoder el contenido que viaja por la Contents API es UTF-8
   de verdad, igual que el fichero en el repo. */
function encodeText(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeText(base64) {
  const binary = atob(base64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

export async function getFileContent(filePath, token) {
  const res = await githubFetch(`/contents/${filePath}`, {}, token)
  const data = await res.json()
  return {
    content: JSON.parse(decodeText(data.content)),
    sha: data.sha
  }
}

export async function writeFile(filePath, content, sha, message, token) {
  const body = {
    message,
    content: encodeText(JSON.stringify(content, null, 2))
  }
  if (sha) {
    body.sha = sha
  }

  const res = await githubFetch(`/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, token)

  return res.json()
}

export async function deleteFile(filePath, sha, message, token) {
  const body = {
    message,
    sha
  }

  const res = await githubFetch(`/contents/${filePath}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, token)

  return res.json()
}

export async function validateToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`
    }
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}
