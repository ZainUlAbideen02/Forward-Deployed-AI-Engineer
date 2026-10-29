export interface HealthStatus {
  status: string;
  service: string;
  environment: string;
  database_configured: boolean;
  database_connected: boolean;
  database_host: string;
  database_port: number;
}

export interface SQLGenerationOutput {
  sql: string;
  explanation: string;
  tables_used: string[];
  estimated_complexity: "simple" | "medium" | "complex";
}

export interface QueryExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  execution_time_ms: number;
  error?: string | null;
}

export interface LatencyBreakdown {
  schema_introspection_ms: number;
  llm_generation_ms: number;
  guardrail_validation_ms: number;
  sandboxed_execution_ms: number;
  total_pipeline_ms: number;
}

export interface CopilotResponse {
  natural_language_query: string;
  generation: SQLGenerationOutput;
  guardrail_safe: boolean;
  guardrail_reason?: string | null;
  execution: QueryExecutionResult;
  suggested_visualization: "table" | "bar" | "line" | "metric" | "pie";
  latency: LatencyBreakdown;
}

export interface SchemaMetadataResponse {
  formatted_schema: string;
  tables: {
    table_name: string;
    columns: string[];
    details?: any[];
  }[];
  cached: boolean;
}
