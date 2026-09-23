const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Ensure environment variables are loaded if imported independently
require('dotenv').config();

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    const parsed = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    credential = cert(parsed);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', err.message);
  }
}

if (!credential) {
  const candidatePaths = [
    path.resolve(__dirname, '../service-account.json'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        credential = cert(serviceAccount);
        break;
      } catch (err) {
        console.error(`Error loading service account from ${candidate}:`, err.message);
      }
    }
  }
}

if (!credential) {
  throw new Error('Firebase credentials not found. Please provide service-account.json in project root or FIREBASE_SERVICE_ACCOUNT environment variable.');
}

if (!getApps().length) {
  initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const auth = getAuth();

module.exports = {
  db,
  auth,
  FieldValue,
  Timestamp,
};