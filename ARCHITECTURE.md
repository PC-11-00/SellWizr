# Architecture & Design Document

## System Overview

This is a production-grade data pipeline that demonstrates the complete ETL (Extract, Transform, Load) process for HTML table data with modern streaming architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA PIPELINE FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  HTTP Client │  ← Fetches HTML from configurable URL
│  (Resilient) │  ← Retry logic with exponential backoff
└──────┬───────┘  ← Timeout & error handling
       │
       ▼
┌──────────────┐
│    Cheerio   │  ← Parses HTML DOM
│HTML Parser   │  ← Extracts <table> elements
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Schema     │  ← Analyzes all column values
│  Inference   │  ← Infers data types (INT, FLOAT, VARCHAR, DATE, etc.)
│    Engine    │  ← Generates column names from headers
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Kafka     │  ← Publishes rows as JSON messages
│   Producer   │  ← Idempotent writes (exactly-once semantics)
└──────┬───────┘  ← Batch publishing for efficiency
       │
       ▼
┌──────────────┐
│    Kafka     │  ← Distributed message queue
│    Broker    │  ← Decouples ingestion from persistence
└──────┬───────┘  ← Enables scalability & fault tolerance
       │
       ▼
┌──────────────┐
│    Kafka     │  ← Subscribes to topic
│   Consumer   │  ← Message buffering
└──────┬───────┘  ← Auto-commit with configurable interval
       │
       ▼
┌──────────────┐
│   Batch      │  ← Accumulates rows
│   Buffer     │  ← Configurable batch size
└──────┬───────┘  ← Periodic flush
       │
       ▼
┌──────────────┐
│    MySQL     │  ← Dynamic table creation
│   Database   │  ← Batch inserts (performance optimized)
└──────────────┘  ← Transaction management
```

## Component Details

### 1. HTTP Client Service (`httpClient.ts`)

**Responsibilities:**

- Fetch HTML content from any URL
- Handle network failures gracefully
- Implement retry logic with exponential backoff

**Key Features:**

- Configurable timeout (default: 10s)
- Configurable max retries (default: 3)
- Smart retry logic (retries only on retriable errors)
- Exponential backoff delay
- Custom User-Agent header

**Error Handling:**

- Network timeouts → Retry
- 5xx server errors → Retry
- 429 rate limit → Retry
- 4xx client errors → Fail immediately

### 2. Table Parser Service (`tableParser.ts`)

**Responsibilities:**

- Parse HTML and extract all tables
- Infer schema from table data
- Clean and normalize values

**Schema Inference Algorithm:**

1. Extract column headers from `<thead>` or first `<tr>`
2. Generate default headers if missing
3. Iterate through all data rows
4. For each column, analyze all values
5. Infer data type using pattern matching
6. Merge types (choose most general)
7. Calculate max length for VARCHAR columns

**Data Type Detection:**

```typescript
INT       → /^-?\d+$/ within 32-bit range
BIGINT    → /^-?\d+$/ outside 32-bit range
FLOAT     → /^-?\d+\.\d+$/
DATE      → YYYY-MM-DD, MM/DD/YYYY formats
TIMESTAMP → YYYY-MM-DD HH:MM:SS
BOOLEAN   → true/false, yes/no
VARCHAR   → length ≤ 255 chars
TEXT      → length > 255 chars
```

**Data Cleaning:**

- Removes reference markers `[1]`, `[a]`
- Normalizes whitespace
- Handles null/empty values
- Sanitizes column names (lowercase, underscores, valid SQL)

### 3. Kafka Producer Service (`kafkaProducer.ts`)

**Responsibilities:**

- Connect to Kafka cluster
- Publish table rows as messages
- Ensure idempotent writes

**Message Format (JSON):**

```json
{
  "schema": {
    "columns": [
      { "name": "country", "type": "VARCHAR", "maxLength": 255 },
      { "name": "population", "type": "BIGINT" }
    ]
  },
  "row": {
    "country": "United States",
    "population": 331000000
  },
  "timestamp": 1707955200000,
  "sourceUrl": "https://example.com/data"
}
```

**Features:**

- Idempotent producer (prevents duplicates)
- Batch publishing
- Automatic topic creation
- Retry on transient failures
- Message key generation for partitioning

### 4. Kafka Consumer Service (`kafkaConsumer.ts`)

**Responsibilities:**

- Subscribe to Kafka topic
- Buffer messages for batch processing
- Initialize database table on first message
- Write to database in batches

**Features:**

- Consumer group for parallel processing
- Auto-commit with configurable interval
- Message buffering (configurable batch size)
- Periodic flush (every 5 seconds)
- Graceful shutdown with buffer flush

**Processing Flow:**

1. Receive message from Kafka
2. Parse JSON payload
3. On first message: Create table from schema
4. Add row to buffer
5. When buffer reaches batch size: Flush to DB
6. Periodic flush timer: Flush remaining rows
7. On shutdown: Flush buffer

### 5. Database Service (`database.ts`)

**Responsibilities:**

- Connect to MySQL database
- Create database if not exists
- Dynamically create tables from schema
- Batch insert rows

**Table Creation:**

- Auto-increment `id` column (primary key)
- Columns based on inferred schema
- `created_at` timestamp column
- UTF8MB4 charset (supports emoji & international chars)
- InnoDB engine for ACID compliance

**SQL Type Mapping:**

```
INT       → INT
BIGINT    → BIGINT
FLOAT     → FLOAT
DATE      → DATE
TIMESTAMP → DATETIME
BOOLEAN   → BOOLEAN
VARCHAR   → VARCHAR(n)
TEXT      → TEXT
```

**Optimizations:**

- Batch inserts (reduces round trips)
- Prepared statements (prevents SQL injection)
- Connection pooling support
- Index on created_at for time-based queries

## Configuration Management

### Environment Variables (`.env`)

All configuration is externalized for easy deployment across environments:

```env
# Data Source
DATA_URL=<url>              # Source URL to scrape

# Kafka
KAFKA_BROKERS=<host:port>   # Kafka broker addresses
KAFKA_TOPIC=<topic>         # Topic name
KAFKA_CLIENT_ID=<id>        # Client identifier
KAFKA_GROUP_ID=<group>      # Consumer group

# Database
DB_HOST=<host>              # MySQL host
DB_PORT=<port>              # MySQL port
DB_USER=<user>              # MySQL username
DB_PASSWORD=<password>      # MySQL password
DB_NAME=<database>          # Database name
DB_TABLE_NAME=<table>       # Table name

# Performance
MAX_RETRIES=<n>             # HTTP retry attempts
RETRY_DELAY_MS=<ms>         # Retry delay
REQUEST_TIMEOUT_MS=<ms>     # HTTP timeout
BATCH_SIZE=<n>              # DB batch size
```

## Design Principles

### 1. Separation of Concerns

- Each service has a single responsibility
- Clear interfaces between components
- Easy to test and maintain

### 2. Resilience

- Retry logic for transient failures
- Graceful degradation
- Comprehensive error handling
- Graceful shutdown

### 3. Scalability

- Kafka enables horizontal scaling
- Multiple consumers can run in parallel
- Batch processing for efficiency
- Configurable performance tuning

### 4. Idempotency

- Producer uses idempotent writes
- Same data can be processed multiple times safely
- Important for fault tolerance

### 5. Observability

- Comprehensive logging at all stages
- Timestamps on all log entries
- Error stack traces
- Debug mode for detailed analysis

## Data Flow Example

### Input (HTML Table):

```html
<table>
  <thead>
    <tr>
      <th>Country</th>
      <th>Population</th>
      <th>GDP</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>United States</td>
      <td>331,900,000</td>
      <td>25.46</td>
    </tr>
  </tbody>
</table>
```

### Inferred Schema:

```json
{
  "columns": [
    { "name": "country", "type": "VARCHAR", "maxLength": 255 },
    { "name": "population", "type": "BIGINT" },
    { "name": "gdp", "type": "FLOAT" }
  ]
}
```

### Kafka Message:

```json
{
  "schema": {...},
  "row": {
    "country": "United States",
    "population": 331900000,
    "gdp": 25.46
  },
  "timestamp": 1707955200000,
  "sourceUrl": "https://..."
}
```

### MySQL Table:

```sql
CREATE TABLE extracted_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country VARCHAR(255),
  population BIGINT,
  gdp FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inserted Row:

```sql
INSERT INTO extracted_data (country, population, gdp)
VALUES ('United States', 331900000, 25.46);
```

## Performance Characteristics

### Throughput

- **HTTP Fetching**: Depends on network and source server
- **Parsing**: ~1000 rows/second (depends on complexity)
- **Kafka**: ~100K messages/second (single partition)
- **Database**: ~10K rows/second (batch inserts)

### Bottlenecks

1. **HTTP Fetching**: Network latency, source server rate limits
2. **Parsing**: Large HTML documents, complex tables
3. **Kafka**: Single partition limits parallelism
4. **Database**: Write throughput, index overhead

### Optimization Strategies

1. **Increase Kafka Partitions**: Enable parallel processing
2. **Tune Batch Size**: Balance memory vs. throughput
3. **Multiple Consumers**: Scale horizontally
4. **Database Indexing**: Only essential indexes
5. **Connection Pooling**: Reuse database connections

## Fault Tolerance

### Producer Failures

- Automatic reconnection
- Message buffering in Kafka
- Idempotent writes prevent duplicates

### Consumer Failures

- Consumer group rebalancing
- Kafka retains messages
- Buffer flushed before shutdown

### Database Failures

- Transactions ensure atomicity
- Failed batches can be retried
- Connection retry logic

## Security Considerations

### Current Implementation (Development)

- No authentication
- Plaintext communication
- Basic error handling

### Production Recommendations

1. **Kafka Security**
   - Enable SASL/SCRAM authentication
   - Use SSL/TLS for encryption
   - Configure ACLs for topic access

2. **Database Security**
   - Use SSL/TLS connections
   - Principle of least privilege
   - Encrypted credentials (vault)
   - Prepared statements (already implemented)

3. **HTTP Security**
   - Validate URLs
   - Rate limiting
   - Respect robots.txt
   - User-Agent identification

## Future Enhancements

1. **Schema Evolution**: Handle schema changes without dropping tables
2. **Dead Letter Queue**: Failed messages go to DLQ for analysis
3. **Metrics & Monitoring**: Prometheus, Grafana dashboards
4. **Data Validation**: Custom validation rules
5. **Multi-Table Support**: Process multiple tables per URL
6. **Incremental Updates**: Track processed data, only fetch new
7. **REST API**: Trigger scraping via API
8. **Web UI**: Monitor pipeline, view data
9. **Data Quality**: Anomaly detection, quality metrics
10. **Cloud Deployment**: Docker, Kubernetes, AWS/GCP/Azure

## Testing Strategy

### Unit Tests

- Test each service independently
- Mock external dependencies
- Test edge cases and error handling

### Integration Tests

- Test component interactions
- Use test containers for Kafka/MySQL
- Verify end-to-end flow

### Load Tests

- Measure throughput
- Identify bottlenecks
- Validate scalability

## Deployment

### Local Development

```bash
docker-compose up -d
npm run consumer &
npm run producer
```

### Production Deployment

1. Use managed Kafka (AWS MSK, Confluent Cloud)
2. Use managed MySQL (AWS RDS, GCP Cloud SQL)
3. Deploy as Docker containers
4. Use Kubernetes for orchestration
5. Configure monitoring & alerts
6. Set up CI/CD pipeline

## Monitoring & Alerting

### Key Metrics

- **Producer**: Messages sent/sec, errors
- **Consumer**: Messages consumed/sec, lag
- **Database**: Rows inserted/sec, connection pool
- **HTTP**: Request latency, error rate

### Alerts

- Kafka consumer lag > threshold
- Database connection failures
- HTTP fetch failures
- Memory/CPU usage high

## Conclusion

This pipeline demonstrates a robust, production-oriented architecture for web data extraction and storage. It follows best practices for distributed systems, including resilience, scalability, and observability. The modular design makes it easy to extend and customize for specific use cases.
