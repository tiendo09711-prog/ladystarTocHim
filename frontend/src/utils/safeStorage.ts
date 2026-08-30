export function readStorage<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate && !validate(parsed) ? fallback : parsed as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T) {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)) } catch { return }
}
