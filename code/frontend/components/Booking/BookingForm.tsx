"use client";

import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { getAvailability, createAppointment } from "@/lib/api";
import {
  formatDuration,
  formatPrice,
  formatTime,
  formatDate,
} from "@/lib/format";
import type {
  Service,
  TimeSlot,
  AppointmentConfirmation,
  CreateAppointmentRequest,
} from "@/types/booking";
import styles from "./BookingForm.module.css";

type BookingFormProps = { services: Service[] };
type Details = { name: string; email: string; phone: string };
const EMPTY_DETAILS: Details = { name: "", email: "", phone: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BookingForm({ services }: BookingFormProps) {
  // ── State: everything the form needs to remember ──
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(""); // "YYYY-MM-DD"
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<AppointmentConfirmation | null>(null);

  const today = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD": the format <input type="date"> needs
  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  // Load open times for a service + date. Called from event handlers.
  async function loadSlots(nextServiceId: number | null, nextDate: string) {
    setSelectedStart(null);
    setSlots([]);
    setSlotError(null);
    if (nextServiceId === null || !nextDate) return; // need both first

    setLoadingSlots(true);
    const result = await getAvailability(nextDate, nextServiceId);
    setLoadingSlots(false);

    if (result.ok) setSlots(result.data.slots);
    else setSlotError(result.error.message);
  }

  function handleDetailChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setDetails((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): string | null {
    if (!selectedService) return "Please choose a service.";
    if (!selectedStart) return "Please pick a time.";
    if (!details.name.trim()) return "Please enter your name.";
    if (!EMAIL_PATTERN.test(details.email.trim()))
      return "Please enter a valid email.";
    if (details.phone.replace(/\D/g, "").length !== 10)
      return "Please enter a 10-digit phone number.";
    return null;
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setSubmitError(problem);
      return;
    }
    if (!selectedService || !selectedStart) return;
    const request: CreateAppointmentRequest = {
      serviceId: selectedService.id,
      isCustomRequest: false,
      customRequestDescription: null,
      appointmentType: "in_salon",
      serviceAddress: null,
      customerName: details.name.trim(),
      customerEmail: details.email.trim(),
      customerPhone: details.phone.replace(/\D/g, ""),
      startTime: selectedStart,
    };

    setSubmitting(true);
    setSubmitError(null);
    const result = await createAppointment(request);
    setSubmitting(false);

    if (result.ok) {
      setConfirmation(result.data);
      return;
    }

    if (result.error.code === "SLOT_TAKEN") {
      loadSlots(serviceId, date);
    }
    setSubmitError(result.error.message);
  }

  function startOver() {
    setConfirmation(null);
    setServiceId(null);
    setDate("");
    setSlots([]);
    setSelectedStart(null);
    setDetails(EMPTY_DETAILS);
    setSubmitError(null);
    setSlotError(null);
  }

  if (confirmation) {
    return (
      <div className={styles.confirmation} role="status">
        <h3>Appointment Booked!</h3>
        <p>
          {selectedService?.name} on {formatDate(confirmation.startTime)} at{" "}
          {formatTime(confirmation.startTime)}
        </p>
        <p>Total: {formatPrice(confirmation.totalCents)}</p>
        <button type="button" className={styles.submit} onClick={startOver}>
          Book Another Appointment
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.fieldset}>
        <legend>1. Choose a service</legend>
        {services.map((service) => (
          <label key={service.id} className={styles.option}>
            <input
              type="radio"
              name="service"
              checked={serviceId === service.id}
              onChange={() => {
                setServiceId(service.id);
                loadSlots(service.id, date);
              }}
            />
            <span>
              {service.name} · {formatPrice(service.priceCents)} ·{" "}
              {formatDuration(service.durationMinutes)}
            </span>
          </label>
        ))}
      </fieldset>

      <label className={styles.label}>
        2. Pick a date
        <input
          className={styles.input}
          type="date"
          min={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(serviceId, e.target.value);
          }}
        />
      </label>

      <fieldset className={styles.fieldset}>
        <legend>3. Pick a time</legend>
        {loadingSlots && <p>Loading times…</p>}
        {slotError && <p role="alert">{slotError}</p>}
        {!loadingSlots &&
          serviceId !== null &&
          date &&
          slots.length === 0 &&
          !slotError && <p>No open times that day. Try another date.</p>}
        <div className={styles.slots}>
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              className={`${styles.slot} ${selectedStart === slot.start ? styles.selected : ""}`}
              aria-pressed={selectedStart === slot.start}
              onClick={() => setSelectedStart(slot.start)}
            >
              {formatTime(slot.start)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>4. Your details</legend>
        <label className={styles.label}>
          Name
          <input
            className={styles.input}
            name="name"
            autoComplete="name"
            value={details.name}
            onChange={handleDetailChange}
          />
        </label>
        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            value={details.email}
            onChange={handleDetailChange}
          />
        </label>
        <label className={styles.label}>
          Phone
          <input
            className={styles.input}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={details.phone}
            onChange={handleDetailChange}
          />
        </label>
      </fieldset>

      {submitError && (
        <p role="alert" className={styles.error}>
          {submitError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "Booking..." : "Book Appointment"}
      </button>
    </form>
  );
}
