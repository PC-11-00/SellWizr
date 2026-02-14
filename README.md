# HTML Table Data Pipeline

A robust, production-oriented data pipeline that extracts data from HTML tables, streams it through Kafka, and stores it in a MySQL database with automatic schema inference.

## 🌟 Features

- **Automatic Data Fetching**: Fetch HTML content from any URL with built-in retry logic and timeout handling
- **Intelligent HTML Parsing**: Extract tables from HTML with automatic schema inference
- **Smart Type Detection**: Automatically infer data types (INT, BIGINT, FLOAT, VARCHAR, TEXT, DATE, TIMESTAMP, BOOLEAN)
- **Kafka Integration**: Decouple data ingestion from persistence using Kafka streaming
- **Idempotent Operations**: Ensures reliable message processing
- **Batch Processing**: Efficient batch inserts to database
- **Production Ready**: Comprehensive error handling, logging, and graceful shutdown

## 📋 System Architecture

```
┌─────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  HTML Page  │────▶│ Producer │────▶│   Kafka   │────▶│ Consumer │
└─────────────┘     └──────────┘     └───────────┘     └──────────┘
                         │                                    │
                         │                                    ▼
                         │                              ┌──────────┐
                         └─────────Schema Inference────▶│  MySQL   │
                                                        └──────────┘
```

## 🔧 Prerequisites

- **Node.js**: v20.15.1 or higher
- **Apache Kafka**: Running locally or remotely
- **MySQL**: v5.7 or higher (or compatible database)

## 📦 Installation

1. Clone the repository:

```bash
cd /path/to/SellWizr
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Data Source
DATA_URL=https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=html-table-data
KAFKA_CLIENT_ID=html-table-scraper
KAFKA_GROUP_ID=table-consumer-group

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=table_data
DB_TABLE_NAME=extracted_data

# Performance Tuning
MAX_RETRIES=3
RETRY_DELAY_MS=1000
REQUEST_TIMEOUT_MS=10000
BATCH_SIZE=100
```

## 🚀 Quick Start

### Setting Up Kafka (macOS)

```bash
# Install Kafka using Homebrew
brew install kafka

# Start Zookeeper
brew services start zookeeper

# Start Kafka
brew services start kafka

# Create topic (optional - will be auto-created)
kafka-topics --create --topic html-table-data --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

### Setting Up MySQL

```bash
# Install MySQL using Homebrew
brew install mysql

# Start MySQL
brew services start mysql

# Secure installation (optional but recommended)
mysql_secure_installation

# Create database (or let the app auto-create it)
mysql -u root -p
CREATE DATABASE table_data;
```

### Running the Pipeline

**Option 1: Run Producer and Consumer Separately (Recommended)**

```bash
# Terminal 1: Start the consumer (runs continuously)
npm run consumer

# Terminal 2: Start the producer (runs once)
npm run producer
```

**Option 2: Test/Demo Mode**

```bash
# Just test fetching and parsing (no Kafka/DB)
npm start
```

## 📊 Usage Examples

### Example 1: Wikipedia Table

```bash
# Set in .env
DATA_URL=https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)

# Run producer
npm run producer
```

### Example 2: Any HTML Table

You can use any URL with HTML tables. The system will:

1. Fetch the HTML
2. Parse all `<table>` elements
3. Use the first table (or configure to select specific table)
4. Infer the schema automatically
5. Stream data through Kafka
6. Store in MySQL

## 🏗️ Project Structure

```
SellWizr/
├── src/
│   ├── config.ts                     # Configuration management
│   ├── index.ts                      # Demo/test entry point
│   ├── producer.ts                   # Producer entry point
│   ├── consumer.ts                   # Consumer entry point
│   │
│   ├── controllers/                  # Application controllers
│   │   ├── producer.controller.ts    # Producer orchestration
│   │   └── consumer.controller.ts    # Consumer orchestration
│   │
│   ├── services/                     # Business logic services
│   │   ├── base/
│   │   │   └── base.service.ts      # Base class for all services
│   │   ├── http.service.ts          # HTTP client with retry logic
│   │   ├── parser.service.ts        # HTML table parser + schema inference
│   │   └── database.service.ts      # MySQL database operations
│   │
│   ├── messaging/                    # Kafka messaging layer
│   │   ├── base/
│   │   │   └── base.kafka.ts        # Base class for Kafka clients
│   │   ├── kafka.producer.ts        # Kafka producer service
│   │   └── kafka.consumer.ts        # Kafka consumer service
│   │
│   ├── models/                       # Data models and types
│   │   ├── schema.model.ts          # Schema and table models
│   │   └── kafka.model.ts           # Kafka message models
│   │
│   └── utils/                        # Utility functions
│       └── logger.ts                # Logging utility
│
├── dist/                             # Compiled JavaScript
├── .env                              # Environment configuration
├── .env.example                      # Example environment file
├── package.json                      # NPM dependencies
├── tsconfig.json                     # TypeScript configuration
├── docker-compose.yml                # Docker services
├── README.md                         # Main documentation
├── REFACTORED_ARCHITECTURE.md        # New architecture details
└── Other documentation files...
```

**New Architecture**: The project now follows a clean layered architecture with:

- **Controllers**: Orchestrate the flow between services
- **Services**: Encapsulate business logic (extend BaseService)
- **Messaging**: Handle Kafka communication (extend BaseKafka)
- **Models**: Define data structures and types

See [REFACTORED_ARCHITECTURE.md](REFACTORED_ARCHITECTURE.md) for detailed architecture documentation.

## 🔍 How It Works

### 1. Data Fetching (HttpService)

- Extends BaseService for lifecycle management
- Configurable retry mechanism with exponential backoff
- Timeout handling
- Network failure resilience
- Retriable vs non-retriable error detection

### 2. Table Parsing (ParserService)

- Extends BaseService for lifecycle management
- Extracts all `<table>` elements from HTML
- Handles various table structures (with/without `<thead>`, `<tbody>`)
- Cleans data (removes reference markers, extra whitespace)
- Generates column names if headers are missing

### 3. Schema Inference

Automatically detects:

- **INT**: Whole numbers (within 32-bit range)
- **BIGINT**: Large whole numbers
- **FLOAT**: Decimal numbers
- **DATE**: Date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
- **TIMESTAMP**: Date with time
- **BOOLEAN**: true/false, yes/no
- **VARCHAR**: Short strings (≤255 chars)
- **TEXT**: Long strings (>255 chars)

### 4. Kafka Streaming

- **Producer**: Extends BaseKafka, sends extracted rows as JSON messages
- **Consumer**: Extends BaseKafka, receives messages, buffers them, and batch inserts to DB
- Idempotent producer ensures no duplicates
- Configurable batch size for optimal performance

### 5. Database Storage

- Auto-creates database if it doesn't exist
- Dynamically creates table based on inferred schema
- Batch inserts for performance
- Adds auto-increment ID and timestamp columns

## ⚙️ Configuration

### Environment Variables

| Variable             | Description                   | Default                  |
| -------------------- | ----------------------------- | ------------------------ |
| `DATA_URL`           | URL to fetch HTML from        | Wikipedia countries page |
| `KAFKA_BROKERS`      | Comma-separated Kafka brokers | localhost:9092           |
| `KAFKA_TOPIC`        | Kafka topic name              | html-table-data          |
| `KAFKA_CLIENT_ID`    | Kafka client identifier       | html-table-scraper       |
| `KAFKA_GROUP_ID`     | Consumer group ID             | table-consumer-group     |
| `DB_HOST`            | MySQL host                    | localhost                |
| `DB_PORT`            | MySQL port                    | 3306                     |
| `DB_USER`            | MySQL username                | root                     |
| `DB_PASSWORD`        | MySQL password                | (empty)                  |
| `DB_NAME`            | Database name                 | table_data               |
| `DB_TABLE_NAME`      | Table name for data           | extracted_data           |
| `MAX_RETRIES`        | Max HTTP retry attempts       | 3                        |
| `RETRY_DELAY_MS`     | Base retry delay              | 1000                     |
| `REQUEST_TIMEOUT_MS` | HTTP timeout                  | 10000                    |
| `BATCH_SIZE`         | DB batch insert size          | 100                      |

## 🧪 Testing

### Test the HTTP Client

```bash
# Run the demo to test fetching and parsing
npm start
```

### Test Kafka Connection

```bash
# List topics
kafka-topics --list --bootstrap-server localhost:9092

# Monitor messages
kafka-console-consumer --topic html-table-data --from-beginning --bootstrap-server localhost:9092
```

### Test Database

```bash
# Connect to MySQL
mysql -u root -p

# Use database
USE table_data;

# View data
SELECT * FROM extracted_data LIMIT 10;

# Check row count
SELECT COUNT(*) FROM extracted_data;
```

## 📈 Performance Tuning

1. **Batch Size**: Adjust `BATCH_SIZE` in `.env`
   - Larger batches = faster inserts but more memory
   - Recommended: 100-1000 for typical use cases

2. **Kafka Partitions**: Increase for parallel processing

   ```bash
   kafka-topics --alter --topic html-table-data --partitions 4 --bootstrap-server localhost:9092
   ```

3. **Consumer Instances**: Run multiple consumers for scalability

   ```bash
   # Terminal 1
   npm run consumer

   # Terminal 2
   npm run consumer
   ```

## 🛡️ Error Handling

The system handles various failure scenarios:

- **Network Errors**: Automatic retry with exponential backoff
- **Invalid HTML**: Graceful error logging, continues with other tables
- **Kafka Failures**: Built-in retry mechanism
- **Database Errors**: Transaction rollback, detailed error logging
- **Schema Mismatches**: Type promotion to handle diverse data

## 🔄 Graceful Shutdown

Both producer and consumer support graceful shutdown:

```bash
# Press Ctrl+C
# The system will:
# 1. Flush remaining messages
# 2. Close Kafka connections
# 3. Close database connections
# 4. Exit cleanly
```

## 📝 Logging

All operations are logged with timestamps:

- **INFO**: Normal operations
- **WARN**: Retries, non-critical issues
- **ERROR**: Failures with stack traces
- **DEBUG**: Detailed debug information

## 🚧 Production Considerations

1. **Schema Evolution**: Currently drops/recreates tables. Implement migrations for production.
2. **Dead Letter Queue**: Add DLQ for failed message processing
3. **Monitoring**: Integrate with monitoring tools (Prometheus, Grafana)
4. **Authentication**: Add Kafka SASL/SSL and MySQL SSL
5. **Rate Limiting**: Implement for respectful web scraping
6. **Data Validation**: Add custom validation rules for specific use cases

## 🤝 Contributing

Contributions are welcome! Please ensure:

- Code follows TypeScript best practices
- Add appropriate error handling
- Update documentation for new features

## 📄 License

ISC

## 🙋 Support

For issues or questions:

1. Check the logs for detailed error messages
2. Verify Kafka and MySQL are running
3. Ensure `.env` is properly configured
4. Check network connectivity for URL fetching

## 🎯 Example URLs to Try

- [Wikipedia - Countries by Population](<https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)>)
- [Wikipedia - Fortune 500](https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue)
- [Wikipedia - Chemical Elements](https://en.wikipedia.org/wiki/List_of_chemical_elements)
- Any webpage with HTML `<table>` elements!
