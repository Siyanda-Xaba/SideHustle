import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, database, storage } from '../firebase/firebase';

export async function getCurrentUser() {
    if (!auth.currentUser) {
        return null;
    }
    return readUserProfile(auth.currentUser);
}

export async function readUserProfile(firebaseUser) {
    if (!firebaseUser) return null;
    const email = (firebaseUser.email || '').toLowerCase();
    const isMechanicCandidate = email.includes('@mechanic') || email.endsWith('mechanic') || email.includes('mechanic@');

    // Load locally cached profile if available
    let localProfile = null;
    try {
        const raw = await AsyncStorage.getItem(`@mechaniq_profile_${firebaseUser.uid}`);
        if (raw) {
            localProfile = JSON.parse(raw);
        } else if (isMechanicCandidate) {
            const lastMech = await AsyncStorage.getItem('@mechaniq_last_mechanic_profile');
            if (lastMech) {
                localProfile = JSON.parse(lastMech);
            }
        }
    } catch (e) {
        console.warn('Error reading local profile cache:', e);
    }

    const isMechanic = isMechanicCandidate || localProfile?.role === 'mechanic';

    // 1. If candidate is a mechanic, check mechanics table first
    if (isMechanic) {
        try {
            const mechanicSnapshot = await get(ref(database, `mechanics/${firebaseUser.uid}`));
            if (mechanicSnapshot.exists()) {
                const val = mechanicSnapshot.val();
                const merged = {
                    ...localProfile,
                    ...val,
                    id: firebaseUser.uid,
                    role: 'mechanic',
                };
                try {
                    await AsyncStorage.setItem(`@mechaniq_profile_${firebaseUser.uid}`, JSON.stringify(merged));
                } catch {}
                return merged;
            }
        } catch (e) {
            console.warn('Error reading from mechanics table:', e);
        }
    }

    // 2. Try checking users table (for customers or existing users)
    try {
        const userSnapshot = await get(ref(database, `users/${firebaseUser.uid}`));
        if (userSnapshot.exists()) {
            const val = userSnapshot.val();
            const role = val.role || (isMechanic ? 'mechanic' : 'customer');
            const merged = {
                ...localProfile,
                ...val,
                id: firebaseUser.uid,
                role,
            };
            try {
                await AsyncStorage.setItem(`@mechaniq_profile_${firebaseUser.uid}`, JSON.stringify(merged));
            } catch {}
            return merged;
        }
    } catch (e) {
        console.warn('Error reading from users table:', e);
    }

    // 3. Fallback: If not found in users and wasn't checked in mechanics yet, check mechanics table
    if (!isMechanic) {
        try {
            const mechanicSnapshot = await get(ref(database, `mechanics/${firebaseUser.uid}`));
            if (mechanicSnapshot.exists()) {
                const val = mechanicSnapshot.val();
                const merged = {
                    ...localProfile,
                    ...val,
                    id: firebaseUser.uid,
                    role: 'mechanic',
                };
                try {
                    await AsyncStorage.setItem(`@mechaniq_profile_${firebaseUser.uid}`, JSON.stringify(merged));
                } catch {}
                return merged;
            }
        } catch (e) {
            console.warn('Error reading from mechanics fallback:', e);
        }
    }

    // 4. Fallback to cached local profile if server records could not be fetched
    if (localProfile) {
        return {
            ...localProfile,
            id: firebaseUser.uid,
            role: localProfile.role || (isMechanic ? 'mechanic' : 'customer'),
        };
    }

    // Default basic profile
    return {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role: isMechanicCandidate ? 'mechanic' : 'customer',
        firstName: isMechanicCandidate ? 'Mechanic' : 'Customer',
        lastName: '',
    };
}

export async function updateCurrentUserProfile(input) {
    if (auth.currentUser?.uid !== input.userId) {
        throw new Error('You must be signed in to update your profile.');
    }
    const current = await getCurrentUser();
    const isMechanic = current?.role === 'mechanic';
    const table = isMechanic ? 'mechanics' : 'users';

    const updates = {
        updatedAt: new Date().toISOString(),
    };
    if (input.firstName !== undefined) updates.firstName = input.firstName.trim();
    if (input.lastName !== undefined) updates.lastName = input.lastName.trim();
    if (input.email !== undefined) updates.email = input.email.trim().toLowerCase();
    if (input.phone !== undefined) updates.phone = input.phone.trim();
    if (input.businessName !== undefined) updates.businessName = input.businessName.trim();
    if (input.professionalDetails !== undefined) updates.professionalDetails = input.professionalDetails;
    if (input.documents !== undefined) updates.documents = input.documents;

    try {
        await update(ref(database, `${table}/${input.userId}`), updates);
    } catch (e) {
        console.warn(`Could not update ${table} in Realtime Database:`, e);
    }

    const updatedProfile = {
        ...(current || {}),
        ...updates,
        id: input.userId,
    };

    try {
        await AsyncStorage.setItem(
            `@mechaniq_profile_${input.userId}`,
            JSON.stringify(updatedProfile)
        );
    } catch {}

    return updatedProfile;
}

export async function uploadProfileImage(input) {
    if (!input || !input.uri) {
        throw new Error('No image was selected for profile upload.');
    }
    const current = await getCurrentUser();
    const isMechanic = current?.role === 'mechanic';
    const table = isMechanic ? 'mechanics' : 'users';
    const userId = input.userId || auth.currentUser?.uid;

    if (!userId) {
        throw new Error('You must be signed in to upload a profile photo.');
    }

    try {
        const path = `${table}/${userId}/profile_${Date.now()}.jpg`;
        const sRef = storageRef(storage, path);
        const response = await fetch(input.uri);
        const blob = await response.blob();
        const uploadSnapshot = await uploadBytes(sRef, blob, {
            contentType: input.mimeType || 'image/jpeg',
        });
        const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

        await update(ref(database, `${table}/${userId}`), {
            profileImageUrl: downloadUrl,
            updatedAt: new Date().toISOString(),
        });

        return { profileImageUrl: downloadUrl };
    } catch (storageError) {
        console.warn('Firebase Storage profile upload failed, saving local preview:', storageError);
        await update(ref(database, `${table}/${userId}`), {
            profileImageUrl: input.uri,
            updatedAt: new Date().toISOString(),
        });
        return { profileImageUrl: input.uri };
    }
}
