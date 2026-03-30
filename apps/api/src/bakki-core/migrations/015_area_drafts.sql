-- Migration: 015_area_drafts
-- Description: Creates the bakki_area_draft table for mobile offline area capture
-- This table stores draft area boundaries captured on mobile devices pending desktop review

CREATE TABLE IF NOT EXISTS bakki_area_draft (
  id BIGSERIAL PRIMARY KEY,
  draft_ref TEXT UNIQUE NOT NULL,               -- Client-generated UUID
  zone_ref TEXT NOT NULL,                       -- Target zone (NOT FK to allow offline)
  creator_user_id BIGINT NOT NULL,              -- User who captured (FK to bakki_user)
  
  -- Geometry & capture metadata
  boundary_geometry GEOMETRY(Polygon, 4326),   -- The captured polygon (single ring)
  area_hectares_estimate NUMERIC,               -- Computed from geometry
  raw_capture_points JSONB NOT NULL,            -- Array of {lat, lon, accuracy, timestamp}
  capture_method TEXT NOT NULL CHECK (capture_method IN ('boundary_walk', 'point_by_point')),
  average_gps_accuracy NUMERIC NOT NULL,        -- Average accuracy in meters
  
  -- Device metadata
  device_platform TEXT,                         -- 'ios' or 'android'
  device_os_version TEXT,
  app_version TEXT,
  
  -- Sync lifecycle
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN (
    'synced',     -- Received from mobile
    'rejected'    -- Failed server-side validation
  )),
  sync_error_message TEXT,                      -- Validation failure reason
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- When received from mobile
  
  -- Review lifecycle
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending',    -- Awaiting desktop review
    'approved',   -- Owner approved, ready to promote
    'rejected'    -- Owner rejected
  )),
  reviewer_user_id BIGINT,                      -- Who reviewed (FK to bakki_user)
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Promotion to real area
  promoted_area_ref TEXT,                       -- If approved, the created bakki_area.area_ref
  promoted_at TIMESTAMPTZ,
  
  -- Required fields
  draft_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS bakki_area_draft_zone_ref_idx ON bakki_area_draft(zone_ref);
CREATE INDEX IF NOT EXISTS bakki_area_draft_creator_idx ON bakki_area_draft(creator_user_id);
CREATE INDEX IF NOT EXISTS bakki_area_draft_review_status_idx ON bakki_area_draft(review_status);
CREATE INDEX IF NOT EXISTS bakki_area_draft_sync_status_idx ON bakki_area_draft(sync_status);

-- Spatial index for geometry operations
CREATE INDEX IF NOT EXISTS bakki_area_draft_geometry_idx ON bakki_area_draft USING GIST (boundary_geometry);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION bakki_area_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS bakki_area_draft_updated_at_trigger ON bakki_area_draft;
CREATE TRIGGER bakki_area_draft_updated_at_trigger
  BEFORE UPDATE ON bakki_area_draft
  FOR EACH ROW
  EXECUTE FUNCTION bakki_area_draft_updated_at();

-- Function to compute hectares from geometry
CREATE OR REPLACE FUNCTION bakki_area_draft_compute_hectares()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.boundary_geometry IS NOT NULL THEN
    -- ST_Area returns square meters when using geography cast
    NEW.area_hectares_estimate = ST_Area(NEW.boundary_geometry::geography) / 10000.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-computing hectares
DROP TRIGGER IF EXISTS bakki_area_draft_hectares_trigger ON bakki_area_draft;
CREATE TRIGGER bakki_area_draft_hectares_trigger
  BEFORE INSERT OR UPDATE OF boundary_geometry ON bakki_area_draft
  FOR EACH ROW
  EXECUTE FUNCTION bakki_area_draft_compute_hectares();

COMMENT ON TABLE bakki_area_draft IS 'Stores draft area boundaries captured offline on mobile devices pending desktop review';
COMMENT ON COLUMN bakki_area_draft.draft_ref IS 'Client-generated UUID (localId from mobile)';
COMMENT ON COLUMN bakki_area_draft.raw_capture_points IS 'Array of GPS points: [{latitude, longitude, accuracy, timestamp}]';
COMMENT ON COLUMN bakki_area_draft.capture_method IS 'How the boundary was captured: walking or point-by-point';
COMMENT ON COLUMN bakki_area_draft.review_status IS 'Desktop review workflow state';
COMMENT ON COLUMN bakki_area_draft.promoted_area_ref IS 'If approved, links to the created bakki_area record';
