import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { homePalette as colors } from '../customer/homePalette';

export default function QuickActionCard({ description, icon, onPress, title }) {
    return (
        <TouchableOpacity
            accessibilityLabel={title}
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={onPress}
            style={styles.card}
        >
            <MaterialCommunityIcons color={colors.accent} name={icon} size={22} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderCurve: 'continuous',
        borderRadius: 20,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.24)',
        flex: 1,
        gap: 12,
        minHeight: 118,
        minWidth: 0,
        padding: 16,
    },
    description: {
        color: colors.secondaryText,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    title: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
        lineHeight: 19,
    },
});
