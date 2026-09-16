import { hasEnPrefix } from './i18n'

/**
 * Liest den Kampagnen-Code aus der Kurz-URL oder Query:
 *   /k/CODE  ·  /karte/CODE  ·  /live/zugang/CODE
 *   ?code=…  ·  ?c=…
 */
export function campaignCodeFromLocation(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
): string {
  const withoutLangPrefix = hasEnPrefix(pathname) ? pathname.slice(3) : pathname
  const pathMatch = withoutLangPrefix.match(/^\/(?:k|karte|live\/zugang)\/([^/?#]+)/i)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim()
  const params = new URLSearchParams(search)
  return (params.get('code') || params.get('c') || '').trim()
}
