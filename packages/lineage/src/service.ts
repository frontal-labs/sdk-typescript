import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { LineageNode, LineageEdge, LineageGraph } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class LineageService {
  readonly graph: GraphNamespace;
  readonly nodes: NodesNamespace;
  readonly edges: EdgesNamespace;
  readonly impact: ImpactNamespace;

  constructor(private readonly http: HttpClient) {
    this.graph = new GraphNamespace(http);
    this.nodes = new NodesNamespace(http);
    this.edges = new EdgesNamespace(http);
    this.impact = new ImpactNamespace(http);
  }
}

export class GraphNamespace {
  constructor(private readonly http: HttpClient) {}
  async get(
    resourceId: string,
    opts?: { depth?: number }
  ): Promise<LineageGraph> {
    return this.http.get("/v1/lineage/graph", {
      resource_id: resourceId,
      ...opts,
    });
  }
}

export class NodesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { type?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<LineageNode>> {
    const raw = await this.http.get("/v1/lineage/nodes", opts);
    return createPageResult(asPagePayload<LineageNode>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<LineageNode> {
    return this.http.get(`/v1/lineage/nodes/${id}`);
  }
  async trace(id: string): Promise<LineageGraph> {
    return this.http.get(`/v1/lineage/nodes/${id}/trace`);
  }
}

export class EdgesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: {
      source_id?: string;
      target_id?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<LineageEdge>> {
    const raw = await this.http.get("/v1/lineage/edges", opts);
    return createPageResult(asPagePayload<LineageEdge>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<LineageEdge> {
    return this.http.get(`/v1/lineage/edges/${id}`);
  }
}

export class ImpactNamespace {
  constructor(private readonly http: HttpClient) {}
  async analyzeChange(
    resourceId: string,
    change: { field?: string; type: "update" | "delete" }
  ): Promise<{
    affected_resources: Array<{
      id: string;
      type: string;
      name: string;
      impact: string;
    }>;
  }> {
    return this.http.post("/v1/lineage/impact", {
      resource_id: resourceId,
      change,
    });
  }
}
