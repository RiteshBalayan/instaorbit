import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, addDoc, arrayUnion } from "firebase/firestore";
import { auth } from './firebase';
import { useDispatch } from 'react-redux';


// Function to serialize the state if needed
const serializeState = (state) => {
  // You can perform any additional serialization here if needed
  // For now, we assume state is serializable as-is
  return JSON.parse(JSON.stringify(state)); // Ensures deep copy and serialization
};

//Function to create new Trajectory
export const newTrajectory = async (name) => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Create a new document reference with an auto-generated ID
      const trajectoryDocRef = doc(collection(db, "trajectories"));
      
      // Add initial data to the new document
      const initialData = {
        users: [user.uid], // Store the ID of the user who created the document
        createdOn: new Date(),
        name: name,
      };
      
      // Set the document data
      await setDoc(trajectoryDocRef, initialData);
      
      console.log(`New trajectory created successfully with ID '${trajectoryDocRef.id}'`);

            // Update the user's document to include this trajectory ID
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        trajectories: arrayUnion(trajectoryDocRef.id)
      });
      
      // Return the new document ID
      return trajectoryDocRef.id;
    } else {
      console.log("No user is signed in");
      return null;
    }

  } catch (error) {
    console.error("Error creating new trajectory: ", error);
    return null;
  }
};

//Fuction to fetch trajectory projects for user
export const fetchTrajectories = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      console.log("User ID:", user.uid);
      // Get the document from the 'users' collection with the current user's UID
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        if (userData && userData.trajectories) {
          const trajectoryIds = userData.trajectories;

          // Fetch all trajectory documents using the IDs in the user's trajectories array
          const trajectoryPromises = trajectoryIds.map(async id => {
            const trajectoryDocRef = doc(db, "trajectories", id);
            const trajectoryDocSnap = await getDoc(trajectoryDocRef);
            
            if (trajectoryDocSnap.exists()) {
              return {
                id: trajectoryDocSnap.id,
                name: trajectoryDocSnap.data().name
              };
            } else {
              console.warn(`Trajectory document with ID ${id} does not exist.`);
              return null;
            }
          });

          const trajectoriesData = (await Promise.all(trajectoryPromises)).filter(Boolean); // Filter out any null values

          return trajectoriesData;
        } else {
          console.log('No trajectories found for this user.');
          return [];
        }
      } else {
        console.log('User document does not exist.');
        return [];
      }
    } else {
      console.log('No user is currently logged in.');
      return [];
    }
  } catch (error) {
    console.error("Error fetching trajectories:", error);
    return [];
  }
};

// Function to upload a new iteration
export const uploadIteration = async (trajectoryId, stateSlice, commitMessage) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const trajectoryDocRef = doc(db, "trajectories", trajectoryId);
      const iterationCollectionRef = collection(trajectoryDocRef, "iterations");
      const serializedState = serializeState(stateSlice);
      
      const docRef = await addDoc(iterationCollectionRef, {
        State: serializedState,
        commitMessage: commitMessage,
        timestamp: new Date()
      });
      
      console.log(`New iteration uploaded successfully for trajectory '${trajectoryId}'`);
      return docRef.id; // Return the new document ID
    } else {
      console.log("No user is signed in");
    }
  } catch (error) {
    console.error("Error uploading new iteration: ", error);
  }
};

// Function to update an existing iteration
export const updateIteration = async (trajectoryId, iterationId, stateSlice) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const trajectoryDocRef = doc(db, "trajectories", trajectoryId);
      const iterationDocRef = doc(trajectoryDocRef, "iterations", iterationId);
      const serializedState = serializeState(stateSlice);
      collectioncollection
      await updateDoc(iterationDocRef, {
        State: serializedState,
        timestamp: new Date() // Optionally update timestamp
      });
      
      console.log(`Iteration '${iterationId}' updated successfully for trajectory '${trajectoryId}'`);
    } else {
      console.log("No user is signed in");
    }
  } catch (error) {
    console.error("Error updating iteration: ", error);
  }
};

// Function to upload autosave
export const uploadAutoSave = async (trajectoryId, stateSlice) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const trajectoryDocRef = doc(db, "trajectories", trajectoryId);
      const autoSaveDocRef = collection(trajectoryDocRef, "autosave");
      const serializedState = serializeState(stateSlice);

      await addDoc(autoSaveDocRef, {
        State: serializedState,
        timestamp: new Date()
      });
      
      console.log(`Autosave uploaded successfully for trajectory '${trajectoryId}'`);
    } else {
      console.log("No user is signed in");
    }
  } catch (error) {
    console.error("Error uploading autosave: ", error);
  }
};

export const downloadIterationState = async (trajectoryId, iterationId, fieldName) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const iterationDocRef = doc(db, "trajectories", trajectoryId, "iterations", iterationId);
      const docSnap = await getDoc(iterationDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data().State;
        if (data && data[fieldName]) {
          console.log(`State field '${fieldName}' downloaded successfully from iteration '${iterationId}'`);
          return data[fieldName];
        } else {
          console.log(`No field '${fieldName}' found in iteration '${iterationId}'`);
          return null;
        }
      } else {
        console.log(`No iteration found with id '${iterationId}'`);
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


// Function to download the latest autosave
export const downloadAutoSave = async (trajectoryId) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const autoSaveDocRef = doc(db, "trajectories", trajectoryId, "autosave", user.uid);
      const docSnap = await getDoc(autoSaveDocRef);

      if (docSnap.exists()) {
        console.log(`Autosave downloaded successfully for trajectory '${trajectoryId}'`);
        return docSnap.data().reduxState;
      } else {
        console.log("No autosave found");
        return null;
      }
    } else {
      console.log("No user is signed in");
      return null;
    }
  } catch (error) {
    console.error("Error downloading autosave: ", error);
    return null;
  }
};

// Function to download a specific iteration
export const downloadIteration = async (trajectoryId, iterationId) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const iterationDocRef = doc(db, "trajectories", trajectoryId, "iterations", iterationId);
      const docSnap = await getDoc(iterationDocRef);

      if (docSnap.exists()) {
        console.log(`Iteration '${iterationId}' downloaded successfully for trajectory '${trajectoryId}'`);
        return docSnap.data().reduxState;
      } else {
        console.log(`No iteration found with id '${iterationId}'`);
        return null;
      }
    } else {
      console.log("No user is signed in");
      return null;
    }
  } catch (error) {
    console.error("Error downloading iteration: ", error);
    return null;
  }
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


