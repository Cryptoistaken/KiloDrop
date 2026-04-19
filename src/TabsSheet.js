import { useRef } from 'react'
import {
	Modal,
	View,
	Text,
	FlatList,
	StyleSheet,
	Animated,
	PanResponder,
	Pressable,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, spacing, radius, font, shadow } from './theme'
import { getDisplayUrl } from './utils'
import useBrowserStore from './store'

const TabsSheet = ({ visible, onClose }) => {
	const tabs = useBrowserStore(s => s.tabs)
	const activeTabIndex = useBrowserStore(s => s.activeTabIndex)
	const switchTab = useBrowserStore(s => s.switchTab)
	const closeTab = useBrowserStore(s => s.closeTab)
	const openTab = useBrowserStore(s => s.openTab)
	const settings = useBrowserStore(s => s.settings)

	const translateY = useRef(new Animated.Value(0)).current

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
			onPanResponderMove: (_, g) => {
				if (g.dy > 0) translateY.setValue(g.dy)
			},
			onPanResponderRelease: (_, g) => {
				if (g.dy > 80) {
					Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
						translateY.setValue(0)
						onClose && onClose()
					})
				} else {
					Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
				}
			},
		}),
	).current

	const handleOpenTab = (index) => {
		switchTab(index)
		onClose && onClose()
	}

	const handleNewTab = () => {
		openTab(settings.homepage || 'about:blank')
		onClose && onClose()
	}

	const renderItem = ({ item, index }) => {
		const isActive = index === activeTabIndex
		const letter = (item.title || item.url || '?').trim().charAt(0).toUpperCase() || '?'
		return (
			<Pressable
				onPress={() => handleOpenTab(index)}
				style={({ pressed }) => [styles.row, isActive && styles.rowActive, pressed && { backgroundColor: colors.bg3 }]}>
				<View style={[styles.thumb, { backgroundColor: colors.bg3 }]}>
					<Text style={styles.thumbText}>{letter}</Text>
				</View>
				<View style={styles.meta}>
					<Text style={styles.title} numberOfLines={1}>{item.title || 'New Tab'}</Text>
					<Text style={styles.url} numberOfLines={1}>{getDisplayUrl(item.url) || 'about:blank'}</Text>
				</View>
				<Pressable
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					onPress={() => closeTab(item.id)}
					style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
					<Icon name="close" size={20} color={colors.text1} />
				</Pressable>
			</Pressable>
		)
	}

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose} />
			<Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
				<View {...panResponder.panHandlers} style={styles.handleWrap}>
					<View style={styles.handle} />
				</View>
				<View style={styles.header}>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<Text style={styles.headerTitle}>Tabs</Text>
						<Text style={styles.headerCount}>{tabs.length}</Text>
					</View>
					<Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({pressed}) => pressed && {opacity: 0.6}}>
						<Icon name="close" size={24} color={colors.text1} />
					</Pressable>
				</View>
				<FlatList
					data={tabs}
					keyExtractor={t => t.id}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
				/>
				<Pressable style={({ pressed }) => [styles.newTabBtn, pressed && { backgroundColor: colors.bg3 }]} onPress={handleNewTab}>
					<Icon name="plus" size={20} color={colors.accent} style={{marginRight: 8}} />
					<Text style={styles.newTabText}>New Tab</Text>
				</Pressable>
			</Animated.View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	sheet: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		maxHeight: '85%',
		backgroundColor: colors.bg1,
		borderTopLeftRadius: radius.lg,
		borderTopRightRadius: radius.lg,
		borderTopWidth: 1,
		borderColor: colors.border0,
		paddingBottom: spacing.lg,
		...shadow.lg,
	},
	handleWrap: {
		paddingTop: spacing.md,
		paddingBottom: spacing.sm,
		alignItems: 'center',
	},
	handle: {
		width: 40,
		height: 4,
		borderRadius: radius.full,
		backgroundColor: colors.bg2,
		marginBottom: spacing.md,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border0,
		marginBottom: spacing.md,
	},
	headerTitle: {
		color: colors.text0,
		fontSize: font.lg,
		fontWeight: 'bold',
		marginRight: spacing.sm,
	},
	headerCount: {
		color: colors.text1,
		fontSize: font.sm,
	},
	listContent: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.lg,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border0,
	},
	rowActive: {
		backgroundColor: colors.bg2,
	},
	thumb: {
		width: 36,
		height: 36,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: spacing.md,
	},
	thumbText: {
		color: colors.text0,
		fontSize: font.md,
		fontWeight: 'bold',
	},
	meta: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		color: colors.text0,
		fontSize: font.md,
		fontWeight: font.medium,
	},
	url: {
		color: colors.text1,
		fontSize: font.xs,
		marginTop: 2,
	},
	actionBtn: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
	},
	newTabBtn: {
		marginHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.md,
		backgroundColor: colors.accentSoft,
		borderWidth: 1,
		borderColor: colors.accent,
	},
	newTabText: {
		color: colors.accent,
		fontSize: font.md,
		fontWeight: font.semibold,
	},
})

export default TabsSheet
