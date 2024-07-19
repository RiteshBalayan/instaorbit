import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { auth } from './firebase';


// Function to serialize the state if needed
const serializeState = (state) => {
  // You can perform any additional serialization here if needed
  // For now, we assume state is serializable as-is
  return JSON.parse(JSON.stringify(state)); // Ensures deep copy and serialization
};

export const uploadStateField = async (stateSlice, fieldName) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);

      // Check if the document exists
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        // Document exists, update the field
        const serializedState = serializeState(stateSlice);
        await updateDoc(userDocRef, {
          [fieldName]: serializedState
        });
        console.log(`State field '${fieldName}' uploaded successfully`);
      } else {
        // Document does not exist, create it
        const serializedState = serializeState(stateSlice);
        await setDoc(userDocRef, {
          [fieldName]: serializedState
        });
        console.log(`Document for user '${user.uid}' created with '${fieldName}'`);
      }
    } else {
      console.log("No user is signed in");
    }
  } catch (error) {
    console.error(`Error uploading state field '${fieldName}': `, error);
  }
};

export const downloadStateField = async (fieldName) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data[fieldName]) {
          console.log(`State field '${fieldName}' downloaded successfully`);
          return data[fieldName];
        } else {
          console.log(`No field '${fieldName}' found in document`);
          return null;
        }
      } else {
        console.log("No document found for the user");
        return null;
      }
    } else {
      console.log("No user is signed in");
      return null;
    }
  } catch (error) {
    console.error(`Error downloading state field '${fieldName}': `, error);
    return null;
  }
};


