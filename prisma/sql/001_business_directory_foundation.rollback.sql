-- ROLLBACK for 001_business_directory_foundation.sql.
-- Removes ONLY the objects that migration created. Legacy tables are never touched.
-- WARNING: this permanently deletes all directory data (listings, categories, provenance, audit rows).
-- Take a backup first if any of it was created after the migration.

BEGIN;
DROP TABLE IF EXISTS "business_audit_logs";
DROP TABLE IF EXISTS "business_images";
DROP TABLE IF EXISTS "business_field_provenance";
DROP TABLE IF EXISTS "business_source_records";
DROP TABLE IF EXISTS "business_data_sources";
DROP TABLE IF EXISTS "business_service_areas";
DROP TABLE IF EXISTS "business_locations";
DROP TABLE IF EXISTS "business_listing_categories";
DROP TABLE IF EXISTS "business_legacy_category_maps";
DROP TABLE IF EXISTS "business_category_external_mappings";
DROP TABLE IF EXISTS "business_category_stages";
DROP TABLE IF EXISTS "business_user_links";
DROP TABLE IF EXISTS "business_listings";
DROP TABLE IF EXISTS "business_categories";
DROP TYPE IF EXISTS "BusinessImageStatus";
DROP TYPE IF EXISTS "BusinessSourceRecordStatus";
DROP TYPE IF EXISTS "SourcePolicyReviewStatus";
DROP TYPE IF EXISTS "BusinessDisplayPolicy";
DROP TYPE IF EXISTS "BusinessFieldOrigin";
DROP TYPE IF EXISTS "BusinessServiceAreaType";
DROP TYPE IF EXISTS "BusinessUserRelation";
DROP TYPE IF EXISTS "BusinessPromotionStatus";
DROP TYPE IF EXISTS "BusinessVerificationStatus";
DROP TYPE IF EXISTS "BusinessListingStatus";
COMMIT;
