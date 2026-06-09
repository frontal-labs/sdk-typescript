import type { FrontalClient } from "@frontal-labs/core";
import { createAIClient } from "@frontal-labs/ai";
import type { AIService } from "@frontal-labs/ai";
import { createAgentsClient } from "@frontal-labs/agents";
import type { AgentsService } from "@frontal-labs/agents";
import { createAuditClient } from "@frontal-labs/audit";
import type { AuditService } from "@frontal-labs/audit";
import { createAuthClient } from "@frontal-labs/auth";
import type { AuthService } from "@frontal-labs/auth";
import { createBillingClient } from "@frontal-labs/billing";
import type { BillingService } from "@frontal-labs/billing";
import { createBlobClient } from "@frontal-labs/blob";
import type { BlobService } from "@frontal-labs/blob";
import { createConnectorsClient } from "@frontal-labs/connectors";
import type { ConnectorsService } from "@frontal-labs/connectors";
import { createDatasetsClient } from "@frontal-labs/datasets";
import type { DatasetsService } from "@frontal-labs/datasets";
import { createEventsClient } from "@frontal-labs/events";
import type { EventsService } from "@frontal-labs/events";
import { createFlagsClient } from "@frontal-labs/flags";
import type { FlagsService } from "@frontal-labs/flags";
import { createFunctionsClient } from "@frontal-labs/functions";
import type { FunctionsService } from "@frontal-labs/functions";
import { createGovernanceClient } from "@frontal-labs/governance";
import type { GovernanceService } from "@frontal-labs/governance";
import { createGraphClient } from "@frontal-labs/graph";
import type { GraphService } from "@frontal-labs/graph";
import { createIntegrationsClient } from "@frontal-labs/integrations";
import type { IntegrationsService } from "@frontal-labs/integrations";
import { createLineageClient } from "@frontal-labs/lineage";
import type { LineageService } from "@frontal-labs/lineage";
import { createObservabilityClient } from "@frontal-labs/observability";
import type { ObservabilityService } from "@frontal-labs/observability";
import { createOntologyClient } from "@frontal-labs/ontology";
import type { OntologyService } from "@frontal-labs/ontology";
import { createOrganizationClient } from "@frontal-labs/organization";
import type { OrganizationService } from "@frontal-labs/organization";
import { createPipelinesClient } from "@frontal-labs/pipelines";
import type { PipelinesService } from "@frontal-labs/pipelines";
import { createQueuesClient } from "@frontal-labs/queues";
import type { QueuesService } from "@frontal-labs/queues";
import { createSandboxClient } from "@frontal-labs/sandbox";
import type { SandboxService } from "@frontal-labs/sandbox";
import { createSchedulesClient } from "@frontal-labs/schedules";
import type { SchedulesService } from "@frontal-labs/schedules";
import { createSearchClient } from "@frontal-labs/search";
import type { SearchService } from "@frontal-labs/search";
import { createVectorsClient } from "@frontal-labs/vectors";
import type { VectorsService } from "@frontal-labs/vectors";
import { createWebhooksClient } from "@frontal-labs/webhooks";
import type { WebhooksService } from "@frontal-labs/webhooks";
import { createWorkflowsClient } from "@frontal-labs/workflows";
import type { WorkflowsService } from "@frontal-labs/workflows";

/**
 * Unified SDK client that provides lazy access to all Frontal services.
 *
 * Services are created on first access, so constructing the Sdk is cheap —
 * no HTTP clients are allocated until you actually use a service.
 *
 * @example
 * ```typescript
 * import { Sdk } from '@frontal-labs/sdk'
 * const sdk = new Sdk({ apiKey: 'frt_...' })
 * await sdk.blob.upload({ bucket: 'my-bucket', key: 'file.txt', data })
 * await sdk.ai.inference('hello')
 * ```
 */
export class Sdk {
  readonly #frontal: FrontalClient;

  // ── Storage ──────────────────────────────────────────────────────────

  #blob?: BlobService;
  get blob(): BlobService {
    this.#blob ??= createBlobClient(this.#frontal);
    return this.#blob;
  }

  // ── AI & Agents ─────────────────────────────────────────────────────

  #ai?: AIService;
  get ai(): AIService {
    this.#ai ??= createAIClient(this.#frontal);
    return this.#ai;
  }

  #agents?: AgentsService;
  get agents(): AgentsService {
    this.#agents ??= createAgentsClient(this.#frontal);
    return this.#agents;
  }

  // ── Data ─────────────────────────────────────────────────────────────

  #graph?: GraphService;
  get graph(): GraphService {
    this.#graph ??= createGraphClient(this.#frontal);
    return this.#graph;
  }

  #datasets?: DatasetsService;
  get datasets(): DatasetsService {
    this.#datasets ??= createDatasetsClient(this.#frontal);
    return this.#datasets;
  }

  #vectors?: VectorsService;
  get vectors(): VectorsService {
    this.#vectors ??= createVectorsClient(this.#frontal);
    return this.#vectors;
  }

  #search?: SearchService;
  get search(): SearchService {
    this.#search ??= createSearchClient(this.#frontal);
    return this.#search;
  }

  #lineage?: LineageService;
  get lineage(): LineageService {
    this.#lineage ??= createLineageClient(this.#frontal);
    return this.#lineage;
  }

  // ── Compute ─────────────────────────────────────────────────────────

  #functions?: FunctionsService;
  get functions(): FunctionsService {
    this.#functions ??= createFunctionsClient(this.#frontal);
    return this.#functions;
  }

  #pipelines?: PipelinesService;
  get pipelines(): PipelinesService {
    this.#pipelines ??= createPipelinesClient(this.#frontal);
    return this.#pipelines;
  }

  #workflows?: WorkflowsService;
  get workflows(): WorkflowsService {
    this.#workflows ??= createWorkflowsClient(this.#frontal);
    return this.#workflows;
  }

  #queues?: QueuesService;
  get queues(): QueuesService {
    this.#queues ??= createQueuesClient(this.#frontal);
    return this.#queues;
  }

  #schedules?: SchedulesService;
  get schedules(): SchedulesService {
    this.#schedules ??= createSchedulesClient(this.#frontal);
    return this.#schedules;
  }

  #sandbox?: SandboxService;
  get sandbox(): SandboxService {
    this.#sandbox ??= createSandboxClient(this.#frontal);
    return this.#sandbox;
  }

  // ── Platform ────────────────────────────────────────────────────────

  #auth?: AuthService;
  get auth(): AuthService {
    this.#auth ??= createAuthClient(this.#frontal);
    return this.#auth;
  }

  #organization?: OrganizationService;
  get organization(): OrganizationService {
    this.#organization ??= createOrganizationClient(this.#frontal);
    return this.#organization;
  }

  #observability?: ObservabilityService;
  get observability(): ObservabilityService {
    this.#observability ??= createObservabilityClient(this.#frontal);
    return this.#observability;
  }

  #events?: EventsService;
  get events(): EventsService {
    this.#events ??= createEventsClient(this.#frontal);
    return this.#events;
  }

  #flags?: FlagsService;
  get flags(): FlagsService {
    this.#flags ??= createFlagsClient(this.#frontal);
    return this.#flags;
  }

  #audit?: AuditService;
  get audit(): AuditService {
    this.#audit ??= createAuditClient(this.#frontal);
    return this.#audit;
  }

  #governance?: GovernanceService;
  get governance(): GovernanceService {
    this.#governance ??= createGovernanceClient(this.#frontal);
    return this.#governance;
  }

  #billing?: BillingService;
  get billing(): BillingService {
    this.#billing ??= createBillingClient(this.#frontal);
    return this.#billing;
  }

  // ── Integrations ────────────────────────────────────────────────────

  #connectors?: ConnectorsService;
  get connectors(): ConnectorsService {
    this.#connectors ??= createConnectorsClient(this.#frontal);
    return this.#connectors;
  }

  #integrations?: IntegrationsService;
  get integrations(): IntegrationsService {
    this.#integrations ??= createIntegrationsClient(this.#frontal);
    return this.#integrations;
  }

  #webhooks?: WebhooksService;
  get webhooks(): WebhooksService {
    this.#webhooks ??= createWebhooksClient(this.#frontal);
    return this.#webhooks;
  }

  // ── Models ───────────────────────────────────────────────────────────

  #ontology?: OntologyService;
  get ontology(): OntologyService {
    this.#ontology ??= createOntologyClient(this.#frontal);
    return this.#ontology;
  }

  constructor(frontal: FrontalClient) {
    this.#frontal = frontal;
  }
}
