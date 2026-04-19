const GOOGLE = 'https://www.google.com/search?q='

export function processInput(input) {
	const trimmed = (input || '').trim()
	if (!trimmed) return 'about:blank'
	if (
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('about:') ||
		trimmed.startsWith('file://')
	) {
		return trimmed
	}
	if (trimmed.indexOf(' ') === -1 && trimmed.indexOf('.') !== -1) {
		return 'https://' + trimmed
	}
	return GOOGLE + encodeURIComponent(trimmed)
}

export function getDisplayUrl(url) {
	if (!url || url === 'about:blank') return ''
	let out = url
	if (out.startsWith('https://')) out = out.slice(8)
	else if (out.startsWith('http://')) out = out.slice(7)
	if (out.startsWith('www.')) out = out.slice(4)
	if (out.endsWith('/')) out = out.slice(0, -1)
	return out
}

export function isHttpUrl(url) {
	return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))
}
