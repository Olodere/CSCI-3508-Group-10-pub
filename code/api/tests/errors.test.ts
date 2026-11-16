import { describe, expect, it } from "vitest";
import { ApiError, mapPgError } from "../src/middleware/error";

describe("mapPgError", () => {
  it("maps the exclusion constraint to SLOT_TAKEN", () => {
    const e = mapPgError({ code: "23P01", constraint: "appointments_no_overlap" });
    expect(e.status).toBe(409);
    expect(e.code).toBe("SLOT_TAKEN");
  });

  it("maps the explicit slot_taken hint to SLOT_TAKEN", () => {
    const e = mapPgError({ code: "23P01", hint: "slot_taken" });
    expect(e.code).toBe("SLOT_TAKEN");
  });

  it("maps other exclusion conflicts to CONFLICT", () => {
    const e = mapPgError({ code: "23P01" });
    expect(e.code).toBe("CONFLICT");
  });

  it("maps CHECK violations to VALIDATION_FAILED (422)", () => {
    const e = mapPgError({ code: "23514", message: "check failed" });
    expect(e.status).toBe(422);
    expect(e.code).toBe("VALIDATION_FAILED");
  });

  it("maps UNIQUE violations to DUPLICATE", () => {
    const e = mapPgError({ code: "23505", constraint: "services_name_key" });
    expect(e.code).toBe("DUPLICATE");
    expect(e.details).toEqual({ constraint: "services_name_key" });
  });

  it("maps FK RESTRICT to FK_IN_USE", () => {
    const e = mapPgError({ code: "23503" });
    expect(e.code).toBe("FK_IN_USE");
  });

  it("maps invalid_parameter_value to BAD_INPUT", () => {
    const e = mapPgError({ code: "22023", message: "bad" });
    expect(e.status).toBe(400);
    expect(e.code).toBe("BAD_INPUT");
  });

  it("maps not_found to 404", () => {
    const e = mapPgError({ code: "P0002" });
    expect(e.status).toBe(404);
  });

  it("hides DB authentication failures as INTERNAL", () => {
    const e = mapPgError({ code: "28P01" });
    expect(e.status).toBe(500);
    expect(e.code).toBe("INTERNAL");
  });

  it("preserves explicit ApiError instances", () => {
    const original = ApiError.slotTaken();
    expect(mapPgError(original)).toBe(original);
  });
});