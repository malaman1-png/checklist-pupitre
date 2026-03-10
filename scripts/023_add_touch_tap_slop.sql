-- Add global anti miss-click tolerance (in px) for checklist taps
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS touch_tap_slop_px INT NOT NULL DEFAULT 10;

UPDATE settings
SET touch_tap_slop_px = 10
WHERE touch_tap_slop_px IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_touch_tap_slop_px_check'
  ) THEN
    ALTER TABLE settings
    ADD CONSTRAINT settings_touch_tap_slop_px_check
    CHECK (touch_tap_slop_px >= 0 AND touch_tap_slop_px <= 28);
  END IF;
END $$;
