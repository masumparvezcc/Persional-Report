import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  NOTE_STATUS,
  NOTES_SUBCOLLECTION,
  SESSION_DOC_ID,
  SESSION_STEPS,
  USER_COLLECTION,
} from "@/lib/notes/constants";

function userRef(telegramId) {
  return doc(db, USER_COLLECTION, String(telegramId));
}

function notesRef(telegramId) {
  return collection(userRef(telegramId), NOTES_SUBCOLLECTION);
}

function noteRef(telegramId, noteId) {
  return doc(notesRef(telegramId), noteId);
}

function sessionRef(telegramId) {
  return doc(notesRef(telegramId), SESSION_DOC_ID);
}

const defaultSession = {
  step: SESSION_STEPS.IDLE,
  noteId: null,
  draft: {},
  listPage: 0,
  updatedAt: null,
};

export async function ensureUser(telegramId, profile = {}) {
  const ref = userRef(telegramId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      telegramId: String(telegramId),
      username: profile.username ?? null,
      firstName: profile.firstName ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return ref;
}

export async function getSession(telegramId) {
  const snapshot = await getDoc(sessionRef(telegramId));

  if (!snapshot.exists()) {
    return { ...defaultSession };
  }

  return { ...defaultSession, ...snapshot.data() };
}

export async function setSession(telegramId, data) {
  await setDoc(
    sessionRef(telegramId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function clearSession(telegramId) {
  await setSession(telegramId, defaultSession);
}

export async function createNote(telegramId, { title, content }) {
  const ref = await addDoc(notesRef(telegramId), {
    title: title.trim(),
    content: content.trim(),
    scheduledAt: null,
    notifiedAt: null,
    status: NOTE_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getNote(telegramId, noteId) {
  const snapshot = await getDoc(noteRef(telegramId, noteId));

  if (!snapshot.exists() || snapshot.id === SESSION_DOC_ID) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateNote(telegramId, noteId, data) {
  await updateDoc(noteRef(telegramId, noteId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(telegramId, noteId) {
  await deleteDoc(noteRef(telegramId, noteId));
}

export async function listNotes(telegramId, { scheduledOnly = false } = {}) {
  const snapshot = await getDocs(notesRef(telegramId));

  const notes = snapshot.docs
    .filter((item) => item.id !== SESSION_DOC_ID)
    .map((item) => ({ id: item.id, ...item.data() }));

  const filtered = scheduledOnly
    ? notes.filter((note) => note.status === NOTE_STATUS.SCHEDULED)
    : notes.filter(
        (note) =>
          note.status === NOTE_STATUS.ACTIVE ||
          note.status === NOTE_STATUS.SCHEDULED
      );

  filtered.sort((left, right) => {
    if (scheduledOnly) {
      const leftTime = left.scheduledAt?.toMillis?.() ?? 0;
      const rightTime = right.scheduledAt?.toMillis?.() ?? 0;
      return leftTime - rightTime;
    }

    const leftTime = left.updatedAt?.toMillis?.() ?? 0;
    const rightTime = right.updatedAt?.toMillis?.() ?? 0;
    return rightTime - leftTime;
  });

  return filtered;
}

export async function scheduleNote(telegramId, noteId, scheduledAt) {
  await updateNote(telegramId, noteId, {
    scheduledAt: Timestamp.fromDate(scheduledAt),
    notifiedAt: null,
    status: NOTE_STATUS.SCHEDULED,
  });
}

export async function clearSchedule(telegramId, noteId) {
  await updateNote(telegramId, noteId, {
    scheduledAt: null,
    notifiedAt: null,
    status: NOTE_STATUS.ACTIVE,
  });
}

export async function getDueNotes(telegramId) {
  const now = Date.now();
  const snapshot = await getDocs(notesRef(telegramId));

  return snapshot.docs
    .filter((item) => item.id !== SESSION_DOC_ID)
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter(
      (note) =>
        note.status === NOTE_STATUS.SCHEDULED &&
        !note.notifiedAt &&
        note.scheduledAt?.toMillis?.() <= now
    );
}

export async function markNoteNotified(telegramId, noteId) {
  await updateNote(telegramId, noteId, {
    notifiedAt: serverTimestamp(),
    status: NOTE_STATUS.COMPLETED,
  });
}

export async function listAllUsers() {
  const snapshot = await getDocs(collection(db, USER_COLLECTION));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
