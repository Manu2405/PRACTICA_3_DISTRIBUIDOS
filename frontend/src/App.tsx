import { useEffect, useState } from 'react';
import { computeShortestPath } from './dijkstra';
import './App.css';

function App() {
  const [result, setResult] = useState<{ path: string[]; distance: number } | null>(null);

  useEffect(() => {
    setResult(computeShortestPath('A', 'F'));
  }, []);

  return (
    <div className="app">
      <h1>Aviones Distribuidos</h1>
      <p>Frontend React + backend Nest.js con la librería <strong>dijkstrajs</strong></p>
      <div className="card">
        <h2>Camino más corto</h2>
        {result ? (
          <>
            <p>Ruta: {result.path.join(' → ')}</p>
            <p>Distancia: {result.distance}</p>
          </>
        ) : (
          <p>Cargando...</p>
        )}
      </div>
      <p>Backend disponible en <code>http://localhost:3001</code></p>
    </div>
  );
}

export default App;
