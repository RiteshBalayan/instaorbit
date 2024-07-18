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

      // Serialize state slice
      const serializedState = serializeState(stateSlice);

      // Update the document with the serialized state slice
      await updateDoc(userDocRef, {
        [fieldName]: serializedState
      });
      console.log(`State field '${fieldName}' uploaded successfully`);
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


