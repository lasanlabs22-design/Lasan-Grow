CREATE TYPE "public"."platform_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "platform_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" "workspace_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_created_by_platform_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admins_email_idx" ON "platform_admins" USING btree ("email");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_platform_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;