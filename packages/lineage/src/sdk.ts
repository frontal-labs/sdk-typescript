import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/_core";
import type { LineageNode, LineageEdge, LineageGraph } from "./schemas";

/**
 * Client for the Frontal Lineage API (`/v1/lineage`).
 * Traces data lineage, manages graph nodes and edges, and analyzes impact
 * of changes.
 */
export class LineageSdk {
  /** Lineage graph operations. */
  readonly graph: GraphNamespace;
  /** Lineage node operations. */
  readonly nodes: NodesNamespace;
  /** Lineage edge operations. */
  readonly edges: EdgesNamespace;
  /** Impact analysis operations. */
  readonly impact: ImpactNamespace;

  constructor(private readonly http: HttpClient) {
    this.graph = new GraphNamespace(http);
    this.nodes = new NodesNamespace(http);
    this.edges = new EdgesNamespace(http);
    this.impact = new ImpactNamespace(http);
  }
}

/** Namespace for lineage graph operations. */
export class GraphNamespace {
  constructor(private readonly http: HttpClient) {}
  /**
   * Get the lineage graph for a resource.
   * @param resourceId - ID of the resource to trace.
   * @param opts - Optional traversal depth.
   */
  async get(
    resourceId: string,
    opts?: { depth?: number }
  ): Promise<LineageGraph> {
    return this.http.get("/lineage/graph", {
      resourceId,
      ...opts,
    });
  }
}

/** Namespace for lineage node operations. */
export class NodesNamespace {
  constructor(private readonly http: HttpClient) {}
  /**
   * List lineage nodes with optional type filtering and pagination.
   * @param opts - Filter and pagination options.
   */
  async list(
    opts: { type?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<LineageNode>> {
    const raw = await this.http.get("/lineage/nodes", opts);
    return createPageResult(asPagePayload<LineageNode>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /** Get a single lineage node by ID. */
  async get(id: string): Promise<LineageNode> {
    return this.http.get(`/lineage/nodes/${id}`);
  }
  /** Trace the full lineage graph from a node. */
  async trace(id: string): Promise<LineageGraph> {
    return this.http.get(`/lineage/nodes/${id}/trace`);
  }
}

/** Namespace for lineage edge operations. */
export class EdgesNamespace {
  constructor(private readonly http: HttpClient) {}
  /**
   * List lineage edges with optional source/target filtering.
   * @param opts - Filter and pagination options.
   */
  async list(
    opts: {
      sourceId?: string;
      targetId?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<LineageEdge>> {
    const raw = await this.http.get("/lineage/edges", opts);
    return createPageResult(asPagePayload<LineageEdge>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /** Get a single lineage edge by ID. */
  async get(id: string): Promise<LineageEdge> {
    return this.http.get(`/lineage/edges/${id}`);
  }
}

/** Namespace for impact analysis operations. */
export class ImpactNamespace {
  constructor(private readonly http: HttpClient) {}
  /**
   * Analyze the impact of a change to a resource.
   * @param resourceId - ID of the resource being changed.
   * @param change - Description of the change (field update or deletion).
   */
  async analyzeChange(
    resourceId: string,
    change: { field?: string; type: "update" | "delete" }
  ): Promise<{
    affectedResources: {
      id: string;
      type: string;
      name: string;
      impact: string;
    }[];
  }> {
    return this.http.post("/lineage/impact", {
      resourceId,
      change,
    });
  }
}
