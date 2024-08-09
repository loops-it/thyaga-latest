-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "user_role" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "online_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_admin_details" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "other_admin_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_agent_details" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "other_agent_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_languages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_bot_chats" (
    "id" SERIAL NOT NULL,
    "message_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "message_sent_by" TEXT NOT NULL,
    "viewed_by_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_bot_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_agent_chat_header" (
    "id" SERIAL NOT NULL,
    "message_id" TEXT NOT NULL,
    "agent" TEXT,
    "language" TEXT,
    "rating" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL,
    "is_time_out" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_agent_chat_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_chat_timer" (
    "id" SERIAL NOT NULL,
    "message_id" TEXT NOT NULL,
    "agent" INTEGER NOT NULL,
    "time" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_chat_timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_edges" (
    "id" SERIAL NOT NULL,
    "edge_id" TEXT,
    "source" TEXT,
    "source_handle" TEXT,
    "target" TEXT,
    "target_handle" TEXT,
    "type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_chats" (
    "id" SERIAL NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message_sent_by" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_button_data" (
    "id" SERIAL NOT NULL,
    "node_id" TEXT,
    "text" TEXT,
    "link" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "flow_button_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_card_data" (
    "id" SERIAL NOT NULL,
    "node_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "flow_card_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_text_box" (
    "id" SERIAL NOT NULL,
    "node_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "flow_text_box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_text_only" (
    "id" SERIAL NOT NULL,
    "node_id" TEXT,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_text_only_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_agent_chat_chats" (
    "id" SERIAL NOT NULL,
    "message_id" TEXT NOT NULL,
    "sent_by" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent_to_user" TEXT,
    "viewed_by_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_agent_chat_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_nodes" (
    "id" SERIAL NOT NULL,
    "node_id" TEXT,
    "dragging" TEXT,
    "height" TEXT,
    "position" JSONB,
    "position_absolute" JSONB,
    "selected" TEXT,
    "type" TEXT,
    "width" TEXT,
    "extent" TEXT,
    "parent_id" TEXT,
    "intent" TEXT,
    "language" TEXT,
    "value" TEXT,
    "placeholder" TEXT,
    "label" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "flow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_form_submissions" (
    "id" SERIAL NOT NULL,
    "chat_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "intent" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" SERIAL NOT NULL,
    "sector_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_form_submissions" (
    "id" SERIAL NOT NULL,
    "form_id" TEXT NOT NULL,
    "field_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
