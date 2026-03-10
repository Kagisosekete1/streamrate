// Webpushr push notification utilities
const WEBPUSHR_KEY = 'BNY3hXisTgs2HdZB7MbUZVhsGo1bB9n8Q1rWD5g-HeQXQsnKQG6IVJyXACIqqmxMuDew0CLWivYpElEZopxoe1I';

let initialized = false;

export const initWebpushr = () => {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  // Webpushr is loaded via script tag in index.html
  const w = window as any;
  if (typeof w.webpushr === 'undefined') {
    w.webpushr = w.webpushr || function (...args: any[]) {
      (w.webpushr.q = w.webpushr.q || []).push(args);
    };
  }

  initialized = true;
  console.log("Webpushr initialized");
};

export const setWebpushrUserId = (userId: string) => {
  try {
    const w = window as any;
    if (w.webpushr) {
      w.webpushr('sid', userId);
      console.log("Webpushr subscriber ID set:", userId);
    }
  } catch (error) {
    console.log("Webpushr sid set skipped:", error);
  }
};

export const promptForPushNotifications = () => {
  try {
    const w = window as any;
    if (w.webpushr) {
      w.webpushr('prompt');
    }
  } catch (error) {
    console.error("Error prompting push permission:", error);
  }
};
