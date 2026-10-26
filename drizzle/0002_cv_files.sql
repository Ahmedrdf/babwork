CREATE TABLE "cv_files" (
	"key" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
