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
import { FrontalClient } from "@frontal-labs/core";
import type { DataSdk } from "@frontal-labs/data";
import { createDataClient } from "@frontal-labs/data";
import type { FunctionsSdk } from "@frontal-labs/functions";
import { createFunctionsClient } from "@frontal-labs/functions";
import type { GovernanceSdk } from "@frontal-labs/governance";
import { createGovernanceClient } from "@frontal-labs/governance";
import type { LineageSdk } from "@frontal-labs/lineage";
import { createLineageClient } from "@frontal-labs/lineage";
import type { ObservabilitySdk } from "@frontal-labs/observability";
import { createObservabilityClient } from "@frontal-labs/observability";
import type { OntologySdk } from "@frontal-labs/ontology";
import { createOntologyClient } from "@frontal-labs/ontology";
import type { PipelinesSdk } from "@frontal-labs/pipelines";
import { createPipelinesClient } from "@frontal-labs/pipelines";
import type { SchedulesSdk } from "@frontal-labs/schedules";
import { createSchedulesClient } from "@frontal-labs/schedules";
import type { WebhooksSdk } from "@frontal-labs/webhooks";
import { createWebhooksClient } from "@frontal-labs/webhooks";
import type { WorkflowsSdk } from "@frontal-labs/workflows";
import { createWorkflowsClient } from "@frontal-labs/workflows";
import { resolveSdkConfig, type SdkConfig } from "./config";

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

  /** Functions service. */
  #functions?: FunctionsSdk;
  get functions(): FunctionsSdk {
    this.#functions ??= createFunctionsClient(this.#frontal);
    return this.#functions;
  }

  /** Agent management service. */
  #agents?: AgentsSdk;
  get agents(): AgentsSdk {
    this.#agents ??= createAgentsClient(this.#frontal);
    return this.#agents;
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
   * The underlying {@link FrontalClient} transport. Use it to share one
   * connection with standalone service packages
   * (`createBlobClient(f.client)`).
   */
  get client(): FrontalClient {
    return this.#frontal;
  }

  /**
   * Create a unified SDK client.
   *
   * @param configOrClient - An {@link SdkConfig} (`{ apiKey, ... }`) or an
   * existing {@link FrontalClient} to share with other packages.
   *
   * @example
   * ```ts
   * const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
   * const { text } = await f.ai.generateText({ model: "claude-sonnet-4-6", prompt: "Hi" });
   * ```
   */
  constructor(configOrClient: SdkConfig | FrontalClient) {
    this.#frontal =
      configOrClient instanceof FrontalClient
        ? configOrClient
        : new FrontalClient(resolveSdkConfig(configOrClient));
  }
}
