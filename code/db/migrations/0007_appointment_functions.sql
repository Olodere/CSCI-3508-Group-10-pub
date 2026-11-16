-- migrate:up
-- Migration: Appointment booking and cancellation functions.
--
-- Provides database functions for creating and cancelling appointments.
-- Booking prices and durations are retrieved from active services.
-- Customer cancellations require the appointment cancellation token.
--

-- Create an in-salon appointment for an active service.
CREATE OR REPLACE FUNCTION book_appointment(
    p_service_id BIGINT,
    p_customer_name TEXT,
    p_customer_email CITEXT,
    p_customer_phone TEXT,
    p_start_time TIMESTAMPTZ
)
RETURNS TABLE (
    id UUID,
    cancellation_token UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    service_price_cents INTEGER,
    travel_fee_cents INTEGER,
    total_cents INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_price_cents INTEGER;
    v_duration_minutes INTEGER;
    v_end_time TIMESTAMPTZ;
BEGIN
    IF p_start_time IS NULL OR p_start_time <= now() THEN
        RAISE EXCEPTION 'Appointment time must be in the future'
            USING ERRCODE = '22023';
    END IF;

    IF p_customer_name IS NULL OR LENGTH(TRIM(p_customer_name)) = 0
       OR p_customer_email IS NULL OR LENGTH(TRIM(p_customer_email::TEXT)) = 0
       OR p_customer_phone IS NULL OR LENGTH(TRIM(p_customer_phone)) = 0 THEN
        RAISE EXCEPTION 'Customer name, email, and phone are required'
            USING ERRCODE = '22023';
    END IF;

    SELECT s.price_cents, s.duration_minutes
      INTO v_price_cents, v_duration_minutes
      FROM services s
     WHERE s.id = p_service_id
       AND s.is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found or inactive'
            USING ERRCODE = 'P0002';
    END IF;

    v_end_time := p_start_time
        + (v_duration_minutes * INTERVAL '1 minute');

    IF NOT EXISTS (
        SELECT 1
          FROM available_slots(
              (p_start_time AT TIME ZONE
                  (SELECT ss.timezone FROM salon_settings AS ss WHERE ss.id = 1))::DATE,
              v_duration_minutes
          ) AS slot
         WHERE slot.slot_start = p_start_time
           AND slot.slot_end = v_end_time
    ) THEN
        RAISE EXCEPTION 'Requested appointment time is unavailable'
            USING ERRCODE = '23P01';
    END IF;

    RETURN QUERY
    INSERT INTO appointments (
        service_id,
        appointment_type,
        customer_name,
        customer_email,
        customer_phone,
        service_price_cents,
        travel_fee_cents,
        start_time,
        end_time
    )
    VALUES (
        p_service_id,
        'in_salon',
        TRIM(p_customer_name),
        p_customer_email,
        TRIM(p_customer_phone),
        v_price_cents,
        0,
        p_start_time,
        v_end_time
    )
    RETURNING
        appointments.id,
        appointments.cancellation_token,
        appointments.start_time,
        appointments.end_time,
        appointments.service_price_cents,
        appointments.travel_fee_cents,
        appointments.service_price_cents + appointments.travel_fee_cents;
END;
$$;


-- Cancel an appointment using its customer cancellation token.
CREATE OR REPLACE FUNCTION cancel_appointment(
    p_appointment_id UUID,
    p_cancellation_token UUID
)
RETURNS TABLE (
    id UUID,
    status appointment_status,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    RETURN QUERY
    UPDATE appointments a
       SET status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = 'customer'
     WHERE a.id = p_appointment_id
       AND a.cancellation_token = p_cancellation_token
       AND a.status = 'booked'
    RETURNING
        a.id,
        a.status,
        a.cancelled_at;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Appointment could not be cancelled'
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- Allow the application role to execute both functions.
GRANT EXECUTE ON FUNCTION book_appointment(
    BIGINT, TEXT, CITEXT, TEXT, TIMESTAMPTZ
) TO nailsalon_app;

GRANT EXECUTE ON FUNCTION cancel_appointment(
    UUID, UUID
) TO nailsalon_app;

-- migrate:down
-- Down migrations are intentionally not implemented in v1.
