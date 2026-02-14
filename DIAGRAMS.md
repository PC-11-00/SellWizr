# System Diagrams

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          HTML TABLE DATA PIPELINE                       │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Internet  │
                              │  HTML Page  │
                              └──────┬──────┘
                                     │
                                     │ HTTP GET
                                     ▼
                              ┌─────────────┐
                              │  PRODUCER   │
                              │   PROCESS   │
                              └─────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       ┌────────────┐        ┌────────────┐        ┌────────────┐
       │   HTTP     │        │   Table    │        │   Schema   │
       │  Client    │───────▶│   Parser   │───────▶│  Inference │
       │  (Retry)   │        │ (Cheerio)  │        │   Engine   │
       └────────────┘        └────────────┘        └─────┬──────┘
                                                          │
                                                          │ JSON
                                                          ▼
                                                   ┌────────────┐
                                                   │   Kafka    │
                                                   │  Producer  │
                                                   └─────┬──────┘
                                                         │
                                                         │ Publish
                                                         ▼
                                                   ╔════════════╗
                                                   ║   KAFKA    ║
                                                   ║   BROKER   ║
                                                   ║   CLUSTER  ║
                                                   ╚═════┬══════╝
                                                         │
                                                         │ Subscribe
                                                         ▼
                                                   ┌────────────┐
                                                   │   Kafka    │
                                                   │  Consumer  │
                                                   └─────┬──────┘
                                                         │
              ┌──────────────────────┬───────────────────┤
              │                      │                   │
              ▼                      ▼                   ▼
       ┌────────────┐        ┌────────────┐     ┌────────────┐
       │  Message   │        │   Buffer   │     │   Batch    │
       │  Parsing   │───────▶│   Manager  │────▶│  Processor │
       └────────────┘        └────────────┘     └─────┬──────┘
                                                       │
                                                       │ Batch INSERT
                                                       ▼
                                                 ┌────────────┐
                                                 │   MYSQL    │
                                                 │  DATABASE  │
                                                 └────────────┘
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         DATA TRANSFORMATION                      │
└──────────────────────────────────────────────────────────────────┘

1. RAW HTML
   ┌─────────────────────────────────────────────┐
   │ <table>                                     │
   │   <tr><th>Name</th><th>Age</th></tr>       │
   │   <tr><td>John</td><td>30</td></tr>        │
   │ </table>                                    │
   └─────────────────────────────────────────────┘
                      │
                      │ Parse
                      ▼
2. PARSED TABLE
   ┌─────────────────────────────────────────────┐
   │ Headers: ["Name", "Age"]                    │
   │ Rows: [["John", "30"]]                      │
   └─────────────────────────────────────────────┘
                      │
                      │ Infer Schema
                      ▼
3. SCHEMA
   ┌─────────────────────────────────────────────┐
   │ {                                           │
   │   columns: [                                │
   │     { name: "name", type: "VARCHAR" },      │
   │     { name: "age", type: "INT" }            │
   │   ]                                         │
   │ }                                           │
   └─────────────────────────────────────────────┘
                      │
                      │ Convert Values
                      ▼
4. TYPED ROWS
   ┌─────────────────────────────────────────────┐
   │ [                                           │
   │   { name: "John", age: 30 }                 │
   │ ]                                           │
   └─────────────────────────────────────────────┘
                      │
                      │ Serialize
                      ▼
5. KAFKA MESSAGE
   ┌─────────────────────────────────────────────┐
   │ {                                           │
   │   schema: {...},                            │
   │   row: { name: "John", age: 30 },           │
   │   timestamp: 1707955200000,                 │
   │   sourceUrl: "https://..."                  │
   │ }                                           │
   └─────────────────────────────────────────────┘
                      │
                      │ Deserialize
                      ▼
6. DATABASE INSERT
   ┌─────────────────────────────────────────────┐
   │ INSERT INTO extracted_data                  │
   │   (name, age)                               │
   │ VALUES                                      │
   │   ('John', 30)                              │
   └─────────────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT INTERACTIONS                       │
└─────────────────────────────────────────────────────────────────┘

╔══════════════╗
║   PRODUCER   ║
╚══════════════╝
      │
      ├─────[1. read config]────────▶ Config (.env)
      │
      ├─────[2. fetch HTML]─────────▶ HttpClient
      │                                    │
      │                                    ├─[retry logic]
      │                                    ├─[timeout handling]
      │                                    └─[error handling]
      │
      ├─────[3. parse HTML]─────────▶ TableParser
      │                                    │
      │                                    ├─[extract tables]
      │                                    ├─[clean data]
      │                                    └─[infer schema]
      │
      ├─────[4. connect Kafka]─────▶ KafkaProducer
      │                                    │
      │                                    └─[idempotent writes]
      │
      └─────[5. send messages]─────▶ Kafka Broker
                                           │
                                           │
╔══════════════╗                           │
║   CONSUMER   ║                           │
╚══════════════╝                           │
      │                                    │
      ├─────[1. read config]────────▶ Config (.env)
      │                                    │
      ├─────[2. connect Kafka]─────▶ KafkaConsumer
      │                                    │
      │                                    ├─[subscribe topic]
      │                                    ├─[consumer group]
      │                                    └─[auto-commit]
      │                                    │
      ├─────[3. receive messages]◀────────┘
      │                │
      │                ├─[buffer messages]
      │                └─[batch processing]
      │
      ├─────[4. connect DB]────────▶ DatabaseService
      │                                    │
      │                                    ├─[create database]
      │                                    ├─[create table]
      │                                    └─[connection pool]
      │
      └─────[5. batch insert]──────▶ MySQL Database
```

## Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEQUENCE DIAGRAM                           │
└─────────────────────────────────────────────────────────────────┘

User    Producer   HttpClient  Parser  KafkaProd  Kafka  Consumer  Database
 │         │           │         │         │        │       │         │
 │  start  │           │         │         │        │       │         │
 ├────────▶│           │         │         │        │       │         │
 │         │  fetch    │         │         │        │       │         │
 │         ├──────────▶│         │         │        │       │         │
 │         │           │  GET    │         │        │       │         │
 │         │           ├───────▶ HTTP     │        │       │         │
 │         │           │◀───────┘         │        │       │         │
 │         │  HTML     │         │         │        │       │         │
 │         │◀──────────┤         │         │        │       │         │
 │         │  parse    │         │         │        │       │         │
 │         ├─────────────────────▶│        │        │       │         │
 │         │           │  schema+rows     │        │       │         │
 │         │◀─────────────────────┤        │        │       │         │
 │         │  connect  │         │         │        │       │         │
 │         ├────────────────────────────────▶       │       │         │
 │         │           │         │  connected       │       │         │
 │         │◀────────────────────────────────┤       │       │         │
 │         │  send batch        │         │        │       │         │
 │         ├────────────────────────────────▶       │       │         │
 │         │           │         │         │  messages     │         │
 │         │           │         │         ├───────▶│       │         │
 │         │           │         │  ack    │        │       │         │
 │         │◀────────────────────────────────┤       │       │         │
 │         │           │         │         │        │       │         │
 │ done    │           │         │         │        │  consume       │
 │◀────────┤           │         │         │        ├───────▶│        │
 │         │           │         │         │        │  messages      │
 │         │           │         │         │        │◀───────┤        │
 │         │           │         │         │        │  parse │        │
 │         │           │         │         │        │  buffer│        │
 │         │           │         │         │        │  create│        │
 │         │           │         │         │        │  table │        │
 │         │           │         │         │        ├────────────────▶│
 │         │           │         │         │        │        │  created
 │         │           │         │         │        │◀────────────────┤
 │         │           │         │         │        │  insert│        │
 │         │           │         │         │        │  batch │        │
 │         │           │         │         │        ├────────────────▶│
 │         │           │         │         │        │        │  inserted
 │         │           │         │         │        │◀────────────────┤
 │         │           │         │         │        │  commit│        │
 │         │           │         │         │        │        │        │
```

## State Diagram - Consumer

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONSUMER STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  START   │
                    └────┬─────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ CONNECTING  │
                  │   KAFKA     │
                  └──────┬──────┘
                         │
                   [connected]
                         │
                         ▼
                  ┌─────────────┐
                  │ CONNECTING  │
                  │  DATABASE   │
                  └──────┬──────┘
                         │
                   [connected]
                         │
                         ▼
                  ┌─────────────┐
            ┌────▶│   WAITING   │
            │     │ FOR MESSAGE │
            │     └──────┬──────┘
            │            │
            │      [message received]
            │            │
            │            ▼
            │     ┌─────────────┐        ┌─────────────┐
            │     │  PARSING    │───────▶│   ERROR     │
            │     │   MESSAGE   │ [error]│  HANDLING   │
            │     └──────┬──────┘        └─────────────┘
            │            │
            │      [parsed successfully]
            │            │
            │            ▼
            │     ┌─────────────┐
            │     │  BUFFERING  │
            │     │    ROWS     │
            │     └──────┬──────┘
            │            │
            │            ├─[buffer < batch size]
            │            │
            └────────────┘
                         │
                   [buffer >= batch size]
                         │
                         ▼
                  ┌─────────────┐
                  │  FLUSHING   │
                  │  TO DATABASE│
                  └──────┬──────┘
                         │
                   [flushed]
                         │
                         └────────┐
                                  │
                         ┌────────┘
                         │
                   [SIGINT/SIGTERM]
                         │
                         ▼
                  ┌─────────────┐
                  │  SHUTTING   │
                  │    DOWN     │
                  └──────┬──────┘
                         │
                   [cleanup done]
                         │
                         ▼
                    ┌─────────┐
                    │  STOPPED│
                    └─────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                          │
└─────────────────────────────────────────────────────────────────┘

HTTP Request Error
       │
       ├─[Network Error]────────────┐
       │                            │
       ├─[Timeout]──────────────────┤
       │                            │
       ├─[5xx Server Error]─────────┤
       │                            │
       ├─[429 Rate Limit]───────────┤
       │                            │
       │                            ▼
       │                    ┌──────────────┐
       │                    │    RETRY     │
       │                    │  (backoff)   │
       │                    └──────┬───────┘
       │                           │
       │                     [max retries]
       │                           │
       │                           ▼
       │                    ┌──────────────┐
       ├─[4xx Client Error]─▶│    FAIL     │
       │                    │   (throw)    │
       └────────────────────▶└──────────────┘

Kafka Error
       │
       ├─[Connection Error]─────────┐
       │                            │
       ├─[Send Error]───────────────┤
       │                            │
       │                            ▼
       │                    ┌──────────────┐
       │                    │  AUTO RETRY  │
       │                    │  (KafkaJS)   │
       │                    └──────┬───────┘
       │                           │
       │                     [max retries]
       │                           │
       │                           ▼
       └─[Unrecoverable]───▶┌──────────────┐
                            │    FAIL      │
                            │   (throw)    │
                            └──────────────┘

Database Error
       │
       ├─[Connection Error]─────────┐
       │                            │
       ├─[Query Error]──────────────┤
       │                            │
       │                            ▼
       │                    ┌──────────────┐
       │                    │     LOG      │
       │                    │  RECONNECT   │
       │                    └──────┬───────┘
       │                           │
       │                    [reconnected]
       │                           │
       │                           ▼
       └─[Schema Error]────▶┌──────────────┐
                            │    FAIL      │
                            │   (throw)    │
                            └──────────────┘
```

## Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                        Docker Host                             │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Zookeeper   │  │    Kafka     │  │    MySQL     │        │
│  │  Container   │  │  Container   │  │  Container   │        │
│  │              │  │              │  │              │        │
│  │  Port: 2181  │  │  Port: 9092  │  │  Port: 3306  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │
│         └────────┬────────┘                 │                 │
│                  │                          │                 │
│  ┌──────────────────────────────────────────┼────────────┐   │
│  │            Docker Network                │            │   │
│  │         (data-pipeline)                  │            │   │
│  └──────────────────────────────────────────┼────────────┘   │
│                                             │                │
└─────────────────────────────────────────────┼────────────────┘
                                              │
                                              │
┌─────────────────────────────────────────────┼────────────────┐
│                      Host Machine           │                │
│                                             │                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Node.js Application                    │    │
│  │                                                      │    │
│  │  ┌──────────────┐           ┌──────────────┐       │    │
│  │  │   Producer   │           │   Consumer   │       │    │
│  │  │   Process    │           │   Process    │       │    │
│  │  │              │           │              │       │    │
│  │  │  - Fetch     │           │  - Subscribe │       │    │
│  │  │  - Parse     │           │  - Buffer    │       │    │
│  │  │  - Publish   │           │  - Insert    │       │    │
│  │  └──────┬───────┘           └──────┬───────┘       │    │
│  │         │                          │               │    │
│  │         └──────────┬───────────────┘               │    │
│  └────────────────────┼─────────────────────────────── │    │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
                localhost:9092, localhost:3306
```

---

These diagrams provide a visual representation of the system architecture, data flow, component interactions, state management, error handling, and deployment structure.
