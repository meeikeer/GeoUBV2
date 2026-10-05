import { validateToken } from './github.js'

const TOKEN_KEY = 'geoubv_admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(token) {
  const user = await validateToken(token)
  if (!user) {
    throw new Error('Token inválido o expirado')
  }
  setToken(token)
  return user
}

export function logout() {
  clearToken()
}

export function isAuthenticated() {
  return !!getToken()
}
