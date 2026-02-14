# Setup Verification Checklist

Use this checklist to verify your setup is correct and the pipeline is working.

## ✅ Prerequisites Check

### 1. Software Installed

- [ ] Node.js v20.15.1+ installed (`node --version`)
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)

### 2. Project Setup

- [ ] Dependencies installed (`npm install` completed)
- [ ] TypeScript compiled successfully (`npm run build`)
- [ ] `.env` file created from `.env.example` or `.env.docker`

## ✅ Infrastructure Setup

### Using Docker Compose (Recommended)

- [ ] Docker services started (`docker-compose up -d`)
- [ ] Zookeeper running (`docker-compose ps zookeeper`)
- [ ] Kafka running (`docker-compose ps kafka`)
- [ ] MySQL running (`docker-compose ps mysql`)
- [ ] Kafka UI accessible at http://localhost:8080

### Manual Setup

- [ ] Kafka running (`brew services list | grep kafka`)
- [ ] Zookeeper running (`brew services list | grep zookeeper`)
- [ ] MySQL running (`brew services list | grep mysql`)
- [ ] MySQL database created

## ✅ Configuration Check

- [ ] `.env` file exists
- [ ] `DATA_URL` is set to a valid URL
- [ ] `KAFKA_BROKERS` is set correctly (localhost:9092)
- [ ] `DB_HOST` is set correctly (localhost)
- [ ] `DB_PASSWORD` matches your MySQL password

## ✅ Pipeline Execution

### Test 1: Demo Mode (No Kafka/DB)

```bash
npm start
```

- [ ] HTML fetched successfully
- [ ] Tables parsed
- [ ] Schema inferred correctly
- [ ] Sample data displayed in logs

### Test 2: Producer

```bash
npm run producer
```

- [ ] Connected to Kafka
- [ ] HTML fetched from URL
- [ ] Tables parsed
- [ ] Schema inferred
- [ ] Messages sent to Kafka
- [ ] Producer completed successfully

### Test 3: Consumer

```bash
npm run consumer
```

- [ ] Connected to Kafka
- [ ] Connected to MySQL
- [ ] Table created in database
- [ ] Messages consumed from Kafka
- [ ] Data inserted into database
- [ ] Consumer running (doesn't exit)

## ✅ Verification Steps

### 1. Kafka Verification

**Using Kafka UI** (http://localhost:8080):

- [ ] Topic `html-table-data` exists
- [ ] Topic has messages
- [ ] Messages contain schema and row data

**Using CLI**:

```bash
# List topics
kafka-topics --list --bootstrap-server localhost:9092

# View messages
kafka-console-consumer --topic html-table-data --from-beginning --bootstrap-server localhost:9092 --max-messages 5
```

- [ ] Topic listed
- [ ] Messages displayed

### 2. Database Verification

```bash
# Connect to MySQL
docker exec -it mysql mysql -u root -prootpassword table_data

# Or if using local MySQL
mysql -u root -p table_data
```

Run these SQL commands:

```sql
-- Check table exists
SHOW TABLES;

-- View table structure
DESCRIBE extracted_data;

-- Count rows
SELECT COUNT(*) FROM extracted_data;

-- View sample data
SELECT * FROM extracted_data LIMIT 10;

-- View latest entries
SELECT * FROM extracted_data ORDER BY created_at DESC LIMIT 10;
```

- [ ] Table `extracted_data` exists
- [ ] Table has correct columns based on schema
- [ ] Rows exist in table
- [ ] Data looks correct

### 3. Logs Verification

**Producer logs should show**:

- [ ] "Fetching URL..."
- [ ] "Successfully fetched..."
- [ ] "Parsing HTML tables..."
- [ ] "Found X tables"
- [ ] "Sending rows to Kafka..."
- [ ] "Successfully sent X messages"
- [ ] "Producer completed successfully"

**Consumer logs should show**:

- [ ] "Connecting Kafka consumer..."
- [ ] "Kafka consumer connected successfully"
- [ ] "Connecting to MySQL database..."
- [ ] "Successfully connected to MySQL database"
- [ ] "Subscribing to topic: html-table-data"
- [ ] "Creating table: extracted_data"
- [ ] "Table extracted_data created successfully"
- [ ] "Flushing buffer with X messages"
- [ ] "Successfully flushed X messages"

## ✅ End-to-End Test

Complete workflow test:

1. **Start Services**

   ```bash
   docker-compose up -d
   ```

   - [ ] All services running

2. **Start Consumer**

   ```bash
   npm run consumer
   ```

   - [ ] Consumer started and waiting

3. **Run Producer**

   ```bash
   npm run producer
   ```

   - [ ] Producer completed successfully

4. **Verify in Kafka UI**
   - [ ] Open http://localhost:8080
   - [ ] Navigate to topic `html-table-data`
   - [ ] Messages visible

5. **Verify in Database**

   ```bash
   docker exec -it mysql mysql -u root -prootpassword -e "SELECT COUNT(*) FROM table_data.extracted_data"
   ```

   - [ ] Row count matches expected

6. **Stop Services**

   ```bash
   # Press Ctrl+C in consumer terminal
   docker-compose down
   ```

   - [ ] Consumer shut down gracefully
   - [ ] Services stopped

## ✅ Performance Test

Test with different batch sizes:

1. **Small Batch (10)**

   ```bash
   # In .env
   BATCH_SIZE=10
   ```

   - [ ] Works correctly
   - [ ] More frequent database writes

2. **Medium Batch (100)**

   ```bash
   # In .env
   BATCH_SIZE=100
   ```

   - [ ] Works correctly (default)

3. **Large Batch (1000)**

   ```bash
   # In .env
   BATCH_SIZE=1000
   ```

   - [ ] Works correctly
   - [ ] Fewer database writes

## ✅ Error Handling Test

### Test Network Failure

```bash
# In .env, use invalid URL
DATA_URL=http://invalid-url-that-does-not-exist.com
npm run producer
```

- [ ] Retries attempted
- [ ] Error logged clearly
- [ ] Producer fails gracefully

### Test Invalid Table

```bash
# In .env, use URL without tables
DATA_URL=https://google.com
npm run producer
```

- [ ] Warning logged: "No tables found"
- [ ] Producer completes gracefully

## ✅ Scalability Test

### Multiple Consumers

```bash
# Terminal 1
npm run consumer

# Terminal 2
npm run consumer

# Terminal 3
npm run producer
```

- [ ] Both consumers receive messages
- [ ] No duplicate inserts
- [ ] Data correctly distributed

## 🔧 Troubleshooting

### Issue: "Cannot connect to Kafka"

- [ ] Verify Kafka is running (`docker-compose ps`)
- [ ] Check `KAFKA_BROKERS` in `.env`
- [ ] Restart Kafka (`docker-compose restart kafka`)

### Issue: "Cannot connect to MySQL"

- [ ] Verify MySQL is running
- [ ] Check credentials in `.env`
- [ ] Test connection: `mysql -h localhost -u root -p`

### Issue: "No tables found in HTML"

- [ ] Verify URL is accessible in browser
- [ ] Check if page has `<table>` elements
- [ ] Try a different URL (e.g., Wikipedia page)

### Issue: TypeScript compilation errors

- [ ] Run `npm install` again
- [ ] Delete `node_modules` and `package-lock.json`, then `npm install`
- [ ] Check TypeScript version (`npx tsc --version`)

### Issue: Consumer not receiving messages

- [ ] Verify producer ran successfully
- [ ] Check Kafka UI for messages
- [ ] Verify topic name matches in producer and consumer
- [ ] Restart consumer

## ✅ Final Checklist

Before considering setup complete:

- [ ] All prerequisites installed
- [ ] Docker services running
- [ ] Configuration correct
- [ ] Producer runs successfully
- [ ] Consumer runs successfully
- [ ] Data visible in Kafka
- [ ] Data visible in MySQL
- [ ] Logs show no errors
- [ ] End-to-end test passed
- [ ] Documentation reviewed

## 🎉 Success!

If all items are checked, your HTML Table Data Pipeline is fully operational!

## 📚 Next Steps

1. Try different URLs with HTML tables
2. Experiment with different batch sizes
3. Run multiple consumers for scalability
4. Explore the codebase
5. Customize for your use case
6. Read ARCHITECTURE.md for design details

---

**Having issues?** Check the logs carefully - they contain detailed information about what's happening at each step.
