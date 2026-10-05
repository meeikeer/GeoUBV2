const REPO_OWNER = 'TU_GITHUB_USERNAME'
const REPO_NAME = 'TU_REPO_NAME'

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

export async function getFileContent(filePath, token) {
  const res = await githubFetch(`/contents/${filePath}`, {}, token)
  const data = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return {
    content: JSON.parse(content),
    sha: data.sha
  }
}

export async function writeFile(filePath, content, sha, message, token) {
  const body = {
    message,
    content: btoa(JSON.stringify(content, null, 2))
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
