import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface DrawingData {
  id?: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Save a new drawing
export const saveDrawing = async (data: Omit<DrawingData, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    console.log('Saving drawing with data:', { ...data, content: 'content-too-large-to-log' });
    const now = Timestamp.now();
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now
    };
    console.log('Document data to save:', { ...docData, content: 'content-too-large-to-log' });

    const docRef = await addDoc(collection(db, 'drawings'), docData);
    console.log('Document saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving drawing:', error);
    throw error;
  }
};

// Update an existing drawing
export const updateDrawing = async (id: string, data: Partial<Omit<DrawingData, 'id' | 'createdAt'>>) => {
  try {
    console.log('Updating drawing with ID:', id);
    const drawingRef = doc(db, 'drawings', id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now()
    };
    console.log('Update data:', { ...updateData, content: data.content ? 'content-too-large-to-log' : undefined });

    await updateDoc(drawingRef, updateData);
    console.log('Document updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating drawing:', error);
    throw error;
  }
};

// Get a specific drawing by ID
export const getDrawingById = async (id: string) => {
  try {
    console.log('Getting drawing with ID:', id);
    const docRef = doc(db, 'drawings', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('Drawing found:', docSnap.id);
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as DrawingData;
    } else {
      console.log('No drawing found with ID:', id);
      return null;
    }
  } catch (error) {
    console.error('Error getting drawing:', error);
    throw error;
  }
};

// Get all drawings for a user
export const getUserDrawings = async (userId: string) => {
  try {
    console.log('Getting drawings for user ID:', userId);

    // First try without orderBy to see if we can get any results
    const q = query(
      collection(db, 'drawings'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    console.log('Query snapshot size:', querySnapshot.size);

    // Log each document for debugging
    querySnapshot.forEach(doc => {
      console.log('Document data:', doc.id, doc.data());
    });

    // Sort the results manually since we're not using orderBy in the query
    const drawings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DrawingData[];

    // Sort by updatedAt in descending order (newest first)
    return drawings.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting user drawings:', error);
    throw error;
  }
};

// Delete a drawing
export const deleteDrawing = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'drawings', id));
    return true;
  } catch (error) {
    console.error('Error deleting drawing:', error);
    throw error;
  }
};
