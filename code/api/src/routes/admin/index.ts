import { Router } from "express";
import { adminSession } from "../../auth/session";
import { requireAdmin } from "../../middleware/requireAdmin";
import { appointmentsRouter } from "./appointments";
import { currentSession, login, logout } from "./auth";

export const adminRouter = Router();

// Sessions are only needed under /api/admin, so public routes never touch them.
adminRouter.use(adminSession);

// Private data must never be cached by browsers or proxies.
adminRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// --- Open to everyone ---
adminRouter.post("/login", login);
adminRouter.post("/logout", logout);

// --- Everything below requires a signed-in, active owner (and a CSRF
//     token on POST/PATCH/DELETE). Add new admin routers after this line. ---
adminRouter.use(requireAdmin);

adminRouter.get("/session", currentSession);

adminRouter.use("/appointments", appointmentsRouter);
// adminRouter.use("/services", servicesRouter);
// adminRouter.use("/availability", availabilityRouter);
