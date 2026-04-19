import { useCallback, useRef, useState } from 'react'
import {
	SafeAreaView,
	StatusBar,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Pressable,
	Share,
	useWindowDimensions,
} from 'react-native'
import { WebView } from 'react-native-webview'
import Clipboard from '@react-native-clipboard/clipboard'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, font, shadow } from './theme'
import { processInput, getDisplayUrl } from './utils'
import useBrowserStore from './store'
import TabsSheet from './TabsSheet'
import BookmarksSheet from './BookmarksSheet'
import HistorySheet from './HistorySheet'

const AD_DOMAINS = [
	'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
	'adservice.google.com', 'amazon-adsystem.com', 'criteo.com', 'adnxs.com',
	'pagead2.googlesyndication.com', 'ads.google.com', 'adtago.s3.amazonaws.com',
]

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const COOKIE_SCRIPT = `(function(){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'COOKIES',value:document.cookie||''}))}catch(e){}})();true;`

const haptic = () => {
	try {
		ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true, ignoreAndroidSystemSettings: false })
	} catch {}
}

const BrowserScreen = () => {
	const tabs = useBrowserStore(s => s.tabs)
	const activeTabIndex = useBrowserStore(s => s.activeTabIndex)
	const updateTab = useBrowserStore(s => s.updateTab)
	const openTab = useBrowserStore(s => s.openTab)
	const addHistory = useBrowserStore(s => s.addHistory)
	const toggleBookmark = useBrowserStore(s => s.toggleBookmark)
	const isBookmarked = useBrowserStore(s => s.isBookmarked)
	const settings = useBrowserStore(s => s.settings)
	const updateSetting = useBrowserStore(s => s.updateSetting)

	const activeTab = tabs[activeTabIndex] || tabs[0]
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const webViewRefs = useRef({})
	const urlInputRef = useRef(null)
	const navState = useRef({})

	const [inputUrl, setInputUrl] = useState(activeTab?.url || '')
	const [inputFocused, setInputFocused] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [loadProgress, setLoadProgress] = useState(0)
	const [showMenu, setShowMenu] = useState(false)
	const [showTabs, setShowTabs] = useState(false)
	const [showBookmarks, setShowBookmarks] = useState(false)
	const [showHistory, setShowHistory] = useState(false)

	const activeRef = activeTab ? webViewRefs.current[activeTab.id] : null

	const handleLoadStart = useCallback(() => {
		setIsLoading(true)
		setLoadProgress(0)
	}, [])

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false)
		setLoadProgress(1)
	}, [])

	const handleNavChange = useCallback((tabId, state) => {
		navState.current[tabId] = state
		updateTab(tabId, { url: state.url, title: state.title || getDisplayUrl(state.url) })
		if (!inputFocused && tabId === activeTab?.id) {
			setInputUrl(state.url === 'about:blank' ? '' : state.url)
		}
		if (!state.loading && state.url && state.url !== 'about:blank') {
			addHistory(state.url, state.title)
		}
	}, [updateTab, addHistory, inputFocused, activeTab])

	const handleMessage = useCallback((event) => {
		try {
			const msg = JSON.parse(event.nativeEvent.data)
			if (msg && msg.type === 'COOKIES') {
				Clipboard.setString(msg.value || '')
				haptic()
			}
		} catch {}
	}, [])

	const loadUrl = useCallback((rawUrl) => {
		if (!activeTab) return
		const url = processInput(rawUrl)
		updateTab(activeTab.id, { url })
		setInputUrl(url === 'about:blank' ? '' : url)
	}, [activeTab, updateTab])

	const handleSubmit = useCallback(() => {
		loadUrl(inputUrl)
		urlInputRef.current && urlInputRef.current.blur()
	}, [inputUrl, loadUrl])

	const handleRefreshStop = useCallback(() => {
		if (!activeRef) return
		if (isLoading) activeRef.stopLoading && activeRef.stopLoading()
		else activeRef.reload && activeRef.reload()
	}, [activeRef, isLoading])

	const handleBack = useCallback(() => {
		const s = navState.current[activeTab?.id]
		if (s && s.canGoBack && activeRef) {
			activeRef.goBack()
			return true
		}
		return false
	}, [activeRef, activeTab])

	const handleForward = useCallback(() => {
		const s = navState.current[activeTab?.id]
		if (s && s.canGoForward && activeRef) activeRef.goForward()
	}, [activeRef, activeTab])

	const handleCopyCookies = useCallback(() => {
		if (activeRef && activeRef.injectJavaScript) activeRef.injectJavaScript(COOKIE_SCRIPT)
	}, [activeRef])

	const handleMenuAction = useCallback(async (action) => {
		setShowMenu(false)
		haptic()
		switch (action) {
			case 'new-tab':
				openTab(settings.homepage || 'about:blank')
				break
			case 'bookmarks':
				setShowBookmarks(true)
				break
			case 'history':
				setShowHistory(true)
				break
			case 'desktop':
				await updateSetting('desktopMode', !settings.desktopMode)
				if (activeRef && activeRef.reload) activeRef.reload()
				break
			case 'share':
				try {
					if (activeTab?.url && activeTab.url !== 'about:blank') {
						await Share.share({ message: activeTab.url, url: activeTab.url })
					}
				} catch {}
				break
			case 'copy-url':
				if (activeTab?.url) Clipboard.setString(activeTab.url)
				break
			case 'copy-cookies':
				handleCopyCookies()
				break
			case 'clear-data':
				if (activeRef && activeRef.clearCache) activeRef.clearCache(true)
				break
			case 'toggle-bookmark':
				if (activeTab?.url && activeTab.url !== 'about:blank') {
					await toggleBookmark(activeTab.url, activeTab.title)
				}
				break
			default:
				break
		}
	}, [openTab, settings, updateSetting, activeRef, activeTab, handleCopyCookies, toggleBookmark])

	const bookmarked = activeTab ? isBookmarked(activeTab.url) : false

	return (
		<>
			<SafeAreaView style={styles.root}>
				<StatusBar barStyle="light-content" backgroundColor={colors.bg0} />
				<View style={styles.urlBar}>
					<View style={styles.urlIcon}>
						<Text style={styles.urlIconText}>◎</Text>
					</View>
					<TextInput
						ref={urlInputRef}
						value={inputUrl}
						onChangeText={setInputUrl}
						onFocus={() => {
							setInputFocused(true)
							setInputUrl(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '')
						}}
						onBlur={() => {
							setInputFocused(false)
							setInputUrl(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '')
						}}
						onSubmitEditing={handleSubmit}
						placeholder="Search or type URL"
						placeholderTextColor={colors.text2}
						style={styles.urlInput}
						selectTextOnFocus
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
						returnKeyType="go"
					/>
					<TouchableOpacity onPress={handleRefreshStop} style={styles.urlBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={styles.urlBtnText}>{isLoading ? '×' : '↻'}</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.progressTrack}>
					<View style={[
						styles.progressFill,
						{ width: isLoading ? Math.max(2, loadProgress * width) : 0, opacity: isLoading ? 1 : 0 },
					]} />
				</View>
				<View style={styles.webviewLayer}>
					{tabs.map(tab => (
						<WebView
							key={tab.id}
							ref={ref => { webViewRefs.current[tab.id] = ref }}
							style={[styles.webview, { display: tab.id === activeTab?.id ? 'flex' : 'none' }]}
							source={{ uri: tab.url || 'about:blank' }}
							onLoadStart={handleLoadStart}
							onLoadEnd={handleLoadEnd}
							onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
							onNavigationStateChange={state => handleNavChange(tab.id, state)}
							onMessage={handleMessage}
							onShouldStartLoadWithRequest={request => {
								if (!settings.adBlock) return true
								try {
									const host = new URL(request.url).hostname
									return !AD_DOMAINS.some(d => host.includes(d))
								} catch { return true }
							}}
							userAgent={settings.desktopMode ? DESKTOP_UA : MOBILE_UA}
							javaScriptEnabled
							domStorageEnabled
							thirdPartyCookiesEnabled={false}
							allowsBackForwardNavigationGestures={false}
							pullToRefreshEnabled
						/>
					))}
				</View>
				<View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
					<TouchableOpacity onPress={handleBack} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={styles.navIcon}>‹</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={handleForward} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={styles.navIcon}>›</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => { haptic(); activeTab && activeTab.url !== 'about:blank' && toggleBookmark(activeTab.url, activeTab.title) }}
						style={styles.navBtn}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={[styles.navIcon, { color: bookmarked ? colors.accent : colors.text1 }]}>{bookmarked ? '★' : '☆'}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => { haptic(); setShowTabs(true) }}
						style={styles.navBtn}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<View style={styles.tabsBadge}>
							<Text style={styles.tabsBadgeText}>{tabs.length}</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => { haptic(); setShowMenu(true) }}
						style={styles.navBtn}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={styles.navIcon}>⋯</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>

			<TabsSheet visible={showTabs} onClose={() => setShowTabs(false)} />
			<BookmarksSheet
				visible={showBookmarks}
				onClose={() => setShowBookmarks(false)}
				onNavigate={loadUrl}
			/>
			<HistorySheet
				visible={showHistory}
				onClose={() => setShowHistory(false)}
				onNavigate={loadUrl}
			/>

			<Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
				<Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)} />
				<View style={[styles.menu, { bottom: 64 + Math.max(insets.bottom, spacing.sm) }]}>
					<MenuItem label="New Tab" onPress={() => handleMenuAction('new-tab')} />
					<MenuItem
						label={bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
						accent={bookmarked}
						onPress={() => handleMenuAction('toggle-bookmark')}
					/>
					<MenuItem label="Bookmarks" onPress={() => handleMenuAction('bookmarks')} />
					<MenuItem label="History" onPress={() => handleMenuAction('history')} />
					<MenuItem
						label={settings.desktopMode ? 'Mobile Site' : 'Desktop Site'}
						onPress={() => handleMenuAction('desktop')}
					/>
					<MenuItem label="Share" onPress={() => handleMenuAction('share')} />
					<MenuItem label="Copy URL" onPress={() => handleMenuAction('copy-url')} />
					<MenuItem label="Copy Cookies" onPress={() => handleMenuAction('copy-cookies')} />
					<MenuItem label="Clear Data" onPress={() => handleMenuAction('clear-data')} />
				</View>
			</Modal>
		</>
	)
}

const MenuItem = ({ label, onPress, accent }) => (
	<TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.7}>
		<Text style={[styles.menuItemText, accent && { color: colors.accent }]}>{label}</Text>
	</TouchableOpacity>
)

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg0,
	},
	urlBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		backgroundColor: colors.bg1,
		borderBottomWidth: 1,
		borderBottomColor: colors.border0,
	},
	urlIcon: {
		width: 28,
		height: 28,
		borderRadius: radius.full,
		backgroundColor: colors.bg2,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: spacing.sm,
	},
	urlIconText: {
		color: colors.accent,
		fontSize: font.md,
	},
	urlInput: {
		flex: 1,
		color: colors.text0,
		fontSize: font.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		backgroundColor: colors.bg2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border0,
	},
	urlBtn: {
		marginLeft: spacing.sm,
		width: 36,
		height: 36,
		borderRadius: radius.full,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg2,
	},
	urlBtnText: {
		color: colors.text0,
		fontSize: font.lg,
	},
	progressTrack: {
		height: 2,
		backgroundColor: 'transparent',
	},
	progressFill: {
		height: 2,
		backgroundColor: colors.accent,
	},
	webviewLayer: {
		flex: 1,
		backgroundColor: colors.bg0,
	},
	webview: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.bg0,
	},
	bottomNav: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: colors.bg1,
		borderTopWidth: 1,
		borderTopColor: colors.border0,
		paddingTop: spacing.sm,
	},
	navBtn: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.sm,
	},
	navIcon: {
		color: colors.text1,
		fontSize: font.xl,
	},
	tabsBadge: {
		minWidth: 24,
		height: 24,
		paddingHorizontal: spacing.xs,
		borderRadius: radius.sm,
		borderWidth: 1.5,
		borderColor: colors.text1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabsBadgeText: {
		color: colors.text0,
		fontSize: font.xs,
		fontWeight: font.semibold,
	},
	menuBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	menu: {
		position: 'absolute',
		right: spacing.md,
		minWidth: 200,
		backgroundColor: colors.bg2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border1,
		paddingVertical: spacing.xs,
		...shadow.md,
	},
	menuItem: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
	},
	menuItemText: {
		color: colors.text0,
		fontSize: font.md,
	},
})

export default BrowserScreen
