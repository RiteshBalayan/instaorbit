import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth } from './firebase';


// Function to serialize the state if needed
const serializeState = (state) => {
  // You can perform any additional serialization here if needed
  // For now, we assume state is serializable as-is
  return JSON.parse(JSON.stringify(state)); // Ensures deep copy and serialization
};

export const uploadState = async (state) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);

      // Serialize state
      const serializedState = serializeState(state);

      // Set or replace the document with the serialized state
      await setDoc(userDocRef, serializedState);
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
