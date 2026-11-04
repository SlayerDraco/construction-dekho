-- TEST FIXTURE: the pre-existing tables this phase depends on, generated from prisma/schema.prisma.

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'FAMILY_MEMBER', 'CONTRACTOR', 'SERVICE_PROVIDER', 'ARCHITECT', 'ADMIN');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "profileImage" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_provider_categories" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "service_provider_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_areas" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL DEFAULT 50,
    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claim_requests" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "claim_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "stages_name_key" ON "stages"("name");
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");
CREATE UNIQUE INDEX "service_providers_userId_key" ON "service_providers"("userId");
CREATE UNIQUE INDEX "service_provider_categories_providerId_categoryId_key" ON "service_provider_categories"("providerId", "categoryId");
CREATE UNIQUE INDEX "service_areas_providerId_city_key" ON "service_areas"("providerId", "city");

ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_provider_categories" ADD CONSTRAINT "service_provider_categories_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_provider_categories" ADD CONSTRAINT "service_provider_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
