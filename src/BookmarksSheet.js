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

const BookmarksSheet = ({ visible, onClose, onNavigate }) => {
	const bookmarks = useBrowserStore(s => s.bookmarks)
	const toggleBookmark = useBrowserStore(s => s.toggleBookmark)

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
				<Icon name="bookmark-outline" size={20} color={colors.accent} />
			</View>
			<View style={styles.meta}>
				<Text style={styles.title} numberOfLines={1}>{item.title || item.url}</Text>
				<Text style={styles.url} numberOfLines={1}>{getDisplayUrl(item.url)}</Text>
			</View>
			<Pressable
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				onPress={() => toggleBookmark(item.url, item.title)}
				style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
				<Icon name="close" size={20} color={colors.text1} />
			</Pressable>
			<Icon name="chevron-right" size={20} color={colors.text1} style={{ marginLeft: spacing.sm }} />
		</Pressable>
	)

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose} />
			<Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
				<View {...panResponder.panHandlers} style={styles.handleWrap}>
					<View style={styles.handle} />
				</View>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Bookmarks</Text>
					<Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({pressed}) => pressed && {opacity: 0.6}}>
						<Icon name="close" size={24} color={colors.text1} />
					</Pressable>
				</View>
				{bookmarks.length === 0 ? (
					<View style={styles.empty}>
						<Icon name="bookmark-off-outline" size={48} color={colors.text2} style={{ marginBottom: spacing.sm }} />
						<Text style={styles.emptyText}>No bookmarks yet</Text>
					</View>
				) : (
					<FlatList
						data={bookmarks}
						keyExtractor={b => b.url}
						renderItem={renderItem}
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

export default BookmarksSheet
