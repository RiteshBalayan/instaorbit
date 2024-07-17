import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth } from './firebase';

// Function to serialize the auth user object
const serializeUser = (user) => {
  if (!user) return user;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    // Add any other fields you need from the user object
  };
};

export const uploadState = async (state) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const serializedState = {
        ...state,
        auth: {
          ...state.auth,
          user: serializeUser(state.auth.user),
        },
      };

      // Check if the document exists before setting
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await deleteDoc(docRef); // Delete existing document
      }

      await setDoc(docRef, serializedState); // Upload the new state
      console.log("State uploaded successfully");
    } else {
      console.log("No user is signed in");
    }
  } catch (error) {
    console.error("Error uploading state: ", error);
  }
};

export const downloadState = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("State downloaded successfully");
        return docSnap.data();
      } else {
        console.log("No such document");
        return null;
      }
    } else {
      console.log("No user is signed in");
      return null;
    }
  } catch (error) {
    console.error("Error downloading state: ", error);
    return null;
  }
};
