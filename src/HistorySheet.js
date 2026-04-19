import { useMemo, useRef } from 'react'
import {
	Modal,
	View,
	Text,
	SectionList,
	StyleSheet,
	Animated,
	PanResponder,
	Pressable,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, spacing, radius, font, shadow } from './theme'
import { getDisplayUrl } from './utils'
import useBrowserStore from './store'

const formatDateLabel = (ts) => {
	const d = new Date(ts)
	const today = new Date()
	const yesterday = new Date()
	yesterday.setDate(today.getDate() - 1)
	const sameDay = (a, b) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	if (sameDay(d, today)) return 'Today'
	if (sameDay(d, yesterday)) return 'Yesterday'
	return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const HistorySheet = ({ visible, onClose, onNavigate }) => {
	const history = useBrowserStore(s => s.history)
	const clearHistory = useBrowserStore(s => s.clearHistory)
	const removeHistory = useBrowserStore(s => s.removeHistory)

	const sections = useMemo(() => {
		const groups = new Map()
		for (const item of history) {
			const label = formatDateLabel(item.visitedAt || Date.now())
			if (!groups.has(label)) groups.set(label, [])
			groups.get(label).push(item)
		}
		return Array.from(groups.entries()).map(([title, data]) => ({ title, data }))
	}, [history])

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

	const handleOpen = (url) => {
		onClose && onClose()
		if (onNavigate) onNavigate(url)
	}

	const renderItem = ({ item }) => (
		<Pressable
			onPress={() => handleOpen(item.url)}
			style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg3 }]}>
			<View style={styles.icon}>
				<Icon name="history" size={20} color={colors.accent} />
			</View>
			<View style={styles.meta}>
				<Text style={styles.title} numberOfLines={1}>{item.title || item.url}</Text>
				<Text style={styles.url} numberOfLines={1}>{getDisplayUrl(item.url)}</Text>
			</View>
			<Pressable
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				onPress={() => removeHistory(item.url)}
				style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
				<Icon name="close" size={20} color={colors.text1} />
			</Pressable>
			<Icon name="chevron-right" size={20} color={colors.text1} style={{ marginLeft: spacing.sm }} />
		</Pressable>
	)

	const renderSectionHeader = ({ section }) => (
		<Text style={styles.sectionHeader}>{section.title}</Text>
	)

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose} />
			<Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
				<View {...panResponder.panHandlers} style={styles.handleWrap}>
					<View style={styles.handle} />
				</View>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>History</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<Pressable onPress={clearHistory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({pressed}) => [styles.clearBtnWrap, pressed && {opacity: 0.6}]}>
							<Text style={styles.clearBtn}>Clear All</Text>
						</Pressable>
						<Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({pressed}) => pressed && {opacity: 0.6}}>
							<Icon name="close" size={24} color={colors.text1} />
						</Pressable>
					</View>
				</View>
				{history.length === 0 ? (
					<View style={styles.empty}>
						<Icon name="history" size={48} color={colors.text2} style={{ marginBottom: spacing.sm }} />
						<Text style={styles.emptyText}>No history yet</Text>
					</View>
				) : (
					<SectionList
						sections={sections}
						keyExtractor={(item, i) => item.url + ':' + i}
						renderItem={renderItem}
						renderSectionHeader={renderSectionHeader}
						stickySectionHeadersEnabled={false}
						contentContainerStyle={styles.listContent}
					/>
				)}
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
	},
	clearBtnWrap: {
		marginRight: spacing.lg,
	},
	clearBtn: {
		color: colors.accent,
		fontSize: font.sm,
		fontWeight: font.medium,
	},
	sectionHeader: {
		color: colors.text1,
		fontSize: font.xs,
		fontWeight: font.semibold,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginTop: spacing.md,
		marginBottom: spacing.sm,
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
	icon: {
		width: 36,
		height: 36,
		borderRadius: radius.full,
		backgroundColor: colors.bg3,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: spacing.md,
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
	empty: {
		paddingVertical: spacing.xxxl,
		alignItems: 'center',
	},
	emptyText: {
		color: colors.text2,
		fontSize: font.md,
	},
})

export default HistorySheet
