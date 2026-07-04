"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "@/app/page.module.css";

export default function FirestoreTest() {
  const [status, setStatus] = useState("checking");
  const [statusError, setStatusError] = useState("");
  const [message, setMessage] = useState("");
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setActionError("");

    try {
      const testsQuery = query(
        collection(db, "tests"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(testsQuery);

      setTests(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          message: doc.data().message ?? "",
          createdAt: doc.data().createdAt?.toDate?.() ?? null,
        }))
      );
      setStatus("connected");
      setStatusError("");
    } catch (error) {
      setStatus("error");
      setStatusError(error.message);
    } finally {
      setLoadingTests(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");

    try {
      await addDoc(collection(db, "tests"), {
        message: trimmed,
        createdAt: serverTimestamp(),
      });
      setMessage("");
      await loadTests();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.demo}>
      <div className={styles.intro}>
        <h1>Firestore Test Demo</h1>
        <p>
          Write and read documents from the <code>tests</code> collection to
          verify your Firebase connection.
        </p>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>Connection:</span>
        <span
          className={`${styles.statusBadge} ${styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}`}
        >
          {status === "checking" && "Checking..."}
          {status === "connected" && "Connected"}
          {status === "error" && "Error"}
        </span>
      </div>
      {statusError && <p className={styles.error}>{statusError}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="test-message">
          Test message
        </label>
        <div className={styles.formRow}>
          <input
            id="test-message"
            className={styles.input}
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Enter a test message"
            disabled={submitting || status === "error"}
          />
          <button
            className={styles.submitButton}
            type="submit"
            disabled={submitting || !message.trim() || status === "error"}
          >
            {submitting ? "Saving..." : "Add test"}
          </button>
        </div>
      </form>

      {actionError && <p className={styles.error}>{actionError}</p>}

      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>Recent tests</h2>
        {loadingTests ? (
          <p className={styles.muted}>Loading tests...</p>
        ) : tests.length === 0 ? (
          <p className={styles.muted}>No test documents yet.</p>
        ) : (
          <ul className={styles.list}>
            {tests.map((test) => (
              <li key={test.id} className={styles.listItem}>
                <span className={styles.listMessage}>{test.message}</span>
                <time className={styles.listTime}>
                  {test.createdAt
                    ? test.createdAt.toLocaleString()
                    : "Pending timestamp"}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
