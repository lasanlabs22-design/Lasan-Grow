CREATE TABLE "user_photos" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_photos_org_idx" ON "user_photos" USING btree ("org_id");--> statement-breakpoint

-- Only small inline images: the browser crops to 320px and re-encodes before upload.
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_data_check"
  CHECK (length("data") <= 200000 AND "data" ~ '^data:image/(png|jpeg|webp);base64,');--> statement-breakpoint

-- Same isolation as every other workspace table (see 0003_row_level_security.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON user_photos TO lasan_grow_app;--> statement-breakpoint
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON user_photos TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());
