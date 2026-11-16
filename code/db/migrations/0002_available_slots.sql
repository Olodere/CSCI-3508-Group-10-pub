-- migrate:up

-- Migration: 0002_available_slots
-- Intent: single source of truth for "which slots are bookable on date D".
-- Both the customer booking UI and the admin schedule view call this.
-- Applied by `make migrate` (dev, via dbmate) and `run-tests.sh` (test, via psql).
--
-- Semantics:
--   candidate windows = availability_defaults for the day_of_week
--                     + availability_overrides with mode='add' for the date
--   subtractive filters = availability_overrides with mode='block'
--                       + appointments with status <> 'cancelled'
--   Slots step from each window's start by slot_interval_minutes until the
--   slot end would exceed the window end.
--   All times are interpreted in salon_settings.timezone.
--   A full-day block (mode='block' with NULL times) removes every slot on
--   that date, including slots contributed by 'add' overrides ("block wins").
--   Past slots are NOT filtered; callers should pass p_date >= today.

CREATE OR REPLACE FUNCTION available_slots(
    p_date date,
    p_duration_minutes integer,
    p_slot_interval integer DEFAULT NULL
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_tz text;
    v_interval integer;
BEGIN
    IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
        RAISE EXCEPTION 'p_duration_minutes must be positive (got %)', p_duration_minutes
            USING ERRCODE = '22023';
    END IF;

    SELECT s.timezone,
           COALESCE(p_slot_interval, s.slot_interval_minutes)
      INTO v_tz, v_interval
      FROM salon_settings s
     WHERE s.id = 1;

    IF v_tz IS NULL THEN
        RAISE EXCEPTION 'salon_settings (id=1) is missing' USING ERRCODE = '22023';
    END IF;

    IF v_interval IS NULL OR v_interval <= 0 THEN
        RAISE EXCEPTION 'effective slot interval must be positive (got %)', v_interval
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH
    default_windows AS (
        SELECT ((p_date + ad.start_time) AT TIME ZONE v_tz) AS w_start,
               ((p_date + ad.end_time)   AT TIME ZONE v_tz) AS w_end
          FROM availability_defaults ad
         WHERE ad.day_of_week = EXTRACT(DOW FROM p_date)::smallint
           AND ad.is_active
    ),
    add_windows AS (
        SELECT ((p_date + ao.start_time) AT TIME ZONE v_tz) AS w_start,
               ((p_date + ao.end_time)   AT TIME ZONE v_tz) AS w_end
          FROM availability_overrides ao
         WHERE ao.override_date = p_date
           AND ao.mode = 'add'
    ),
    all_windows AS (
        SELECT w_start, w_end FROM default_windows
        UNION ALL
        SELECT w_start, w_end FROM add_windows
    ),
    block_ranges AS (
        SELECT
            CASE
                WHEN ao.start_time IS NULL
                    THEN ((p_date::timestamp) AT TIME ZONE v_tz)
                ELSE ((p_date + ao.start_time) AT TIME ZONE v_tz)
            END AS b_start,
            CASE
                WHEN ao.end_time IS NULL
                    THEN (((p_date + 1)::timestamp) AT TIME ZONE v_tz)
                ELSE ((p_date + ao.end_time) AT TIME ZONE v_tz)
            END AS b_end
          FROM availability_overrides ao
         WHERE ao.override_date = p_date
           AND ao.mode = 'block'
    ),
    generated AS (
        SELECT gs AS g_start,
               gs + (p_duration_minutes * interval '1 minute') AS g_end
          FROM all_windows w
          CROSS JOIN LATERAL generate_series(
              w.w_start,
              w.w_end - (p_duration_minutes * interval '1 minute'),
              (v_interval * interval '1 minute')
          ) AS gs
    ),
    not_blocked AS (
        SELECT g.g_start, g.g_end
          FROM generated g
         WHERE NOT EXISTS (
             SELECT 1 FROM block_ranges b
              WHERE tstzrange(g.g_start, g.g_end)
                 && tstzrange(b.b_start, b.b_end)
         )
    )
    SELECT nb.g_start, nb.g_end
      FROM not_blocked nb
     WHERE NOT EXISTS (
         SELECT 1 FROM appointments a
          WHERE a.status <> 'cancelled'
            AND tstzrange(a.start_time, a.end_time)
               && tstzrange(nb.g_start, nb.g_end)
     )
     ORDER BY nb.g_start;
END;
$$;

-- migrate:down

-- Down migrations are intentionally not implemented in v1.
-- If a rollback is ever needed, uncomment:
--
--   DROP FUNCTION IF EXISTS available_slots(date, integer, integer);

-- (intentionally empty down block; the up path is the only exercised migration)