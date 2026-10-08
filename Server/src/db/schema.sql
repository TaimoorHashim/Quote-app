CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  logo_url VARCHAR(500),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  quote_terms TEXT,
  next_quote_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  task_code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Labour',
  unit VARCHAR(20) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  min_qty DECIMAL(12,2),
  max_qty DECIMAL(12,2),
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rates_business_code (business_id, task_code),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  user_id INT NOT NULL,
  quote_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(150),
  project_name VARCHAR(150),
  project_address VARCHAR(255),
  quote_date DATE,
  notes TEXT,
  input_text TEXT,
  status ENUM('draft','in_review','completed','sent') NOT NULL DEFAULT 'draft',
  current_step TINYINT NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_quotes_business_number (business_id, quote_number),
  INDEX idx_quotes_list (business_id, status, created_at),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  rate_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_price DECIMAL(12,2) NULL,
  line_total DECIMAL(12,2) NULL,
  price_source ENUM('rate','manual') NULL,
  source ENUM('ai','manual') NOT NULL DEFAULT 'manual',
  confidence ENUM('high','medium','low') NULL,
  flagged TINYINT(1) NOT NULL DEFAULT 0,
  flag_reason VARCHAR(255),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (rate_id) REFERENCES rates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  model VARCHAR(100) NOT NULL,
  status ENUM('success','failed') NOT NULL,
  input_tokens INT,
  output_tokens INT,
  duration_ms INT,
  raw_output MEDIUMTEXT,
  error_message VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);