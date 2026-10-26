import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../firebase/firebase';
import { getCurrentUser, readUserProfile } from '../users/userService';
import { uploadAllMechanicDocuments } from '../mechanic/mechanicDocumentService';
export async function registerWithEmail({ email, password, role, profile, documents, }) {
    if (role !== 'customer' && role !== 'mechanic') {
        throw new Error('This account type cannot be assigned during public sign-up.');
    }
    const isMechanic = role === 'mechanic';
    const targetTable = isMechanic ? 'mechanics' : 'users';
    const cleanEmail = email.trim().toLowerCase();

    let credential;
    try {
        credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr) {
        // If email is already registered in Firebase Auth and this is a mechanic sign-up:
        if (isMechanic && authErr?.code === 'auth/email-already-in-use') {
            try {
                // Try signing in with the provided credentials (e.g. from an earlier attempt)
                credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            } catch {
                // If sign-in with that password failed, generate a numbered candidate and create
                const baseUser = cleanEmail.replace(/@mechanic\.com$/, '').replace(/\.com$/, '');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const retryEmail = `${baseUser}${randomSuffix}@mechanic.com`;
                credential = await createUserWithEmailAndPassword(auth, retryEmail, password);
                if (profile) {
                    profile.username = `${baseUser}${randomSuffix}@mechanic`;
                }
            }
        } else {
            throw authErr;
        }
    }

    try {
        const {
            role: _profileRole,
            isAdmin: _isAdmin,
            isVerified: _isVerified,
            isMechanicApproved: _isMechanicApproved,
            accountStatus: _accountStatus,
            twoFactorEnabled: _twoFactorEnabled,
            ...safeProfile
        } = profile || {};

        // Upload verification documents if provided
        let uploadedDocs = safeProfile.documents || {};
        if (isMechanic && documents) {
            try {
                const uploaded = await uploadAllMechanicDocuments(credential.user.uid, documents);
                uploadedDocs = { ...uploadedDocs, ...uploaded };
            } catch (docErr) {
                console.warn('Document upload during registration warning:', docErr);
            }
        }

        const fullProfileRecord = {
            ...safeProfile,
            id: credential.user.uid,
            email: credential.user.email,
            username: safeProfile.username || (isMechanic ? credential.user.email.replace(/\.com$/, '') : null),
            role: isMechanic ? 'mechanic' : 'customer',
            documents: uploadedDocs,
            createdAt: safeProfile.createdAt || new Date().toISOString(),
            emailVerified: isMechanic ? true : credential.user.emailVerified,
        };

        // Cache locally in AsyncStorage immediately so profile details are never lost
        try {
            await AsyncStorage.setItem(
                `@mechaniq_profile_${credential.user.uid}`,
                JSON.stringify(fullProfileRecord)
            );
            if (isMechanic) {
                await AsyncStorage.setItem(
                    '@mechaniq_last_mechanic_profile',
                    JSON.stringify(fullProfileRecord)
                );
            }
        } catch (storageErr) {
            console.warn('Could not cache profile locally:', storageErr);
        }

        // Save to Firebase Realtime Database (with non-blocking safety)
        try {
            await set(ref(database, `${targetTable}/${credential.user.uid}`), fullProfileRecord);
        } catch (dbErr) {
            console.warn(`Could not save profile to ${targetTable} in Realtime Database:`, dbErr);
        }

        if (safeProfile.username) {
            try {
                await set(ref(database, `mechanic_usernames/${safeProfile.username.toLowerCase()}`), {
                    uid: credential.user.uid,
                    username: safeProfile.username,
                });
            } catch (e) {
                console.warn('Could not save mechanic_usernames index', e);
            }
        }

        if (!isMechanic) {
            try {
                await sendEmailVerification(credential.user);
            } catch (e) {
                console.warn('Could not send email verification', e);
            }
        }

        await signOut(auth);
        return {
            id: credential.user.uid,
            email: credential.user.email,
            role: isMechanic ? 'mechanic' : 'customer',
            username: fullProfileRecord.username,
        };
    }
    catch (error) {
        console.warn('Post-registration profile handling encountered an error:', error);
        await signOut(auth);
        return {
            id: credential.user.uid,
            email: credential.user.email,
            role: isMechanic ? 'mechanic' : 'customer',
            username: safeProfile?.username || (isMechanic ? credential.user.email.replace(/\.com$/, '') : null),
        };
    }
}
export async function signInWithEmail(emailOrUsername, password) {
    const raw = emailOrUsername.trim().toLowerCase();
    let normalizedEmail = raw;
    if (raw.endsWith('@mechanic')) {
        normalizedEmail = `${raw}.com`;
    } else if (!raw.includes('@')) {
        normalizedEmail = `${raw}@mechanic.com`;
    }

    let credential;
    try {
        credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err) {
        if (normalizedEmail !== raw && (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-email')) {
            try {
                credential = await signInWithEmailAndPassword(auth, raw, password);
            } catch {
                throw err;
            }
        } else {
            throw err;
        }
    }

    let profile = await getCurrentUser();
    const isMechanicLogin = raw.includes('@mechanic') || normalizedEmail.includes('@mechanic');

    if (!profile) {
        const fbUser = credential.user;
        const targetTable = isMechanicLogin ? 'mechanics' : 'users';
        profile = {
            id: fbUser.uid,
            email: fbUser.email || normalizedEmail,
            username: isMechanicLogin ? (raw.endsWith('@mechanic') ? raw : `${raw}@mechanic`) : null,
            role: isMechanicLogin ? 'mechanic' : 'customer',
            firstName: isMechanicLogin ? 'Mechanic' : 'Customer',
            lastName: '',
            createdAt: new Date().toISOString(),
        };
        try {
            await set(ref(database, `${targetTable}/${fbUser.uid}`), profile);
        } catch (e) {
            console.warn(`Failed to save profile in Realtime Database (${targetTable})`, e);
        }
    } else if (isMechanicLogin && profile.role !== 'mechanic') {
        profile.role = 'mechanic';
        try {
            await set(ref(database, `mechanics/${credential.user.uid}`), profile);
        } catch (e) {
            console.warn('Failed to update mechanic profile in Realtime Database', e);
        }
    }

    return profile;
}
export function sendPasswordReset(email) {
    return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}
export function signOutUser() {
    return signOut(auth);
}
export function getFirebaseAuthErrorMessage(error) {
    const code = error && error.code ? String(error.code) : '';
    const messages = {
        'auth/email-already-in-use': 'An account already exists with this email. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/user-not-found': 'No account was found with this email.',
        'auth/wrong-password': 'The email or password is incorrect.',
        'auth/weak-password': 'Please choose a stronger password.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    };
    return messages[code] ??
        (error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.');
}

