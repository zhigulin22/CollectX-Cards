-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateTable
CREATE TABLE "card_collections" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "icon" VARCHAR(10) NOT NULL DEFAULT '🃏',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_templates" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "image_thumb" VARCHAR(500),
    "emoji" VARCHAR(10) NOT NULL DEFAULT '🃏',
    "rarity" "CardRarity" NOT NULL DEFAULT 'COMMON',
    "sell_price_usdt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sell_price_x" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "drop_weight" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_minted" INTEGER NOT NULL DEFAULT 0,
    "max_supply" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "serial_number" INTEGER NOT NULL,
    "minted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_listed" BOOLEAN NOT NULL DEFAULT false,
    "list_price" DECIMAL(10,2),

    CONSTRAINT "user_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_packs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "icon" VARCHAR(10) NOT NULL DEFAULT '📦',
    "price_usdt" DECIMAL(10,2),
    "price_x" DECIMAL(10,2),
    "cards_count" INTEGER NOT NULL DEFAULT 3,
    "guaranteed_rarity" "CardRarity",
    "cooldown_seconds" INTEGER,
    "gradient" VARCHAR(100) NOT NULL DEFAULT 'from-violet-500 to-purple-600',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_openings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "card_ids" TEXT[],
    "paid_with" VARCHAR(10),
    "paid_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_openings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_templates_collection_id_idx" ON "card_templates"("collection_id");

-- CreateIndex
CREATE INDEX "card_templates_rarity_idx" ON "card_templates"("rarity");

-- CreateIndex
CREATE INDEX "user_cards_user_id_idx" ON "user_cards"("user_id");

-- CreateIndex
CREATE INDEX "user_cards_template_id_idx" ON "user_cards"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_cards_template_id_serial_number_key" ON "user_cards"("template_id", "serial_number");

-- CreateIndex
CREATE INDEX "pack_openings_user_id_idx" ON "pack_openings"("user_id");

-- CreateIndex
CREATE INDEX "pack_openings_pack_id_idx" ON "pack_openings"("pack_id");

-- AddForeignKey
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "card_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "card_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
