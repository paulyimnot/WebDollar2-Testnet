CREATE TABLE "banned_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"reason" text DEFAULT 'Violation of Terms',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "banned_ips_ip_unique" UNIQUE("ip")
);
--> statement-breakpoint
CREATE TABLE "blocked_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"reason" text DEFAULT 'Old dev wallet - blocked',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blocked_wallets_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"previous_hash" text NOT NULL,
	"miner_id" integer,
	"reward" numeric(20, 4) NOT NULL,
	"difficulty" integer DEFAULT 1,
	"nonce" integer DEFAULT 0,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "card_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casino_sweepstakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"game" text NOT NULL,
	"amount_won" numeric(20, 4) NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversion_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"old_wallet_address" text NOT NULL,
	"amount_claimed" numeric(20, 4) NOT NULL,
	"amount_approved" numeric(20, 4),
	"tx_proof" text,
	"status" text DEFAULT 'pending',
	"vesting_release_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "faucet_claim_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"wallet_address" text NOT NULL,
	"last_claim_at" timestamp DEFAULT now(),
	CONSTRAINT "faucet_claim_log_ip_unique" UNIQUE("ip")
);
--> statement-breakpoint
CREATE TABLE "registration_ip_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "registration_ip_log_ip_unique" UNIQUE("ip")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer,
	"receiver_id" integer,
	"sender_address" text,
	"receiver_address" text,
	"amount" numeric(20, 4) NOT NULL,
	"type" text NOT NULL,
	"block_id" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"wallet_address" text,
	"polygon_address" text,
	"balance" numeric(20, 4) DEFAULT '0',
	"staked_balance" numeric(20, 4) DEFAULT '0',
	"last_stake_reward_claim" timestamp,
	"is_dev" boolean DEFAULT false,
	"is_foundation" boolean DEFAULT false,
	"totp_secret" text,
	"is_2fa_enabled" boolean DEFAULT false,
	"alias" text,
	"is_alias_active" boolean DEFAULT false,
	"staking_stopped_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "wallet_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text DEFAULT 'Default' NOT NULL,
	"address" text NOT NULL,
	"polygon_address" text,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"mnemonic" text NOT NULL,
	"balance" numeric(20, 4) DEFAULT '0',
	"is_locked" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "wallet_addresses_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_miner_id_users_id_fk" FOREIGN KEY ("miner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_waitlist" ADD CONSTRAINT "card_waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_requests" ADD CONSTRAINT "conversion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_addresses" ADD CONSTRAINT "wallet_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;