import * as dijkstra from 'dijkstrajs';
var graph = {
    A: { B: 5, C: 2 },
    B: { D: 1, E: 3 },
    C: { B: 8, E: 7 },
    D: { F: 2 },
    E: { F: 5 },
    F: {}
};
export function computeShortestPath(from, to) {
    var path = dijkstra.find_path(graph, from, to);
    // 🔥 calcular distancia manualmente
    var distance = 0;
    for (var i = 0; i < path.length - 1; i++) {
        var current = path[i];
        var next = path[i + 1];
        distance += graph[current][next];
    }
    return { path: path, distance: distance };
}
