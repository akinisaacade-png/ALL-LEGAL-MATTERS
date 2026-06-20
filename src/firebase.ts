import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID provided by the environment configuration
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || "(default)");
