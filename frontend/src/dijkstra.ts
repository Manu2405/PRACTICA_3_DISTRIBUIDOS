import * as dijkstra from 'dijkstrajs';

const graph = {
  A: { B: 5, C: 2 },
  B: { D: 1, E: 3 },
  C: { B: 8, E: 7 },
  D: { F: 2 },
  E: { F: 5 },
  F: {}
};

export function computeShortestPath(from: string, to: string) {
  const path = dijkstra.find_path(graph, from, to);
  const distance = dijkstra.distance(graph, from, to);
  return { path, distance };
}
