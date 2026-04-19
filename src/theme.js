export const colors = {
	bg0: '#0a0a0b',
	bg1: '#111113',
	bg2: '#1a1a1e',
	bg3: '#242428',
	border0: 'rgba(255,255,255,0.06)',
	border1: 'rgba(255,255,255,0.10)',
	border2: 'rgba(255,255,255,0.18)',
	text0: '#f5f5f5',
	text1: '#a0a0ab',
	text2: '#5a5a6a',
	accent: '#da7756',
	accentSoft: 'rgba(218,119,86,0.15)',
	error: '#cf4444',
	success: '#4caf7d',
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }

export const radius = { sm: 6, md: 10, lg: 16, full: 9999 }

export const font = {
	xs: 11, sm: 13, md: 15, lg: 17, xl: 20,
	regular: '400', medium: '500', semibold: '600', bold: '700',
}

export const shadow = {
	sm: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
	md: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
	lg: { elevation: 12, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
}

export default { colors, spacing, radius, font, shadow }
