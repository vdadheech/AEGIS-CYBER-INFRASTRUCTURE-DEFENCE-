import { fetchWithRetry, postJson } from './client';
import type {
  AssetsResponse,
  SchemaLog,
  CityMapResponse,
  HeatmapResponse,
} from '../types';

export function fetchAssets(): Promise<AssetsResponse> {
  return fetchWithRetry<AssetsResponse>('/assets');
}

export function fetchSchemaLogs(): Promise<SchemaLog> {
  return fetchWithRetry<SchemaLog>('/schema-logs');
}

export function fetchCityMap(): Promise<CityMapResponse> {
  return fetchWithRetry<CityMapResponse>('/city-map');
}

export function fetchHeatmap(): Promise<HeatmapResponse> {
  return fetchWithRetry<HeatmapResponse>('/heatmap');
}

export function quarantineNode(
  nodeId: number
): Promise<{ message: string; node_id: number }> {
  return postJson<{ message: string; node_id: number }>(
    `/nodes/${nodeId}/quarantine`
  );
}
