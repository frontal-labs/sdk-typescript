import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { LineageNode, LineageEdge, LineageGraph } from "./schemas";

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
    return this.http.get("/lineage/graph", {
      resourceId,
      ...opts,
    });
  }
}

export class NodesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { type?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<LineageNode>> {
    const raw = await this.http.get("/lineage/nodes", opts);
    return createPageResult(asPagePayload<LineageNode>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<LineageNode> {
    return this.http.get(`/lineage/nodes/${id}`);
  }
  async trace(id: string): Promise<LineageGraph> {
    return this.http.get(`/lineage/nodes/${id}/trace`);
  }
}

export class EdgesNamespace {
  constructor(private readonly http: HttpClient) {}
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
  async get(id: string): Promise<LineageEdge> {
    return this.http.get(`/lineage/edges/${id}`);
  }
}

export class ImpactNamespace {
  constructor(private readonly http: HttpClient) {}
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
