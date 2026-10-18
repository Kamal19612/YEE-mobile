/**
 * Découpe un texte plain et rend les URLs http(s) en liens cliquables.
 * Pas de HTML injecté : seuls les segments URL deviennent des <a>.
 */
const URL_RE = /https?:\/\/[^\s<>"']+/gi

function trimTrailingPunctuation(url) {
  let href = url
  let trailing = ''
  while (/[),.;:!?]$/.test(href)) {
    trailing = href.slice(-1) + trailing
    href = href.slice(0, -1)
  }
  return { href, trailing }
}

export function LinkifiedText({ text, className = '' }) {
  const value = typeof text === 'string' ? text : ''
  if (!value) return null

  const nodes = []
  let lastIndex = 0
  let match
  const re = new RegExp(URL_RE.source, URL_RE.flags)

  while ((match = re.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index))
    }
    const { href, trailing } = trimTrailingPunctuation(match[0])
    nodes.push(
      <a
        key={`url-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-bb-primary hover:underline"
      >
        {href}
      </a>,
    )
    if (trailing) nodes.push(trailing)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex))
  }

  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {nodes}
    </span>
  )
}
