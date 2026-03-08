// Generates or retrieves a persistent device UUID from localStorage
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('query-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('query-device-id', id)
  }
  return id
}
