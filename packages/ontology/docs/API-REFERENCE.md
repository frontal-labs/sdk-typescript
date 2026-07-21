# API Reference

Complete API reference for the Models package.

## Classes

### OntologyService

Main service class for model operations.

```typescript
class OntologyService {
  constructor(http: HttpClient)
  
  async model(name: string): Promise<ModelAccessor>
  async list(opts?: { status?: Model['status']; substrate?: string; limit?: number; cursor?: string }): Promise<PageResult<Model>>
  async create(definition: ModelDefinition): Promise<Model>
  async validate(definition: ModelDefinition): Promise<{ valid: boolean; errors?: any[]; warnings?: any[] }>
  async checkIntegrity(): Promise<{ valid: boolean; violations?: any[] }>

  // Namespaces
  migrations: MigrationsNamespace
  rules: RulesNamespace
  mixins: MixinsNamespace
  generation: GenerationNamespace
}
```

## Interfaces

### ModelDefinition

Complete model definition structure.

```typescript
interface ModelDefinition {
  name: string;
  displayName?: string;
  description?: string;
  extends?: string;
  mixins?: string[];
  fields: Record<string, FieldDefinition>;
  relationships?: Record<string, RelationshipDefinition>;
  substrates?: SubstrateRouting;
  semantics?: SemanticMetadata;
  indexes?: IndexDefinition[];
  status?: 'draft' | 'active' | 'deprecated';
}
```

### FieldDefinition

Field definition within a model.

```typescript
interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: unknown;
  substrate?: string;
  computed?: boolean;
  derivedBy?: string;
  cache?: { ttl: string };
  auto?: boolean;
  enum?: string[];
  dimensions?: number;
  items?: string;
  description?: string;
}
```

### RelationshipDefinition

Relationship definition between ontology.

```typescript
interface RelationshipDefinition {
  name?: string;
  type: RelationshipType;
  targetEntity: string;
  foreignKey?: string;
  substrate?: string;
  cascade?: {
    delete?: 'hard' | 'soft' | 'restrict' | 'nullify';
    update?: 'cascade' | 'restrict';
  };
  computed?: Record<string, unknown>;
  description?: string;
}
```

### MigrationPlan

Migration plan for schema changes.

```typescript
interface MigrationPlan {
  id: string;
  modelId: string;
  fromVersion: number;
  toVersion: number;
  changes: Array<{
    type: 'add-field' | 'remove-field' | 'modify-field' | 'add-relationship' | 'remove-relationship';
    description: string;
    impact: 'breaking' | 'non-breaking' | 'data-loss';
    sql?: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntime?: string;
  rolloutStrategy: 'zero-downtime' | 'maintenance-window' | 'immediate';
  createdAt: string;
}
```

### RuleDefinition

Validation rule definition.

```typescript
interface RuleDefinition {
  name: string;
  description?: string;
  entityTypes: string[];
  condition: string;
  action: 'validate' | 'transform' | 'notify';
  severity: 'error' | 'warning' | 'info';
  enabled?: boolean;
}
```

### MixinDefinition

Reusable mixin definition.

```typescript
interface MixinDefinition {
  name: string;
  description?: string;
  fields: Record<string, FieldDefinition>;
  relationships?: Record<string, RelationshipDefinition>;
  appliesTo?: string[];
}
```

### Enums

#### FieldType

```typescript
type FieldType = 
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "uuid"
  | "timestamp"
  | "currency"
  | "json"
  | "array"
  | "enum"
  | "vector"
  | "text";
```

#### RelationshipType

```typescript
type RelationshipType = 
  | "hasOne"
  | "hasMany"
  | "belongsTo"
  | "manyToMany";
```

## Utility Functions

### createOntologyClient

```typescript
createOntologyClient(client: FrontalClient): OntologyService
```

Creates a OntologyService instance with a custom FrontalClient.

**Parameters:**
- `client`: FrontalClient instance

**Returns:** OntologyService instance

**Example:**
```typescript
import { createOntologyClient } from "@frontal-labs/ontology";
import { FrontalClient } from "@frontal-labs/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const ontology = createOntologyClient(client);
```

## Default Export

The package also exports a default models instance configured with environment variables:

```typescript
import { ontology } from "@frontal-labs/ontology";

// Use the default instance
const modelList = await ontology.list();
```
