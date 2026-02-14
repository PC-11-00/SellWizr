# Quick Start Guide

## Using Docker Compose (Easiest Method)

### 1. Start Kafka and MySQL

```bash
docker-compose up -d
```

This will start:

- Zookeeper (port 2181)
- Kafka (port 9092)
- MySQL (port 3306)
- Kafka UI (port 8080) - Optional monitoring tool

### 2. Verify Services are Running

```bash
docker-compose ps
```

You should see all services in "Up" state.

### 3. Configure Environment

```bash
cp .env.docker .env
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Pipeline

**Terminal 1 - Start Consumer:**

```bash
npm run consumer
```

**Terminal 2 - Run Producer:**

```bash
npm run producer
```

### 6. Verify Data

**Check Kafka Messages:**

- Open browser: http://localhost:8080
- Navigate to Topics → html-table-data
- View messages

**Check Database:**

```bash
docker exec -it mysql mysql -u root -prootpassword table_data
```

Then run:

```sql
SELECT * FROM extracted_data LIMIT 10;
SELECT COUNT(*) FROM extracted_data;
```

### 7. Stop Services

```bash
docker-compose down
```

To remove all data:

```bash
docker-compose down -v
```

## Manual Setup (Without Docker)

### 1. Install Kafka (macOS)

```bash
brew install kafka
brew services start zookeeper
brew services start kafka
```

### 2. Install MySQL (macOS)

```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

### 3. Create Database

```bash
mysql -u root -p
CREATE DATABASE table_data;
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 5. Run the Pipeline

```bash
# Terminal 1
npm run consumer

# Terminal 2
npm run producer
```

## Testing Different URLs

Edit `.env` and change `DATA_URL`:

```env
# Countries by population
DATA_URL=https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)

# Fortune 500 companies
DATA_URL=https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue

# Chemical elements
DATA_URL=https://en.wikipedia.org/wiki/List_of_chemical_elements
```

Then run the producer again:

```bash
npm run producer
```

## Troubleshooting

### Kafka Connection Error

```bash
# Check if Kafka is running
docker-compose ps kafka

# View Kafka logs
docker-compose logs kafka
```

### MySQL Connection Error

```bash
# Check if MySQL is running
docker-compose ps mysql

# View MySQL logs
docker-compose logs mysql
```

### No Tables Found

- Check if the URL is accessible
- Verify the page has HTML `<table>` elements
- Check logs: `npm run producer`

### Consumer Not Receiving Messages

- Ensure producer ran successfully
- Check Kafka UI: http://localhost:8080
- Verify topic exists and has messages
- Check consumer logs

## Next Steps

1. **Monitor with Kafka UI**: http://localhost:8080
2. **Query Database**: See data in MySQL
3. **Try Different URLs**: Test various HTML tables
4. **Scale Up**: Run multiple consumers
5. **Customize**: Modify parser or schema inference logic

## Development

Run in development mode with auto-reload:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Run compiled code:

```bash
npm start
```
