import { useCallback, useRef, useState, useEffect } from 'react'
import {
	SafeAreaView,
	StatusBar,
	View,
	Text,
	TextInput,
	StyleSheet,
	Modal,
	Pressable,
	Share,
	useWindowDimensions,
	Animated,
	Easing,
} from 'react-native'
import { WebView } from 'react-native-webview'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
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
	const spinValue = useRef(new Animated.Value(0)).current

	useEffect(() => {
		let anim
		if (isLoading) {
			spinValue.setValue(0)
			anim = Animated.loop(
				Animated.timing(spinValue, {
					toValue: 1,
					duration: 1000,
					easing: Easing.linear,
					useNativeDriver: true,
				})
			)
			anim.start()
		} else {
			spinValue.stopAnimation()
			spinValue.setValue(0)
		}
		return () => anim && anim.stop()
	}, [isLoading, spinValue])

	const spinRotate = spinValue.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg']
	})

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
				<View style={styles.urlBarContainer}>
					<View style={[styles.urlPill, inputFocused && styles.urlPillFocused]}>
						<Icon 
							name={inputUrl.startsWith('https') ? 'lock-outline' : 'earth'} 
							size={18} 
							color={inputFocused ? colors.accent : colors.text1} 
							style={styles.urlProtocolIcon} 
						/>
						<TextInput
							ref={urlInputRef}
							value={inputFocused ? inputUrl : (getDisplayUrl(activeTab?.url) || inputUrl)}
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
						<Pressable onPress={handleRefreshStop} style={styles.urlBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						{isLoading ? (
						<Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
						  <Icon name="loading" size={18} color={colors.accent} />
						</Animated.View>
						) : (
						<Icon name="refresh" size={18} color={colors.text1} />
						)}
						</Pressable>
					</View>
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
				<View style={[styles.bottomNavWrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
					<View style={styles.bottomNav}>
						<Pressable onPress={handleBack} style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Icon name="chevron-left" size={24} color={colors.text1} />
						</Pressable>
						<Pressable onPress={handleForward} style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Icon name="chevron-right" size={24} color={colors.text1} />
						</Pressable>
						<Pressable
							onPress={() => { haptic(); activeTab && activeTab.url !== 'about:blank' && toggleBookmark(activeTab.url, activeTab.title) }}
							style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Icon name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={bookmarked ? colors.accent : colors.text1} />
						</Pressable>
						<Pressable
							onPress={() => { haptic(); setShowTabs(true) }}
							style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<View style={styles.tabsBadge}>
								<Text style={styles.tabsBadgeText}>{tabs.length}</Text>
							</View>
						</Pressable>
						<Pressable
							onPress={() => { haptic(); setShowMenu(true) }}
							style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Icon name="dots-horizontal" size={24} color={colors.text1} />
						</Pressable>
					</View>
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

			<Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
				<Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)} />
				<View style={[styles.menu, { bottom: 80 + Math.max(insets.bottom, spacing.sm) }]}>
					<View style={styles.menuGroup}>
						<MenuItem icon="plus" label="New Tab" onPress={() => handleMenuAction('new-tab')} />
					</View>
					<View style={styles.menuSeparator} />
					<View style={styles.menuGroup}>
						<MenuItem
							icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
							label={bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
							accent={bookmarked}
							onPress={() => handleMenuAction('toggle-bookmark')}
						/>
						<MenuItem icon="book-open-outline" label="Bookmarks" onPress={() => handleMenuAction('bookmarks')} />
						<MenuItem icon="history" label="History" onPress={() => handleMenuAction('history')} />
					</View>
					<View style={styles.menuSeparator} />
					<View style={styles.menuGroup}>
						<MenuItem
							icon={settings.desktopMode ? 'monitor' : 'cellphone'}
							label={settings.desktopMode ? 'Mobile Site' : 'Desktop Site'}
							onPress={() => handleMenuAction('desktop')}
						/>
						<MenuItem icon="share-variant" label="Share" onPress={() => handleMenuAction('share')} />
						<MenuItem icon="link" label="Copy URL" onPress={() => handleMenuAction('copy-url')} />
						<MenuItem icon="cookie-outline" label="Copy Cookies" onPress={() => handleMenuAction('copy-cookies')} />
					</View>
					<View style={styles.menuSeparator} />
					<View style={styles.menuGroup}>
						<MenuItem icon="delete-outline" label="Clear Data" onPress={() => handleMenuAction('clear-data')} />
					</View>
				</View>
			</Modal>
		</>
	)
}

const MenuItem = ({ icon, label, onPress, accent }) => (
	<Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, accent && styles.menuItemAccent, pressed && { backgroundColor: colors.bg3 }]}>
		<Icon name={icon} size={20} color={accent ? colors.accent : colors.text1} style={styles.menuItemIcon} />
		<Text style={[styles.menuItemText, accent && { color: colors.accent }]}>{label}</Text>
	</Pressable>
)

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg0,
	},
	urlBarContainer: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		backgroundColor: colors.bg1,
	},
	urlPill: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 42,
		borderRadius: radius.full,
		backgroundColor: colors.bg2,
		borderWidth: 1,
		borderColor: colors.border1,
		paddingHorizontal: spacing.sm,
	},
	urlPillFocused: {
		borderColor: colors.accent,
		backgroundColor: colors.accentSoft,
	},
	urlProtocolIcon: {
		paddingHorizontal: spacing.xs,
	},
	urlInput: {
		flex: 1,
		color: colors.text0,
		fontSize: font.md,
		paddingHorizontal: spacing.xs,
		height: '100%',
	},
	urlBtn: {
		padding: spacing.xs,
		alignItems: 'center',
		justifyContent: 'center',
	},
	progressTrack: {
		height: 3,
		backgroundColor: 'transparent',
	},
	progressFill: {
		height: 3,
		backgroundColor: colors.accent,
		shadowColor: colors.accent,
		shadowOpacity: 0.6,
		shadowRadius: 4,
		elevation: 2,
	},
	webviewLayer: {
		flex: 1,
		backgroundColor: colors.bg0,
	},
	webview: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.bg0,
	},
	bottomNavWrap: {
		backgroundColor: colors.bg1,
		borderTopWidth: 1,
		borderTopColor: colors.border0,
		paddingTop: spacing.sm,
	},
	bottomNav: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: colors.bg2,
		borderWidth: 1,
		borderColor: colors.border1,
		borderRadius: radius.lg,
		marginHorizontal: 16,
		marginBottom: 8,
		height: 56,
		...shadow.md,
	},
	navBtn: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
		borderRadius: radius.lg,
	},
	navBtnPressed: {
		backgroundColor: colors.bg3,
	},
	tabsBadge: {
		minWidth: 24,
		height: 24,
		paddingHorizontal: spacing.xs,
		borderRadius: radius.sm,
		backgroundColor: colors.bg3,
		borderWidth: 1,
		borderColor: colors.border2,
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
		backgroundColor: 'rgba(0,0,0,0.6)',
	},
	menu: {
		position: 'absolute',
		right: spacing.md,
		minWidth: 220,
		backgroundColor: colors.bg2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border1,
		paddingVertical: spacing.xs,
		...shadow.md,
	},
	menuGroup: {
		paddingVertical: spacing.xs,
	},
	menuSeparator: {
		borderBottomWidth: 0.5,
		borderBottomColor: colors.border0,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderLeftWidth: 3,
		borderLeftColor: 'transparent',
	},
	menuItemAccent: {
		borderLeftColor: colors.accent,
	},
	menuItemIcon: {
		marginRight: spacing.md,
	},
	menuItemText: {
		color: colors.text0,
		fontSize: font.md,
	},
})

export default BrowserScreen
