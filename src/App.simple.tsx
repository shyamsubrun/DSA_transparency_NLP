// Version simplifiée pour tester
import { FilterProvider } from './context/FilterContext';
import './styles/global.css';

function SimpleApp() {
  return (
    <FilterProvider>
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ color: '#1e3a5f', marginBottom: '20px' }}>DSA Transparency Dashboard</h1>
        <p style={{ color: '#64748b' }}>Si vous voyez ce message, React fonctionne !</p>
        <p style={{ color: '#64748b', marginTop: '10px' }}>
          Le dashboard complet devrait se charger maintenant...
        </p>
      </div>
    </FilterProvider>
  );
}

export default SimpleApp;

