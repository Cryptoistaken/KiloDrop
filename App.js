import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableScreens } from 'react-native-screens'
import BrowserScreen from './src/BrowserScreen'
import useBrowserStore from './src/store'

enableScreens()

export default function App() {
	const loadBookmarks = useBrowserStore(s => s.loadBookmarks)
	const loadHistory = useBrowserStore(s => s.loadHistory)
	const loadSettings = useBrowserStore(s => s.loadSettings)
	const clearHistory = useBrowserStore(s => s.clearHistory)

	useEffect(() => {
		const init = async () => {
			await loadSettings()
			await loadBookmarks()
			await loadHistory()
			const { settings: s } = useBrowserStore.getState()
			if (s.clearOnExit) await clearHistory()
		}
		init()
	}, [loadBookmarks, loadHistory, loadSettings, clearHistory])

	return (
		<SafeAreaProvider>
			<BrowserScreen />
		</SafeAreaProvider>
	)
}
