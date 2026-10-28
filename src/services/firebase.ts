import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyB13tfQcG_kbiLgdfWRXvds1qgrCLtmcfs',
  authDomain: 'chatapp-127ab.firebaseapp.com',
  projectId: 'chatapp-127ab',
  databaseURL: 'https://chatapp-127ab-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: 'chatapp-127ab.firebasestorage.app',
  messagingSenderId: '885762770494',
  appId: '1:885762770494:web:0b1409bbd238712cc6336f',
  measurementId: 'G-Y9H4XFBZRV',
};


export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);
