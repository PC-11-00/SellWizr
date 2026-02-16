# Database Setup Guide for DBeaver

This guide will help you set up the MySQL database for SellWizr using DBeaver.

## Prerequisites

- DBeaver installed
- MySQL server running (via Docker Compose or local installation)
- MySQL credentials from your `.env` file

## Connection Details

Based on the default configuration:

- **Host**: `localhost`
- **Port**: `3306`
- **Database**: `sellwizr`
- **Username**: `root`
- **Password**: Check your `.env` file or use `your_password` (Docker default)

## Setup Steps

### Option 1: Using DBeaver GUI

1. **Create New Connection**
   - Click `Database` → `New Database Connection`
   - Select `MySQL`
   - Click `Next`

2. **Configure Connection**
   - **Host**: `localhost`
   - **Port**: `3306`
   - **Database**: `sellwizr` (or leave empty to create it)
   - **Username**: `root`
   - **Password**: Your MySQL password
   - Click `Test Connection` to verify
   - Click `Finish`

3. **Create Database** (if it doesn't exist)
   - Right-click on the connection
   - Select `SQL Editor` → `New SQL Script`
   - Paste and execute:
     ```sql
     CREATE DATABASE IF NOT EXISTS sellwizr
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci;
     ```

4. **Verify Setup**
   - Refresh the connection
   - Expand `Databases` → `sellwizr`
   - You should see the database

### Option 2: Using SQL Script

1. **Open Connection** in DBeaver
2. **Open SQL Script**
   - Click `SQL Editor` → `Open SQL Script`
   - Navigate to `database/init.sql`
   - Click `Execute` (or press `Ctrl+Enter` on Windows/Linux, `Cmd+Return` on macOS)

3. **Verify**
   - Check the results panel for successful execution
   - Refresh the database tree to see `sellwizr` database

### Option 3: Run Application (Automatic Setup)

The application will automatically:

1. Create the database if it doesn't exist
2. Create the table with proper schema based on the HTML table structure
3. No manual setup needed!

Just run:

```bash
npm run producer
```

The `DatabaseService` will handle everything automatically.

## Viewing Data After Scraping

After running the producer and consumer:

1. **Refresh Database** in DBeaver
2. **Navigate** to `sellwizr` → `Tables` → `extracted_data`
3. **View Data**:
   - Right-click table → `View Data`
   - Or run: `SELECT * FROM extracted_data;`

## Table Structure

The table structure is **dynamically created** based on the HTML table being scraped.

Example structure after scraping a countries table:

```sql
CREATE TABLE extracted_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  Country VARCHAR(255),
  Population BIGINT,
  Area_km2 FLOAT,
  Density FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);
```

## Useful SQL Queries

### View all data

```sql
SELECT * FROM extracted_data ORDER BY created_at DESC;
```

### Count total rows

```sql
SELECT COUNT(*) as total_rows FROM extracted_data;
```

### View table structure

```sql
DESCRIBE extracted_data;
```

### View recent entries

```sql
SELECT * FROM extracted_data ORDER BY created_at DESC LIMIT 10;
```

### Clear all data (keep structure)

```sql
TRUNCATE TABLE extracted_data;
```

### Drop and recreate

```sql
DROP TABLE IF EXISTS extracted_data;
-- Run the application to recreate with proper schema
```

## Docker Compose Database

If using the provided `docker-compose.yml`:

- **Container**: `sellwizr-mysql`
- **Port**: `3306` (mapped to host)
- **Root Password**: `rootpassword` (from docker-compose)
- **Data Volume**: `mysql_data` (persists between restarts)

To connect to Docker MySQL:

1. Ensure Docker Compose is running: `docker-compose up -d`
2. Use connection details above
3. Password: `rootpassword` (or check your `.env.docker` file)

## Troubleshooting

### Cannot Connect

- Verify MySQL is running: `docker-compose ps`
- Check port 3306 is not blocked
- Verify credentials in `.env` file

### Database Not Found

- Run the application once to auto-create
- Or manually create using SQL script

### Table Empty

- Ensure consumer is running: `npm run consumer`
- Check Kafka for messages: `docker exec -it sellwizr-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic html-table-data --from-beginning`

### Permission Denied

- Check MySQL user permissions
- Grant privileges if needed:
  ```sql
  GRANT ALL PRIVILEGES ON sellwizr.* TO 'root'@'%';
  FLUSH PRIVILEGES;
  ```

## Environment Variables

Make sure your `.env` file has correct database settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sellwizr
DB_TABLE_NAME=extracted_data
```

## Next Steps

1. Set up DBeaver connection
2. Run Docker Compose: `docker-compose up -d`
3. Start producer: `npm run producer`
4. Start consumer: `npm run consumer`
5. View data in DBeaver!
