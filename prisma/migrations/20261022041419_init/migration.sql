-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "UniversityType" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('primary', 'secondary', 'success', 'accent');

-- CreateEnum
CREATE TYPE "ScholarshipType" AS ENUM ('government', 'academic', 'sports');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('peticion', 'queja', 'reclamo', 'sugerencia');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('new', 'in_progress', 'closed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "type" "UniversityType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers" (
    "id" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "icon" VARCHAR(16) NOT NULL,
    "image" VARCHAR(300) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "summary" VARCHAR(600) NOT NULL,
    "tone" "Tone" NOT NULL,
    "symbol" VARCHAR(40) NOT NULL,
    "programs" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(600) NOT NULL,
    "video_url" VARCHAR(300) NOT NULL,
    "type" "ScholarshipType" NOT NULL,
    "institution" VARCHAR(160) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqrs_requests" (
    "id" SERIAL NOT NULL,
    "type" "RequestType" NOT NULL,
    "message" VARCHAR(5000) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'new',
    "user_id" INTEGER NOT NULL,
    "university_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pqrs_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "universities_name_key" ON "universities"("name");

-- CreateIndex
CREATE INDEX "universities_type_idx" ON "universities"("type");

-- CreateIndex
CREATE INDEX "pqrs_requests_user_id_idx" ON "pqrs_requests"("user_id");

-- CreateIndex
CREATE INDEX "pqrs_requests_university_id_idx" ON "pqrs_requests"("university_id");

-- AddForeignKey
ALTER TABLE "pqrs_requests" ADD CONSTRAINT "pqrs_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_requests" ADD CONSTRAINT "pqrs_requests_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
