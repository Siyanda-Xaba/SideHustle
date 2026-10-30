import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaintenanceReminderCard from '../../src/components/MaintenanceReminderCard';
import PowerShieldCard from '../../src/components/PowerShieldCard';
import ProfileAvatar from '../../src/components/ProfileAvatar';
import QuickActionCard from '../../src/components/QuickActionCard';
import RecentActivityCard from '../../src/components/RecentActivityCard';
import VehicleHealthRing from '../../src/components/VehicleHealthRing';
import { useCustomerHome } from '../../src/customer/CustomerHomeContext';
import { homePalette } from '../../src/customer/homePalette';
import { getVehiclePhotoUrl } from '../../src/customer/vehiclePhoto';
import { useCustomerNotifications } from '../../src/customer/useCustomerNotifications';
import { useUser } from '../../src/users/UserContext';
import { useVehicle } from '../../src/vehicles/VehicleContext';

const logoAspectRatio = 1679 / 937;

export default function CustomerHome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
    const [vehiclePhoto, setVehiclePhoto] = useState({
        failed: false,
        key: '',
        url: null,
    });
    const { isLoadingUser, user } = useUser();
    const { isLoadingVehicles, selectVehicle, selectedVehicle, vehicles } = useVehicle();
    const { homeData, homeError, isLoadingHome } = useCustomerHome();
    const { notificationsData } = useCustomerNotifications();
    const vehiclePhotoKey = selectedVehicle
        ? `${selectedVehicle.id}|${selectedVehicle.make}|${selectedVehicle.model}`
        : '';
    const resolvedVehiclePhoto = vehiclePhoto.key === vehiclePhotoKey ? vehiclePhoto : null;
    const vehiclePhotoUrl = resolvedVehiclePhoto?.failed ? null : resolvedVehiclePhoto?.url ?? null;
    const firstName = user?.firstName ?? 'Driver';
    useEffect(() => {
        if (!selectedVehicle || !vehiclePhotoKey) {
            return undefined;
        }
        let cancelled = false;
        getVehiclePhotoUrl(selectedVehicle)
            .then((url) => {
                if (!cancelled) {
                    setVehiclePhoto({
                        failed: false,
                        key: vehiclePhotoKey,
                        url,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setVehiclePhoto({
                        failed: true,
                        key: vehiclePhotoKey,
                        url: null,
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [selectedVehicle, vehiclePhotoKey]);
    const isVehicleLoading = isLoadingVehicles || isLoadingHome;
    const maintenanceReminder = homeData?.maintenanceReminders?.[0] ?? null;
    const recentActivity = homeData?.recentActivity ?? [];
    const unreadNotificationCount = notificationsData?.unreadCount ?? 0;
    const tabBarOffset = Math.max(insets.bottom - 10, 2);
    const scrollBottomPadding = 68 + tabBarOffset + 72;
    useFocusEffect(useCallback(() => {
        StatusBar.setBarStyle('light-content');
        return () => {
            StatusBar.setBarStyle('light-content');
        };
    }, []));
    function handleVehicleSelection(vehicleId) {
        selectVehicle(vehicleId);
        setIsVehicleSelectorOpen(false);
    }
    function handleActivityAction(action) {
        switch (action.type) {
            case 'diagnostics': {
                if (action.resultId) {
                    router.push({
                        params: {
                            resultId: action.resultId,
                        },
                        pathname: '/diagnostic-result/[resultId]',
                    });
                    return;
                }
                router.push('/(customer)/diagnostics');
                return;
            }
            case 'fuel': {
                router.push('/(customer)/fuel');
                return;
            }
            case 'maintenance': {
                router.push('/maintenance');
                return;
            }
            case 'service': {
                if (action.mechanicId) {
                    router.push({
                        params: {
                            mechanicId: action.mechanicId,
                        },
                        pathname: '/workshop-booking/[mechanicId]',
                    });
                    return;
                }
                router.push('/book-service');
                return;
            }
            case 'marketplace': {
                router.push('/(customer)/marketplace');
                return;
            }
            case 'profile': {
                router.push('/(customer)/profile');
                return;
            }
        }
    }
    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.header}>
                    <Image
                        accessibilityLabel="MechanIQ"
                        accessibilityRole="image"
                        resizeMode="contain"
                        source={require('../../assets/images/mechaniq-logo.png')}
                        style={styles.logo}
                    />
                    <View style={styles.headerRight}>
                        <View style={styles.greetingContainer}>
                            <Text numberOfLines={1} style={styles.greeting}>
                                Good Morning,
                            </Text>
                            <Text numberOfLines={1} style={styles.userName}>
                                {isLoadingUser ? 'Loading...' : firstName}
                            </Text>
                        </View>
                        <TouchableOpacity
                            accessibilityLabel="Open notifications"
                            accessibilityRole="button"
                            activeOpacity={0.7}
                            onPress={() => {
                                router.push('/notifications');
                            }}
                            style={styles.notificationButton}
                        >
                            <Ionicons color={homePalette.text} name="notifications-outline" size={20} />
                            {unreadNotificationCount > 0 ? (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationBadgeText}>
                                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityLabel="Open profile"
                            accessibilityRole="button"
                            activeOpacity={0.75}
                            onPress={() => {
                                router.push('/(customer)/profile');
                            }}
                        >
                            <ProfileAvatar
                                backgroundColor={homePalette.card}
                                borderColor={homePalette.border}
                                iconColor={homePalette.text}
                                imageUrl={user?.profileImageUrl}
                                size={42}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            <ScrollView
                alwaysBounceVertical={false}
                bounces={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingBottom: scrollBottomPadding,
                    },
                ]}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
                <View style={styles.vehicleShadow}>
                    <View style={styles.vehicleCard}>
                        {isVehicleLoading ? (
                            <View style={styles.vehicleMessage}>
                                <Text style={styles.vehicleMessageText}>Loading vehicle...</Text>
                            </View>
                        ) : !selectedVehicle ? (
                            <View style={styles.vehicleMessage}>
                                <Text style={styles.vehicleMessageText}>No vehicle selected</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.featured}>
                                    {vehiclePhotoUrl ? (
                                        <Image
                                            accessibilityLabel={`${selectedVehicle.make} ${selectedVehicle.model}`}
                                            onError={() => {
                                                setVehiclePhoto((current) => ({
                                                    failed: true,
                                                    key: current.key,
                                                    url: null,
                                                }));
                                            }}
                                            resizeMode="cover"
                                            source={{
                                                uri: vehiclePhotoUrl,
                                            }}
                                            style={styles.heroImage}
                                        />
                                    ) : (
                                        <View style={styles.heroPlaceholder} />
                                    )}
                                    <LinearGradient
                                        colors={['rgba(9, 11, 16, 0.68)', 'rgba(9, 11, 16, 0.4)', 'rgba(9, 11, 16, 0)']}
                                        locations={[0, 0.45, 1]}
                                        end={{
                                            x: 0,
                                            y: 1,
                                        }}
                                        pointerEvents="none"
                                        start={{
                                            x: 0,
                                            y: 0,
                                        }}
                                        style={styles.heroScrim}
                                    />
                                    <View style={styles.vehicleHeader}>
                                        <View style={styles.vehicleTitle}>
                                            <Text numberOfLines={2} selectable style={styles.vehicleName}>
                                                {selectedVehicle.make} {selectedVehicle.model}
                                            </Text>
                                            <Text numberOfLines={1} selectable style={styles.registration}>
                                                {selectedVehicle.registration}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            accessibilityLabel="Select vehicle"
                                            accessibilityRole="button"
                                            activeOpacity={0.7}
                                            hitSlop={8}
                                            onPress={() => {
                                                setIsVehicleSelectorOpen((currentValue) => !currentValue);
                                            }}
                                            style={styles.vehicleSelector}
                                        >
                                            <Ionicons
                                                color={homePalette.text}
                                                name={isVehicleSelectorOpen ? 'chevron-up' : 'chevron-down'}
                                                size={18}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {isVehicleSelectorOpen ? (
                                        <View style={styles.vehicleSelectorMenu}>
                                            {vehicles.map((vehicle, index) => {
                                                const isSelected = vehicle.id === selectedVehicle.id;
                                                return (
                                                    <TouchableOpacity
                                                        accessibilityRole="button"
                                                        activeOpacity={0.75}
                                                        key={vehicle.id}
                                                        onPress={() => handleVehicleSelection(vehicle.id)}
                                                        style={[
                                                            styles.vehicleSelectorOption,
                                                            index !== vehicles.length - 1
                                                                ? {
                                                                    borderBottomColor: homePalette.border,
                                                                    borderBottomWidth: 1,
                                                                }
                                                                : null,
                                                        ]}
                                                    >
                                                        <MaterialCommunityIcons
                                                            color={isSelected ? homePalette.accent : homePalette.secondaryText}
                                                            name="car-side"
                                                            size={22}
                                                        />
                                                        <View style={styles.vehicleSelectorContent}>
                                                            <View style={styles.vehicleSelectorTitleRow}>
                                                                <Text numberOfLines={1} style={styles.vehicleSelectorTitle}>
                                                                    {vehicle.make} {vehicle.model}
                                                                </Text>
                                                                {vehicle.isPrimary ? (
                                                                    <View style={styles.primaryBadge}>
                                                                        <Text style={styles.primaryBadgeText}>Primary</Text>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                            <Text numberOfLines={1} style={styles.vehicleSelectorRegistration}>
                                                                {vehicle.registration} • {vehicle.year ?? 'N/A'}
                                                            </Text>
                                                        </View>
                                                        <Ionicons
                                                            color={isSelected ? homePalette.accent : homePalette.secondaryText}
                                                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                            size={20}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ) : null}
                                </View>
                                <View style={styles.specRow}>
                                    <VehicleSpec label={homeData?.vehicleHealthLabel ?? 'Health'}>
                                        <VehicleHealthRing
                                            score={homeData?.vehicleHealthScore ?? null}
                                            size={42}
                                            strokeWidth={3.5}
                                        />
                                    </VehicleSpec>
                                    <VehicleSpec label="Fuel Level">
                                        <Text
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                            numberOfLines={1}
                                            selectable
                                            style={styles.specValue}
                                        >
                                            {homeData?.fuelLevel != null ? `${homeData.fuelLevel}%` : 'N/A'}
                                        </Text>
                                    </VehicleSpec>
                                    <VehicleSpec label="Next Service">
                                        <Text
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                            numberOfLines={1}
                                            selectable
                                            style={styles.specValue}
                                        >
                                            {homeData?.nextServiceKm != null
                                                ? `${homeData.nextServiceKm.toLocaleString()} km`
                                                : 'N/A'}
                                        </Text>
                                    </VehicleSpec>
                                    <VehicleSpec label="Battery">
                                        <Text
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                            numberOfLines={1}
                                            selectable
                                            style={styles.specValue}
                                        >
                                            {homeData?.batteryStatus ?? 'N/A'}
                                        </Text>
                                    </VehicleSpec>
                                    <VehicleSpec label="Tyres">
                                        <Text
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                            numberOfLines={1}
                                            selectable
                                            style={styles.specValue}
                                        >
                                            {homeData?.tyreStatus ?? 'N/A'}
                                        </Text>
                                    </VehicleSpec>
                                </View>
                            </>
                        )}
                    </View>
                </View>
                {homeError ? (
                    <Text selectable style={styles.errorText}>
                        {homeError}
                    </Text>
                ) : null}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                    <QuickActionCard
                        description="Find trusted mechanics"
                        icon="account-wrench-outline"
                        onPress={() => {
                            router.push('/find-mechanic');
                        }}
                        title="Find Mechanic"
                    />
                    <QuickActionCard
                        description="Schedule service appointments"
                        icon="calendar-check-outline"
                        onPress={() => {
                            router.push('/book-service');
                        }}
                        title="Book Service"
                    />
                </View>
                <View style={styles.dashboardRow}>
                    <PowerShieldCard
                        nextOutageTime={homeData?.nextOutageTime ?? null}
                        onSchedulePress={() => {
                            router.push('/(customer)/fuel');
                        }}
                    />
                    <MaintenanceReminderCard
                        onPress={() => {
                            router.push('/maintenance');
                        }}
                        reminder={maintenanceReminder}
                    />
                </View>
                <RecentActivityCard
                    activities={recentActivity}
                    onActivityPress={(activity) => {
                        if (!activity.action) {
                            return;
                        }
                        handleActivityAction(activity.action);
                    }}
                    onViewAllPress={() => {
                        router.push('/activity');
                    }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

function VehicleSpec({ children, label }) {
    return (
        <View style={styles.specItem}>
            <View style={styles.specValueSlot}>{children}</View>
            <Text numberOfLines={2} style={styles.specLabel}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 0,
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    dashboardRow: {
        alignItems: 'stretch',
        flexDirection: 'column',
        gap: 12,
        marginTop: 12,
    },
    errorText: {
        color: homePalette.danger,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 12,
        textAlign: 'center',
    },
    featured: {
        backgroundColor: homePalette.background,
        height: 230,
        overflow: 'hidden',
        width: '100%',
    },
    greeting: {
        color: homePalette.secondaryText,
        fontSize: 12,
        fontWeight: '500',
    },
    greetingContainer: {
        alignItems: 'flex-end',
        flexShrink: 1,
    },
    header: {
        alignItems: 'center',
        backgroundColor: homePalette.background,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
        minHeight: 78,
        paddingHorizontal: 16,
    },
    headerRight: {
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 1,
        gap: 8,
        justifyContent: 'flex-end',
    },
    logo: {
        aspectRatio: logoAspectRatio,
        width: 140,
    },
    notificationBadge: {
        alignItems: 'center',
        backgroundColor: homePalette.accent,
        borderRadius: 8,
        height: 16,
        justifyContent: 'center',
        minWidth: 16,
        paddingHorizontal: 4,
        position: 'absolute',
        right: -4,
        top: -4,
    },
    notificationBadgeText: {
        color: homePalette.onAccent,
        fontSize: 9,
        fontWeight: '800',
    },
    notificationButton: {
        alignItems: 'center',
        backgroundColor: homePalette.card,
        borderRadius: 20,
        height: 40,
        justifyContent: 'center',
        width: 40,
    },
    primaryBadge: {
        backgroundColor: homePalette.accentWash,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    primaryBadgeText: {
        color: homePalette.accent,
        fontSize: 10,
        fontWeight: '700',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    heroImage: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    heroPlaceholder: {
        backgroundColor: homePalette.background,
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    heroScrim: {
        height: 120,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    registration: {
        color: 'rgba(255, 255, 255, 0.78)',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 4,
    },
    safeArea: {
        backgroundColor: homePalette.background,
        flex: 1,
    },
    scrollView: {
        backgroundColor: homePalette.background,
        flex: 1,
    },
    sectionTitle: {
        color: homePalette.text,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 12,
        marginTop: 28,
    },
    specItem: {
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    specLabel: {
        color: homePalette.secondaryText,
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 14,
        textAlign: 'center',
    },
    specRow: {
        backgroundColor: homePalette.card,
        flexDirection: 'row',
        gap: 2,
        paddingBottom: 16,
        paddingHorizontal: 6,
        paddingTop: 14,
    },
    specValue: {
        color: homePalette.text,
        fontSize: 13,
        fontVariant: ['tabular-nums'],
        fontWeight: '700',
        textAlign: 'center',
    },
    specValueSlot: {
        alignItems: 'center',
        height: 42,
        justifyContent: 'center',
        width: '100%',
    },
    userName: {
        color: homePalette.text,
        fontSize: 15,
        fontWeight: '700',
        marginTop: 1,
    },
    vehicleCard: {
        backgroundColor: homePalette.card,
        borderCurve: 'continuous',
        borderRadius: 22,
        overflow: 'hidden',
    },
    vehicleHeader: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        gap: 12,
        left: 0,
        paddingHorizontal: 16,
        paddingTop: 14,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 2,
    },
    vehicleMessage: {
        alignItems: 'center',
        backgroundColor: homePalette.card,
        gap: 12,
        justifyContent: 'center',
        minHeight: 220,
        paddingHorizontal: 24,
        paddingVertical: 36,
    },
    vehicleMessageText: {
        color: homePalette.text,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    vehicleName: {
        color: homePalette.text,
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.4,
        lineHeight: 32,
    },
    vehicleSelector: {
        alignItems: 'center',
        backgroundColor: 'rgba(9, 11, 16, 0.45)',
        borderRadius: 16,
        height: 32,
        justifyContent: 'center',
        marginTop: 2,
        width: 32,
    },
    vehicleSelectorContent: {
        flex: 1,
        minWidth: 0,
    },
    vehicleSelectorMenu: {
        backgroundColor: homePalette.background,
        borderCurve: 'continuous',
        borderRadius: 18,
        left: 16,
        paddingHorizontal: 12,
        position: 'absolute',
        right: 16,
        top: 76,
        zIndex: 2,
    },
    vehicleSelectorOption: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        minHeight: 64,
    },
    vehicleSelectorRegistration: {
        color: homePalette.secondaryText,
        fontSize: 12,
        marginTop: 3,
    },
    vehicleSelectorTitle: {
        color: homePalette.text,
        flexShrink: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    vehicleSelectorTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    vehicleShadow: {
        borderRadius: 22,
        boxShadow: '0 16px 34px rgba(0, 0, 0, 0.36)',
        marginTop: 16,
    },
    vehicleTitle: {
        flex: 1,
        minWidth: 0,
    },
});
