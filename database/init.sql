-- SellWizr Database Initialization Script
-- This script sets up the database and table structure for DBeaver

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS sellwizr
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Use the database
USE sellwizr;

-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS extracted_data;

-- Create the extracted_data table
-- Note: The actual columns will be created dynamically by the application
-- based on the HTML table structure. This is a base structure.
CREATE TABLE IF NOT EXISTS extracted_data (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Table for storing extracted HTML table data';

-- Show table structure
DESCRIBE extracted_data;

-- Show databases
SHOW DATABASES;

-- Verify table creation
SHOW TABLES;

-- Note: The application will automatically:
-- 1. Drop this table when it starts
-- 2. Recreate it with columns matching the HTML table structure
-- 3. Add columns like: country_name VARCHAR(255), population BIGINT, etc.
-- 
-- To see the actual structure after running the application, execute:
-- DESCRIBE extracted_data;
