-- Nourishly MySQL schema.
-- Every user-facing entity uses a VARCHAR(36) id (app-generated UUID, see src/db/id.js) so
-- foreign keys stay plain string comparisons — matching how req.user.id / String(x) comparisons
-- already work throughout the controllers. The two purely-internal join tables (recipe_tags,
-- plan_meals) use AUTO_INCREMENT instead, since their own id is never sent to the client.

-- A named service/program a client is on (e.g. "Weight Loss", "Diabetes Management") — entirely
-- separate from the `plans`/`plan_meals` weekly meal-plan tables below. Named `program_plans`
-- (not `plans`) specifically to avoid colliding with that existing, unrelated concept. Admin-only
-- create/edit/activate-deactivate (no delete) — automatically visible to every dietitian, so no
-- per-dietitian ownership column.
CREATE TABLE IF NOT EXISTS program_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'dietitian', 'admin') NOT NULL DEFAULT 'client',
  phone VARCHAR(50),
  assigned_dietitian_id VARCHAR(36) NULL,
  refresh_token_version INT NOT NULL DEFAULT 0,
  -- DB-level default is FALSE, never TRUE: an ALTER that defaulted existing rows to TRUE would
  -- retroactively lock every already-existing user out on their next login. TRUE is only ever set
  -- explicitly, by the admin-create code path (user.controller.js#createUser) — see
  -- docs/specs/implementation-plan.md §2 "Design note".
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  -- Only meaningful for role='client' (same convention as assigned_dietitian_id above) — the
  -- named service/program plan and a fixed-choice duration string (e.g. "3 months"), both set at
  -- client creation/edit time by an admin. See program_plans above.
  program_plan_id VARCHAR(36) NULL,
  plan_duration VARCHAR(50) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_assigned_dietitian (assigned_dietitian_id),
  KEY idx_users_program_plan (program_plan_id),
  CONSTRAINT fk_users_assigned_dietitian FOREIGN KEY (assigned_dietitian_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_program_plan FOREIGN KEY (program_plan_id) REFERENCES program_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(36) PRIMARY KEY,
  goal VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  preferred_slot VARCHAR(255),
  -- Always the LATEST note/reason (set on every status change) — the full append-only history
  -- lives in enquiry_history below, added once `calls` exists (a history row can reference one).
  note TEXT,
  status ENUM('new', 'contacted', 'follow-up', 'converted', 'closed') NOT NULL DEFAULT 'new',
  -- Set the first time this lead gets a real client account — either via "Follow-up" (which also
  -- books a call) or "Converted" (account only). Lets a later transition know one already exists
  -- instead of creating a duplicate. NULL until then. FK added after `users` — already defined
  -- above — so this can reference it directly.
  converted_user_id VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_created_at (created_at),
  KEY idx_enquiries_converted_user (converted_user_id),
  CONSTRAINT fk_enquiries_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  -- Free text, not an ENUM (2026-08-22) — the Create Recipe form offers Breakfast/Lunch/Dinner/
  -- Snack plus a "Custom" option that reveals a text input; whatever the dietitian types is saved
  -- here as-is. Safe to relax from the original 4-value ENUM: confirmed the weekly plan builder
  -- never compares a recipe's meal_type to a plan_meals slot's own meal_type (that stays a fixed
  -- enum below, an independent concept — see the plan_meals comment).
  meal_type VARCHAR(50) NOT NULL,
  prep_time VARCHAR(100) NOT NULL,
  kcal INT NULL,
  protein INT NULL,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_recipes_meal_type (meal_type),
  CONSTRAINT fk_recipes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipe_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipe_id VARCHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  KEY idx_recipe_tags_recipe (recipe_id),
  CONSTRAINT fk_recipe_tags_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Weekly nourish plan',
  week DATE NOT NULL,
  week_end DATE NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_plans_client (client_id),
  KEY idx_plans_dietitian (dietitian_id),
  KEY idx_plans_week (week),
  KEY idx_plans_week_end (week_end),
  CONSTRAINT fk_plans_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plans_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `idx` preserves array position: plan.controller.js#updateMealStatus and the client's
-- plan.meals.indexOf(meal) both address a meal by its position in the array, so meals are always
-- read back ORDER BY idx. No id is exposed on meal rows in JSON (the original mealSlotSchema had
-- `{ _id: false }`, and the client never reads meal._id).
CREATE TABLE IF NOT EXISTS plan_meals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(36) NOT NULL,
  idx INT NOT NULL,
  day VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  meal_type ENUM('Breakfast', 'Lunch', 'Snack', 'Dinner') NOT NULL,
  recipe_id VARCHAR(36) NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  swap_requested BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  KEY idx_plan_meals_plan (plan_id, idx),
  KEY idx_plan_meals_recipe (recipe_id),
  CONSTRAINT fk_plan_meals_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_meals_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `reminder_minutes_before` (minutes, or NULL for none) drives the client's in-app pop-up
-- reminder — see client/src/hooks/useCallReminders.js.
CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  reminder_minutes_before INT NULL,
  -- Set the first time a still-`scheduled` call's `scheduled_at` changes (see call.controller.js#updateCall)
  -- so the client profile's call history can show a "Rescheduled" badge and the original time — a
  -- reschedule updates this same row in place rather than creating a new one, so without these two
  -- columns the fact "this call used to be at a different time" would be lost entirely.
  original_scheduled_at DATETIME(3) NULL,
  rescheduled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_calls_client (client_id),
  KEY idx_calls_dietitian (dietitian_id),
  KEY idx_calls_scheduled_at (scheduled_at),
  -- Lets the availability guard's `SELECT ... FOR UPDATE` range query (Call.js#lockOverlappingCalls)
  -- use a tight index range scan on (dietitian_id, scheduled_at) instead of falling back to
  -- idx_calls_dietitian alone, which would gap-lock every row for that dietitian regardless of
  -- scheduled_at — verified via EXPLAIN to cause real lock contention between unrelated bookings.
  KEY idx_calls_dietitian_scheduled (dietitian_id, scheduled_at),
  CONSTRAINT fk_calls_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only audit log: one row per status change, never overwritten or edited. `call_id` is
-- only ever set for a 'follow-up' entry that scheduled a real call — lets the pipeline UI show
-- "call booked" and link straight to it. No updated_at (matches report_feedback's existing
-- createdAt-only immutable-log pattern).
CREATE TABLE IF NOT EXISTS enquiry_history (
  id VARCHAR(36) PRIMARY KEY,
  enquiry_id VARCHAR(36) NOT NULL,
  status ENUM('new', 'contacted', 'follow-up', 'converted', 'closed') NOT NULL,
  note TEXT NULL,
  call_id VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_enquiry_history_enquiry (enquiry_id, created_at),
  CONSTRAINT fk_enquiry_history_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_history_call FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS progress (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(6, 2) NOT NULL,
  waist DECIMAL(6, 2) NULL,
  hip DECIMAL(6, 2) NULL,
  thigh DECIMAL(6, 2) NULL,
  upper_arm DECIMAL(6, 2) NULL,
  energy TINYINT NULL,
  adherence TINYINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_progress_client (client_id),
  KEY idx_progress_date (date),
  CONSTRAINT fk_progress_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  note TEXT,
  status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_reports_client (client_id),
  CONSTRAINT fk_reports_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- General client notes (spec §6, item 6) — deliberately separate from `calls.notes` (tied to one
-- specific call) and `reports.note` (tied to one specific report upload): this is free-standing
-- context about the client that isn't attached to any other record. Author-editable, admin can
-- edit/delete any note — see clientNote.controller.js.
CREATE TABLE IF NOT EXISTS client_notes (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_client_notes_client (client_id),
  CONSTRAINT fk_client_notes_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_client_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Client <-> assigned dietitian messaging (spec §1.5). Conversation identity is the
-- (client_id, dietitian_id) pair itself — no separate `conversations` row — and access control is
-- always re-derived from the *current* `users.assigned_dietitian_id` at request time (see
-- message.controller.js#resolveConversation), never trusted from a message row. So if a client is
-- reassigned to a different dietitian, their old thread becomes read-only history neither the old
-- nor new dietitian (nor the client, for that matter, since resolveConversation always uses the
-- client's *current* assignment) can address further — consistent with "a user must never read or
-- post to a conversation they aren't part of" applying to the present, not a point-in-time record.
-- `read_at` is a single column (not per-party) because each message has exactly one recipient in a
-- 1:1 thread — the sender never needs to "read" their own message.
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Covers both "give me this conversation in order" and the dietitian conversation list's
  -- per-client latest-message/unread lookups.
  KEY idx_messages_conversation (client_id, dietitian_id, created_at),
  KEY idx_messages_dietitian_unread (dietitian_id, client_id, read_at),
  CONSTRAINT fk_messages_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- id stays a real VARCHAR(36) (unlike plan_meals) because the client uses entry._id as a React
-- key (ReportCard.jsx, DietitianReportCard.jsx). createdAt-only, no updatedAt — matches the
-- original { timestamps: { createdAt: true, updatedAt: false } }.
CREATE TABLE IF NOT EXISTS report_feedback (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_report_feedback_report (report_id),
  CONSTRAINT fk_report_feedback_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_feedback_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Only `token_hash` (SHA-256 of the emailed token) is ever stored — never the plaintext token —
-- same principle as password_hash. `used_at` is set the moment a reset succeeds so the same link
-- can't be replayed even if it hasn't expired yet.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user (user_id),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A dietitian's recurring weekly template. One row per open weekday; a weekday with no row is
-- closed by default. If a dietitian has configured NO rows at all (true for every dietitian
-- before this feature shipped), the availability service treats them as unrestricted rather than
-- closed-all-week — see server/src/services/availability.js — so this table is opt-in and never
-- retroactively locks out an existing dietitian, matching the same principle already used for
-- users.must_change_password.
CREATE TABLE IF NOT EXISTS dietitian_weekly_hours (
  id VARCHAR(36) PRIMARY KEY,
  dietitian_id VARCHAR(36) NOT NULL,
  weekday TINYINT NOT NULL,        -- 0=Sunday..6=Saturday, matches JS Date#getUTCDay()
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_weekly_hours_dietitian_weekday (dietitian_id, weekday),
  CONSTRAINT fk_weekly_hours_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single generalized mechanism for every deviation from the weekly template: kind='closed' blocks
-- a range (a single date, a lunch-break time window, or a multi-day holiday/personal period are
-- all just the same shape at different spans); kind='open' grants time outside/instead of the
-- template (e.g. working hours on a normally-closed date). No update endpoint — the UI deletes and
-- recreates a row instead of editing one in place.
CREATE TABLE IF NOT EXISTS dietitian_availability_exceptions (
  id VARCHAR(36) PRIMARY KEY,
  dietitian_id VARCHAR(36) NOT NULL,
  start_at DATETIME(3) NOT NULL,
  end_at DATETIME(3) NOT NULL,
  kind ENUM('closed', 'open') NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_exceptions_dietitian_range (dietitian_id, start_at, end_at),
  CONSTRAINT fk_exceptions_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
