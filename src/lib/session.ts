export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export type CustomerSession = {
  token: string;
  user: SessionUser;
  lastOrderId?: string;
};

const SESSION_KEY = 'delivery_session';

export function loadSession(): CustomerSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(SESSION_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CustomerSession;
  } catch {
    return null;
  }
}

export function saveSession(session: CustomerSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
