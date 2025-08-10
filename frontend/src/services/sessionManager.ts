// Centralized session management for the entire application
class SessionManager {
  private static instance: SessionManager;
  private sessionId: string | null = null;
  private sessionExpiry: number | null = null;
  private readonly SESSION_STORAGE_KEY = 'app_session_id';
  private readonly SESSION_EXPIRY_KEY = 'app_session_expiry';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private loadFromStorage(): void {
    const storedSessionId = localStorage.getItem(this.SESSION_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(this.SESSION_EXPIRY_KEY);

    if (storedSessionId && storedExpiry) {
      const expiryTime = parseInt(storedExpiry);
      if (new Date().getTime() < expiryTime) {
        this.sessionId = storedSessionId;
        this.sessionExpiry = expiryTime;
      } else {
        this.clearSession();
      }
    }
  }

  private saveToStorage(): void {
    if (this.sessionId && this.sessionExpiry) {
      localStorage.setItem(this.SESSION_STORAGE_KEY, this.sessionId);
      localStorage.setItem(this.SESSION_EXPIRY_KEY, this.sessionExpiry.toString());
    }
  }

  public getSessionId(): string {
    if (!this.sessionId || this.isExpired()) {
      this.createNewSession();
    }
    return this.sessionId!;
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.sessionExpiry = new Date().getTime() + this.SESSION_DURATION;
    this.saveToStorage();
  }

  private createNewSession(): void {
    // Generate a unique session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionExpiry = new Date().getTime() + this.SESSION_DURATION;
    this.saveToStorage();
  }

  private isExpired(): boolean {
    if (!this.sessionExpiry) return true;
    return new Date().getTime() > this.sessionExpiry;
  }

  public clearSession(): void {
    this.sessionId = null;
    this.sessionExpiry = null;
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
    localStorage.removeItem(this.SESSION_EXPIRY_KEY);
  }

  public isValid(): boolean {
    return this.sessionId !== null && !this.isExpired();
  }
}

export default SessionManager;