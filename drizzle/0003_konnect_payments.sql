CREATE TABLE "konnect_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"payment_ref" text,
	"checkout_url" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "konnect_payments_payment_ref_unique" UNIQUE("payment_ref")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_source" text;--> statement-breakpoint
ALTER TABLE "konnect_payments" ADD CONSTRAINT "konnect_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "konnect_payments_user_idx" ON "konnect_payments" USING btree ("user_id");