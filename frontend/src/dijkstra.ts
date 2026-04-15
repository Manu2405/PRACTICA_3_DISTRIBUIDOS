import * as dijkstra from 'dijkstrajs';

const graph: Record<string, Record<string, number>> = {
  A: { B: 5, C: 2 },
  B: { D: 1, E: 3 },
  C: { B: 8, E: 7 },
  D: { F: 2 },
  E: { F: 5 },
  F: {}
};

export function computeShortestPath(from: string, to: string) {
  const path = dijkstra.find_path(graph, from, to);

  // 🔥 calcular distancia manualmente
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    distance += graph[current][next];
  }

  return { path, distance };
}