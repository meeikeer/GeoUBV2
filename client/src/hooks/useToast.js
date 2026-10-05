import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION = 3200

/* Cola de avisos con región aria-live. Sustituye al estado suelto de MapPage:
   antes solo había un mensaje a la vez y el último pisaba al anterior. */
export function useToast() {
  const [toasts, setToasts] = useState([])
  const [liveMessage, setLiveMessage] = useState('')
  const timersRef = useRef(new Map())
  const seqRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
    if (!message) return
    const id = ++seqRef.current
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setLiveMessage(message)
    const timer = setTimeout(() => dismiss(id), duration)
    timersRef.current.set(id, timer)
  }, [dismiss])

  const success = useCallback((m, d) => push(m, 'success', d), [push])
  const warning = useCallback((m, d) => push(m, 'warning', d), [push])
  const info = useCallback((m, d) => push(m, 'info', d), [push])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  return { toasts, liveMessage, push, success, warning, info, dismiss }
}