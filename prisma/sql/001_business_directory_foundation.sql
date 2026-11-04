-- Business directory foundation (Phase 1). ADDITIVE ONLY: creates new objects, never alters or drops existing ones.
-- Generated from prisma/schema.prisma (Prisma naming conventions) and then reviewed. See docs/phase1/MIGRATION_PLAN.md.

CREATE TYPE "BusinessListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'SUPPRESSED', 'REMOVED');
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REVOKED');
CREATE TYPE "BusinessPromotionStatus" AS ENUM ('NONE', 'FEATURED');
CREATE TYPE "BusinessUserRelation" AS ENUM ('LEGACY_ACCOUNT', 'OWNER_CLAIM', 'REPRESENTATIVE');
CREATE TYPE "BusinessServiceAreaType" AS ENUM ('PINCODE', 'LOCALITY', 'CITY', 'DISTRICT', 'STATE', 'RADIUS', 'NATIONWIDE');
CREATE TYPE "BusinessFieldOrigin" AS ENUM ('SOURCE_PROVIDED', 'VENDOR_SUPPLIED', 'ADMIN_CONFIRMED', 'ADMIN_EDITED', 'MIGRATED_LEGACY');
CREATE TYPE "BusinessDisplayPolicy" AS ENUM ('PUBLIC', 'INTERNAL_ONLY', 'RESTRICTED');
CREATE TYPE "SourcePolicyReviewStatus" AS ENUM ('NEEDS_HUMAN_REVIEW', 'APPROVED', 'BLOCKED');
CREATE TYPE "BusinessSourceRecordStatus" AS ENUM ('ACTIVE', 'STALE', 'REMOVED_AT_SOURCE', 'SUPPRESSED');
CREATE TYPE "BusinessImageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "business_listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "listingStatus" "BusinessListingStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationChangedAt" TIMESTAMP(3),
    "promotionStatus" "BusinessPromotionStatus" NOT NULL DEFAULT 'NONE',
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "operatingHours" JSONB,
    "dataQualityScore" DOUBLE PRECISION,
    "isFixture" BOOLEAN NOT NULL DEFAULT false,
    "legacyServiceProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_user_links" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relation" "BusinessUserRelation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_user_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "synonyms" TEXT[],
    "discoveryTerms" TEXT[],
    "defaultRadiusKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_category_stages" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "business_category_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_category_external_mappings" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL,
    "externalLabel" TEXT,
    CONSTRAINT "business_category_external_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_legacy_category_maps" (
    "id" TEXT NOT NULL,
    "serviceCategoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_legacy_category_maps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_listing_categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_listing_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_locations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "locality" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocodeAccuracy" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_service_areas" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "areaType" "BusinessServiceAreaType" NOT NULL,
    "pincode" TEXT,
    "locality" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "centerLatitude" DOUBLE PRECISION,
    "centerLongitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_service_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_data_sources" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "licenceBasis" TEXT,
    "licenceUrl" TEXT,
    "attributionText" TEXT,
    "permittedFields" TEXT[],
    "maxRetentionDays" INTEGER,
    "publicDisplayAllowed" BOOLEAN NOT NULL DEFAULT false,
    "imagesAllowed" BOOLEAN NOT NULL DEFAULT false,
    "refreshIntervalDays" INTEGER,
    "deletionObligations" TEXT,
    "rateLimitNotes" TEXT,
    "policyReviewStatus" "SourcePolicyReviewStatus" NOT NULL DEFAULT 'NEEDS_HUMAN_REVIEW',
    "policyReviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_data_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_source_records" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "businessId" TEXT,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "status" "BusinessSourceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "rawPayload" JSONB,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "retainUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_source_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_field_provenance" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "origin" "BusinessFieldOrigin" NOT NULL,
    "licenceBasis" TEXT,
    "displayPolicy" "BusinessDisplayPolicy" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "retainUntil" TIMESTAMP(3),
    "refreshBy" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_field_provenance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_images" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "storageKey" TEXT,
    "url" TEXT,
    "dataSourceId" TEXT,
    "licence" TEXT,
    "permissionEvidence" TEXT,
    "attribution" TEXT,
    "allowedUse" TEXT,
    "altText" TEXT,
    "status" "BusinessImageStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_listings_slug_key" ON "business_listings"("slug");
CREATE UNIQUE INDEX "business_listings_legacyServiceProviderId_key" ON "business_listings"("legacyServiceProviderId");
CREATE UNIQUE INDEX "business_user_links_businessId_userId_key" ON "business_user_links"("businessId", "userId");
CREATE UNIQUE INDEX "business_categories_slug_key" ON "business_categories"("slug");
CREATE UNIQUE INDEX "business_category_stages_categoryId_stageId_key" ON "business_category_stages"("categoryId", "stageId");
CREATE UNIQUE INDEX "business_cat_ext_map_cat_src_code_key" ON "business_category_external_mappings"("categoryId", "sourceKey", "externalCode");
CREATE UNIQUE INDEX "business_legacy_category_maps_serviceCategoryId_key" ON "business_legacy_category_maps"("serviceCategoryId");
CREATE UNIQUE INDEX "business_listing_categories_businessId_categoryId_key" ON "business_listing_categories"("businessId", "categoryId");
CREATE UNIQUE INDEX "business_data_sources_key_key" ON "business_data_sources"("key");
CREATE UNIQUE INDEX "business_source_records_dataSourceId_externalId_key" ON "business_source_records"("dataSourceId", "externalId");
CREATE UNIQUE INDEX "business_field_provenance_businessId_fieldName_dataSourceId_key" ON "business_field_provenance"("businessId", "fieldName", "dataSourceId");
CREATE INDEX "business_listings_listingStatus_idx" ON "business_listings"("listingStatus");
CREATE INDEX "business_listings_verificationStatus_idx" ON "business_listings"("verificationStatus");
CREATE INDEX "business_listings_name_idx" ON "business_listings"("name");
CREATE INDEX "business_user_links_userId_idx" ON "business_user_links"("userId");
CREATE INDEX "business_categories_parentId_idx" ON "business_categories"("parentId");
CREATE INDEX "business_categories_isActive_displayOrder_idx" ON "business_categories"("isActive", "displayOrder");
CREATE INDEX "business_category_stages_stageId_idx" ON "business_category_stages"("stageId");
CREATE INDEX "business_category_external_mappings_sourceKey_externalCode_idx" ON "business_category_external_mappings"("sourceKey", "externalCode");
CREATE INDEX "business_legacy_category_maps_categoryId_idx" ON "business_legacy_category_maps"("categoryId");
CREATE INDEX "business_listing_categories_categoryId_idx" ON "business_listing_categories"("categoryId");
CREATE INDEX "business_locations_businessId_idx" ON "business_locations"("businessId");
CREATE INDEX "business_locations_pincode_idx" ON "business_locations"("pincode");
CREATE INDEX "business_locations_state_city_idx" ON "business_locations"("state", "city");
CREATE INDEX "business_locations_latitude_longitude_idx" ON "business_locations"("latitude", "longitude");
CREATE INDEX "business_service_areas_businessId_idx" ON "business_service_areas"("businessId");
CREATE INDEX "business_service_areas_areaType_pincode_idx" ON "business_service_areas"("areaType", "pincode");
CREATE INDEX "business_service_areas_state_city_idx" ON "business_service_areas"("state", "city");
CREATE INDEX "business_source_records_businessId_idx" ON "business_source_records"("businessId");
CREATE INDEX "business_field_provenance_businessId_idx" ON "business_field_provenance"("businessId");
CREATE INDEX "business_images_businessId_status_idx" ON "business_images"("businessId", "status");
CREATE INDEX "business_audit_logs_businessId_createdAt_idx" ON "business_audit_logs"("businessId", "createdAt");
CREATE INDEX "business_audit_logs_entityType_entityId_idx" ON "business_audit_logs"("entityType", "entityId");
CREATE INDEX "business_audit_logs_action_idx" ON "business_audit_logs"("action");

ALTER TABLE "business_listings" ADD CONSTRAINT "business_listings_legacyServiceProviderId_fkey" FOREIGN KEY ("legacyServiceProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_user_links" ADD CONSTRAINT "business_user_links_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_user_links" ADD CONSTRAINT "business_user_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_category_stages" ADD CONSTRAINT "business_category_stages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_category_stages" ADD CONSTRAINT "business_category_stages_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_category_external_mappings" ADD CONSTRAINT "business_category_external_mappings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_legacy_category_maps" ADD CONSTRAINT "business_legacy_category_maps_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_legacy_category_maps" ADD CONSTRAINT "business_legacy_category_maps_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_listing_categories" ADD CONSTRAINT "business_listing_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_listing_categories" ADD CONSTRAINT "business_listing_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_source_records" ADD CONSTRAINT "business_source_records_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "business_data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_source_records" ADD CONSTRAINT "business_source_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_field_provenance" ADD CONSTRAINT "business_field_provenance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_field_provenance" ADD CONSTRAINT "business_field_provenance_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "business_data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_field_provenance" ADD CONSTRAINT "business_field_provenance_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "business_source_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_images" ADD CONSTRAINT "business_images_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_images" ADD CONSTRAINT "business_images_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "business_data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Database-level guards (Prisma cannot express CHECK constraints). Also applied idempotently by `npm run db:seed-directory`.
ALTER TABLE "business_listings" ADD CONSTRAINT "business_listings_slug_format_chk" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_lat_range_chk" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_lng_range_chk" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_coords_pair_chk" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_pincode_format_chk" CHECK ("pincode" IS NULL OR "pincode" ~ '^[1-9][0-9]{5}$');
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_radius_pos_chk" CHECK ("radiusKm" IS NULL OR "radiusKm" > 0);
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_pincode_format_chk" CHECK ("pincode" IS NULL OR "pincode" ~ '^[1-9][0-9]{5}$');
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_type_fields_chk" CHECK (("areaType" <> 'PINCODE' OR "pincode" IS NOT NULL) AND ("areaType" <> 'CITY' OR "city" IS NOT NULL) AND ("areaType" <> 'STATE' OR "state" IS NOT NULL) AND ("areaType" <> 'RADIUS' OR ("centerLatitude" IS NOT NULL AND "centerLongitude" IS NOT NULL AND "radiusKm" IS NOT NULL)));
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_no_self_parent_chk" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_radius_pos_chk" CHECK ("defaultRadiusKm" IS NULL OR "defaultRadiusKm" > 0);
ALTER TABLE "business_category_stages" ADD CONSTRAINT "business_category_stages_relevance_chk" CHECK ("relevance" BETWEEN 1 AND 3);
ALTER TABLE "business_images" ADD CONSTRAINT "business_images_has_location_chk" CHECK ("url" IS NOT NULL OR "storageKey" IS NOT NULL);
ALTER TABLE "business_images" ADD CONSTRAINT "business_images_approved_needs_evidence_chk" CHECK ("status" <> 'APPROVED' OR "licence" IS NOT NULL OR "permissionEvidence" IS NOT NULL);
