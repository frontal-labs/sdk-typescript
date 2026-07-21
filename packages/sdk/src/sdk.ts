import type { AgentsSdk } from "@frontal-labs/agents";
import { createAgentsClient } from "@frontal-labs/agents";
import type { AISdk } from "@frontal-labs/ai";
import { createAIClient } from "@frontal-labs/ai";
import type { AuditSdk } from "@frontal-labs/audit";
import { createAuditClient } from "@frontal-labs/audit";
import type { AuthSdk } from "@frontal-labs/auth";
import { createAuthClient } from "@frontal-labs/auth";
import type { BillingSdk } from "@frontal-labs/billing";
import { createBillingClient } from "@frontal-labs/billing";
import type { BlobSdk } from "@frontal-labs/blob";
import { createBlobClient } from "@frontal-labs/blob";
import type { ConnectorsSdk } from "@frontal-labs/connectors";
import { createConnectorsClient } from "@frontal-labs/connectors";
import type { FrontalClient } from "@frontal-labs/core";
import type { DataSdk } from "@frontal-labs/data";
import { createDataClient } from "@frontal-labs/data";
import type { DatasetsSdk } from "@frontal-labs/datasets";
import { createDatasetsClient } from "@frontal-labs/datasets";
import type { EventsSdk } from "@frontal-labs/events";
import { createEventsClient } from "@frontal-labs/events";
import type { GovernanceSdk } from "@frontal-labs/governance";
import { createGovernanceClient } from "@frontal-labs/governance";
import type { GraphSdk } from "@frontal-labs/graph";
import { createGraphClient } from "@frontal-labs/graph";
import type { IntegrationsSdk } from "@frontal-labs/integrations";
import { createIntegrationsClient } from "@frontal-labs/integrations";
import type { LineageSdk } from "@frontal-labs/lineage";
import { createLineageClient } from "@frontal-labs/lineage";
import type { ObservabilitySdk } from "@frontal-labs/observability";
import { createObservabilityClient } from "@frontal-labs/observability";
import type { OntologySdk } from "@frontal-labs/ontology";
import { createOntologyClient } from "@frontal-labs/ontology";
import type { PipelinesSdk } from "@frontal-labs/pipelines";
import { createPipelinesClient } from "@frontal-labs/pipelines";
import type { SandboxSdk } from "@frontal-labs/sandbox";
import { createSandboxClient } from "@frontal-labs/sandbox";
import type { SchedulesSdk } from "@frontal-labs/schedules";
import { createSchedulesClient } from "@frontal-labs/schedules";
import type { WebhooksSdk } from "@frontal-labs/webhooks";
import { createWebhooksClient } from "@frontal-labs/webhooks";
import type { WorkersSdk } from "@frontal-labs/workers";
import { createWorkersClient } from "@frontal-labs/workers";
import type { WorkflowsSdk } from "@frontal-labs/workflows";
import { createWorkflowsClient } from "@frontal-labs/workflows";

/**
 * Unified Frontal SDK client providing lazy access to all service namespaces.
 * Each service namespace is initialised on first access from the shared
 * {@link FrontalClient} connection.
 */
export class Frontal {
  readonly #frontal: FrontalClient;

  /** Blob storage service. */
  #blob?: BlobSdk;
  get blob(): BlobSdk {
    this.#blob ??= createBlobClient(this.#frontal);
    return this.#blob;
  }

  /** AI service (agents, embeddings, etc.). */
  #ai?: AISdk;
  get ai(): AISdk {
    this.#ai ??= createAIClient(this.#frontal);
    return this.#ai;
  }

  /** Agent management service. */
  #agents?: AgentsSdk;
  get agents(): AgentsSdk {
    this.#agents ??= createAgentsClient(this.#frontal);
    return this.#agents;
  }

  /** Knowledge graph service. */
  #graph?: GraphSdk;
  get graph(): GraphSdk {
    this.#graph ??= createGraphClient(this.#frontal);
    return this.#graph;
  }

  /** Dataset management service. */
  #datasets?: DatasetsSdk;
  get datasets(): DatasetsSdk {
    this.#datasets ??= createDatasetsClient(this.#frontal);
    return this.#datasets;
  }

  /** Data processing service. */
  #data?: DataSdk;
  get data(): DataSdk {
    this.#data ??= createDataClient(this.#frontal);
    return this.#data;
  }

  /** Data lineage service. */
  #lineage?: LineageSdk;
  get lineage(): LineageSdk {
    this.#lineage ??= createLineageClient(this.#frontal);
    return this.#lineage;
  }

  /** Serverless workers service. */
  #workers?: WorkersSdk;
  get workers(): WorkersSdk {
    this.#workers ??= createWorkersClient(this.#frontal);
    return this.#workers;
  }

  /** Pipeline management service. */
  #pipelines?: PipelinesSdk;
  get pipelines(): PipelinesSdk {
    this.#pipelines ??= createPipelinesClient(this.#frontal);
    return this.#pipelines;
  }

  /** Workflow management service. */
  #workflows?: WorkflowsSdk;
  get workflows(): WorkflowsSdk {
    this.#workflows ??= createWorkflowsClient(this.#frontal);
    return this.#workflows;
  }

  /** Schedule management service. */
  #schedules?: SchedulesSdk;
  get schedules(): SchedulesSdk {
    this.#schedules ??= createSchedulesClient(this.#frontal);
    return this.#schedules;
  }

  /** Sandbox code execution service. */
  #sandbox?: SandboxSdk;
  get sandbox(): SandboxSdk {
    this.#sandbox ??= createSandboxClient(this.#frontal);
    return this.#sandbox;
  }

  /** Authentication service. */
  #auth?: AuthSdk;
  get auth(): AuthSdk {
    this.#auth ??= createAuthClient(this.#frontal);
    return this.#auth;
  }

  /** Observability (logs, metrics, traces, alerts) service. */
  #observability?: ObservabilitySdk;
  get observability(): ObservabilitySdk {
    this.#observability ??= createObservabilityClient(this.#frontal);
    return this.#observability;
  }

  /** Event management service. */
  #events?: EventsSdk;
  get events(): EventsSdk {
    this.#events ??= createEventsClient(this.#frontal);
    return this.#events;
  }

  /** Audit log service. */
  #audit?: AuditSdk;
  get audit(): AuditSdk {
    this.#audit ??= createAuditClient(this.#frontal);
    return this.#audit;
  }

  /** Governance service. */
  #governance?: GovernanceSdk;
  get governance(): GovernanceSdk {
    this.#governance ??= createGovernanceClient(this.#frontal);
    return this.#governance;
  }

  /** Billing service. */
  #billing?: BillingSdk;
  get billing(): BillingSdk {
    this.#billing ??= createBillingClient(this.#frontal);
    return this.#billing;
  }

  /** Connector management service. */
  #connectors?: ConnectorsSdk;
  get connectors(): ConnectorsSdk {
    this.#connectors ??= createConnectorsClient(this.#frontal);
    return this.#connectors;
  }

  /** Integration management service. */
  #integrations?: IntegrationsSdk;
  get integrations(): IntegrationsSdk {
    this.#integrations ??= createIntegrationsClient(this.#frontal);
    return this.#integrations;
  }

  /** Webhook management service. */
  #webhooks?: WebhooksSdk;
  get webhooks(): WebhooksSdk {
    this.#webhooks ??= createWebhooksClient(this.#frontal);
    return this.#webhooks;
  }

  /** Ontology service. */
  #ontology?: OntologySdk;
  get ontology(): OntologySdk {
    this.#ontology ??= createOntologyClient(this.#frontal);
    return this.#ontology;
  }

  /**
   * @param frontal - The underlying {@link FrontalClient} instance to use for all API calls.
   */
  constructor(frontal: FrontalClient) {
    this.#frontal = frontal;
  }
}
