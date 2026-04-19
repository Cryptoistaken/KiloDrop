import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = { bookmarks: 'kd_bookmarks', history: 'kd_history', settings: 'kd_settings' }
const MAX_HISTORY = 500
const MAX_TABS = 10

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const useBrowserStore = create((set, get) => ({
	tabs: [{ id: '1', url: 'about:blank', title: 'New Tab' }],
	activeTabIndex: 0,

	openTab: (url) => {
		const { tabs } = get()
		if (tabs.length >= MAX_TABS) return
		const tab = { id: genId(), url: url || 'about:blank', title: 'New Tab' }
		set({ tabs: [...tabs, tab], activeTabIndex: tabs.length })
	},

	closeTab: (id) => {
		const { tabs, activeTabIndex } = get()
		const idx = tabs.findIndex(t => t.id === id)
		if (idx === -1) return
		let next = tabs.filter(t => t.id !== id)
		if (next.length === 0) {
			next = [{ id: genId(), url: 'about:blank', title: 'New Tab' }]
			set({ tabs: next, activeTabIndex: 0 })
			return
		}
		let nextActive = activeTabIndex
		if (idx < activeTabIndex) nextActive = activeTabIndex - 1
		else if (idx === activeTabIndex) nextActive = Math.min(activeTabIndex, next.length - 1)
		set({ tabs: next, activeTabIndex: Math.max(0, nextActive) })
	},

	switchTab: (index) => {
		const { tabs } = get()
		if (index < 0 || index >= tabs.length) return
		set({ activeTabIndex: index })
	},

	updateTab: (id, patch) => {
		const { tabs } = get()
		set({ tabs: tabs.map(t => t.id === id ? { ...t, ...patch } : t) })
	},

	bookmarks: [],
	loadBookmarks: async () => {
		try {
			const raw = await AsyncStorage.getItem(KEYS.bookmarks)
			const parsed = raw ? JSON.parse(raw) : []
			set({ bookmarks: Array.isArray(parsed) ? parsed : [] })
		} catch {
			set({ bookmarks: [] })
		}
	},
	toggleBookmark: async (url, title) => {
		if (!url || url === 'about:blank') return
		const { bookmarks } = get()
		const exists = bookmarks.some(b => b.url === url)
		const next = exists
			? bookmarks.filter(b => b.url !== url)
			: [{ url, title: title || url, addedAt: Date.now() }, ...bookmarks]
		set({ bookmarks: next })
		try {
			await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(next))
		} catch {}
	},
	isBookmarked: (url) => get().bookmarks.some(b => b.url === url),

	history: [],
	loadHistory: async () => {
		try {
			const raw = await AsyncStorage.getItem(KEYS.history)
			const parsed = raw ? JSON.parse(raw) : []
			set({ history: Array.isArray(parsed) ? parsed : [] })
		} catch {
			set({ history: [] })
		}
	},
	addHistory: async (url, title) => {
		if (!url || url === 'about:blank') return
		const { history } = get()
		const filtered = history.filter(h => h.url !== url)
		const next = [{ url, title: title || url, visitedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY)
		set({ history: next })
		try {
			await AsyncStorage.setItem(KEYS.history, JSON.stringify(next))
		} catch {}
	},
	removeHistory: async (url) => {
		const { history } = get()
		const next = history.filter(h => h.url !== url)
		set({ history: next })
		try {
			await AsyncStorage.setItem(KEYS.history, JSON.stringify(next))
		} catch {}
	},
	clearHistory: async () => {
		set({ history: [] })
		try {
			await AsyncStorage.removeItem(KEYS.history)
		} catch {}
	},

	settings: {
		homepage: 'https://www.google.com',
		adBlock: true,
		desktopMode: false,
		clearOnExit: false,
	},
	loadSettings: async () => {
		try {
			const raw = await AsyncStorage.getItem(KEYS.settings)
			if (!raw) return
			const parsed = JSON.parse(raw)
			if (parsed && typeof parsed === 'object') {
				set({ settings: { ...get().settings, ...parsed } })
			}
		} catch {}
	},
	updateSetting: async (key, value) => {
		const next = { ...get().settings, [key]: value }
		set({ settings: next })
		try {
			await AsyncStorage.setItem(KEYS.settings, JSON.stringify(next))
		} catch {}
	},
}))

export default useBrowserStore
