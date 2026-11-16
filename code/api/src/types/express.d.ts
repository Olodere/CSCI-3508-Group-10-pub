import "express-session";

/** The signed-in owner, as admin routes see it. Never includes the password hash. */
export interface AdminIdentity {
  id: number;
  email: string;
  fullName: string;
}

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    csrfToken?: string;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    /** Set by requireAdmin for every route behind it. */
    admin?: AdminIdentity;
  }
}
