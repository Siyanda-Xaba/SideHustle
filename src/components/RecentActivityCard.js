import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { homePalette as colors } from '../customer/homePalette';

export default function RecentActivityCard({ activities, onActivityPress, onViewAllPress }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity
                    accessibilityLabel="View all activity"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={onViewAllPress}
                >
                    <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.card}>
                {activities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No recent activity</Text>
                    </View>
                ) : (
                    activities.map((activity, index) => {
                        const isDiagnostic = activity.title.toLowerCase().includes('diagnostic');
                        const isScheduled = activity.status.toLowerCase().includes('scheduled');
                        return (
                            <TouchableOpacity
                                accessibilityRole="button"
                                activeOpacity={0.7}
                                key={activity.id}
                                onPress={() => onActivityPress(activity)}
                                style={[
                                    styles.activityRow,
                                    index < activities.length - 1
                                        ? {
                                            borderBottomColor: colors.border,
                                            borderBottomWidth: 1,
                                        }
                                        : null,
                                ]}
                            >
                                <MaterialCommunityIcons
                                    color={colors.text}
                                    name={isDiagnostic ? 'check-circle-outline' : 'calendar-check-outline'}
                                    size={20}
                                />
                                <View style={styles.activityContent}>
                                    <Text numberOfLines={1} style={styles.activityTitle}>
                                        {activity.title}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.activityDescription}>
                                        {activity.description}
                                    </Text>
                                </View>
                                <View style={styles.activityRight}>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                    <View
                                        style={[
                                            styles.statusPill,
                                            {
                                                backgroundColor: isScheduled
                                                    ? colors.accentWash
                                                    : colors.successWash,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                {
                                                    color: isScheduled ? colors.accent : colors.success,
                                                },
                                            ]}
                                        >
                                            {activity.status}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons color={colors.secondaryText} name="chevron-forward" size={16} />
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    activityContent: {
        flex: 1,
        minWidth: 0,
    },
    activityDescription: {
        color: colors.secondaryText,
        fontSize: 12,
        marginTop: 3,
    },
    activityRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    activityRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        minHeight: 72,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    activityTime: {
        color: colors.secondaryText,
        fontSize: 12,
    },
    activityTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    card: {
        backgroundColor: colors.card,
        borderCurve: 'continuous',
        borderRadius: 20,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.24)',
        overflow: 'hidden',
        width: '100%',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 88,
    },
    emptyText: {
        color: colors.secondaryText,
        fontSize: 13,
    },
    section: {
        marginTop: 28,
    },
    sectionHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    statusPill: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    viewAll: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});
