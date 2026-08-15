-- Nourishly MySQL schema.
-- Every user-facing entity uses a VARCHAR(36) id (app-generated UUID, see src/db/id.js) so
-- foreign keys stay plain string comparisons — matching how req.user.id / String(x) comparisons
-- already work throughout the controllers. The two purely-internal join tables (recipe_tags,
-- plan_meals) use AUTO_INCREMENT instead, since their own id is never sent to the client.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'dietitian', 'admin') NOT NULL DEFAULT 'client',
  phone VARCHAR(50),
  assigned_dietitian_id VARCHAR(36) NULL,
  refresh_token_version INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_assigned_dietitian (assigned_dietitian_id),
  CONSTRAINT fk_users_assigned_dietitian FOREIGN KEY (assigned_dietitian_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(36) PRIMARY KEY,
  goal VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  preferred_slot VARCHAR(255),
  note TEXT,
  status ENUM('new', 'contacted', 'follow-up', 'converted', 'closed') NOT NULL DEFAULT 'new',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  meal_type ENUM('Breakfast', 'Lunch', 'Snack', 'Dinner') NOT NULL,
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
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_plans_client (client_id),
  KEY idx_plans_dietitian (dietitian_id),
  KEY idx_plans_week (week),
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
  KEY idx_plan_meals_plan (plan_id, idx),
  KEY idx_plan_meals_recipe (recipe_id),
  CONSTRAINT fk_plan_meals_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_meals_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_calls_client (client_id),
  KEY idx_calls_dietitian (dietitian_id),
  KEY idx_calls_scheduled_at (scheduled_at),
  CONSTRAINT fk_calls_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS progress (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(6, 2) NOT NULL,
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
