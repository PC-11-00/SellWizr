# Refactored Architecture Documentation

## 📐 New Project Structure

The project has been completely refactored with a clean, layered architecture following industry best practices:

```
src/
├── config.ts                         # Configuration management
├── index.ts                          # Demo entry point
├── producer.ts                       # Producer entry point
├── consumer.ts                       # Consumer entry point
│
├── controllers/                      # Application controllers (orchestration)
│   ├── producer.controller.ts        # Producer orchestration logic
│   └── consumer.controller.ts        # Consumer orchestration logic
│
├── services/                         # Business logic services
│   ├── base/
│   │   └── base.service.ts          # Base class for all services
│   ├── http.service.ts              # HTTP client with retry logic
│   ├── parser.service.ts            # HTML table parser with schema inference
│   └── database.service.ts          # MySQL database operations
│
├── messaging/                        # Kafka messaging layer
│   ├── base/
│   │   └── base.kafka.ts            # Base class for Kafka clients
│   ├── kafka.producer.ts            # Kafka producer implementation
│   └── kafka.consumer.ts            # Kafka consumer implementation
│
├── models/                           # Data models and types
│   ├── schema.model.ts              # Schema and table models
│   └── kafka.model.ts               # Kafka message models
│
└── utils/                            # Utility functions
    └── logger.ts                    # Logging utility
```

## 🏗️ Architectural Layers

### 1. Controllers Layer

**Purpose**: Orchestrate the flow between services

- **ProducerController**: Manages the data ingestion pipeline
  - Initializes HTTP and Parser services
  - Coordinates data fetching, parsing, and Kafka publishing
  - Handles lifecycle management

- **ConsumerController**: Manages the data persistence pipeline
  - Initializes Database service and Kafka consumer
  - Coordinates message consumption and database insertion
  - Manages batch processing logic

**Benefits**:

- Clear separation of orchestration logic
- Easy to test and maintain
- Single responsibility principle

### 2. Services Layer

**Purpose**: Encapsulate business logic

All services extend **BaseService** which provides:

- Standard initialization/destruction lifecycle
- Built-in logging
- State management (isInitialized)
- Template method pattern

**Services**:

- **HttpService**: Fetches HTML with retry logic
- **ParserService**: Parses HTML tables and infers schema
- **DatabaseService**: Manages MySQL operations

**Benefits**:

- Consistent service interface
- Reusable base functionality
- Easy to add new services
- Testable in isolation

### 3. Messaging Layer

**Purpose**: Handle Kafka communication

All Kafka clients extend **BaseKafka** which provides:

- Standard connection/disconnection lifecycle
- Built-in logging
- State management (isConnected)
- Template method pattern

**Messaging Components**:

- **KafkaProducerService**: Publishes messages to Kafka
- **KafkaConsumerService**: Consumes messages from Kafka

**Benefits**:

- Abstraction over Kafka library (easy to swap implementations)
- Consistent Kafka client interface
- Centralized connection management
- Easy to add new Kafka features

### 4. Models Layer

**Purpose**: Define data structures

- **schema.model.ts**: Table schema, columns, data types
- **kafka.model.ts**: Kafka message format, configurations

**Benefits**:

- Type safety with TypeScript
- Centralized data structure definitions
- Easy to modify and extend
- Reusable across layers

## 🎯 Design Patterns

### 1. Template Method Pattern

Base classes define the skeleton of algorithms:

```typescript
abstract class BaseService {
  async initialize() {
    // Common logic
    await this.onInitialize(); // Subclass-specific
    // Common logic
  }

  protected abstract onInitialize(): Promise<void>;
}
```

### 2. Dependency Injection

Controllers depend on abstractions, not concretions:

```typescript
class ProducerController {
  private httpService: HttpService;
  private parserService: ParserService;

  constructor() {
    this.httpService = new HttpService();
    this.parserService = new ParserService();
  }
}
```

### 3. Single Responsibility Principle

Each class has one reason to change:

- Controllers: orchestration logic changes
- Services: business logic changes
- Messaging: Kafka integration changes

### 4. Open/Closed Principle

Classes are open for extension, closed for modification:

- Extend BaseService to create new services
- Extend BaseKafka to create new Kafka clients

## 🔄 Data Flow

### Producer Flow

```
ProducerController
    ├─> HttpService.fetchHtml()
    ├─> ParserService.parseHtml()
    └─> KafkaProducerService.sendBatch()
```

### Consumer Flow

```
ConsumerController
    ├─> KafkaConsumerService.startConsuming()
    ├─> (on message) DatabaseService.createTable()
    └─> (batch ready) DatabaseService.insertBatch()
```

## 🧩 Component Interactions

```
┌─────────────────┐
│   Controllers   │  ← Orchestration
└────────┬────────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼────┐         ┌─────▼─────┐
│Services│         │ Messaging │  ← Business Logic
└───┬────┘         └─────┬─────┘
    │                     │
    └──────────┬──────────┘
               │
         ┌─────▼─────┐
         │  Models   │  ← Data Structures
         └───────────┘
```

## ✨ Benefits of New Architecture

### 1. Maintainability

- Clear separation of concerns
- Easy to locate and fix bugs
- Consistent patterns throughout

### 2. Testability

- Each layer can be tested independently
- Mock dependencies easily
- Unit test each service in isolation

### 3. Scalability

- Easy to add new services
- Easy to add new Kafka topics/consumers
- Horizontal scaling supported

### 4. Flexibility

- Easy to swap implementations
- Abstract base classes make it simple to change underlying libraries
- Can replace KafkaJS with node-rdkafka by just changing messaging layer

### 5. Reusability

- Base classes reduce code duplication
- Services can be reused in different contexts
- Models shared across layers

## 🔧 Extending the System

### Adding a New Service

```typescript
import { BaseService } from "./base/base.service";

export class MyNewService extends BaseService {
  constructor() {
    super("MyNewService");
  }

  protected async onInitialize(): Promise<void> {
    // Initialize your service
  }

  protected async onDestroy(): Promise<void> {
    // Cleanup resources
  }

  // Your business logic methods
  async doSomething(): Promise<void> {
    this.ensureInitialized();
    // ... your logic
  }
}
```

### Adding a New Kafka Client

```typescript
import { BaseKafka } from "./base/base.kafka";

export class MyKafkaClient extends BaseKafka {
  constructor() {
    super("MyKafkaClient", brokers, clientId);
  }

  protected async onConnect(): Promise<void> {
    // Connect to Kafka
  }

  protected async onDisconnect(): Promise<void> {
    // Disconnect from Kafka
  }

  // Your Kafka operations
  async publishMessage(data: any): Promise<void> {
    this.ensureConnected();
    // ... your logic
  }
}
```

### Adding a New Controller

```typescript
export class MyController {
  private myService: MyService;
  private myKafka: MyKafkaClient;

  constructor() {
    this.myService = new MyService();
    this.myKafka = new MyKafkaClient();
  }

  async initialize(): Promise<void> {
    await this.myService.initialize();
    await this.myKafka.connect();
  }

  async execute(): Promise<void> {
    // Orchestrate your logic
  }

  async destroy(): Promise<void> {
    await this.myKafka.disconnect();
    await this.myService.destroy();
  }
}
```

## 🎓 Best Practices

1. **Always extend base classes** when creating new services or Kafka clients
2. **Use controllers** for orchestration, not business logic
3. **Keep services focused** on single responsibility
4. **Define models** for all data structures
5. **Initialize before use** - call initialize() before using services
6. **Cleanup resources** - call destroy() when done
7. **Use TypeScript** types everywhere for safety
8. **Log at appropriate levels** - info, warn, error, debug

## 📚 Migration from Old Structure

| Old File                    | New Location                    | Changes             |
| --------------------------- | ------------------------------- | ------------------- |
| `services/httpClient.ts`    | `services/http.service.ts`      | Extends BaseService |
| `services/tableParser.ts`   | `services/parser.service.ts`    | Extends BaseService |
| `services/database.ts`      | `services/database.service.ts`  | Extends BaseService |
| `services/kafkaProducer.ts` | `messaging/kafka.producer.ts`   | Extends BaseKafka   |
| `services/kafkaConsumer.ts` | `messaging/kafka.consumer.ts`   | Extends BaseKafka   |
| `types/schema.ts`           | `models/schema.model.ts`        | Renamed             |
| N/A                         | `models/kafka.model.ts`         | New                 |
| N/A                         | `controllers/*.controller.ts`   | New                 |
| N/A                         | `services/base/base.service.ts` | New                 |
| N/A                         | `messaging/base/base.kafka.ts`  | New                 |

## 🚀 Running the Refactored System

Everything works the same as before:

```bash
# Start services
docker-compose up -d

# Configure
cp .env.docker .env

# Run consumer
npm run consumer

# Run producer
npm run producer

# Demo mode
npm start
```

The external interface hasn't changed - only the internal architecture is improved!
