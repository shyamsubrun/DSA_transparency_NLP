// Version de debug pour tester étape par étape
import { useState } from 'react';
import './styles/global.css';

function DebugApp() {
  const [step, setStep] = useState(1);

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e3a5f', marginBottom: '20px' }}>🔍 Debug Dashboard</h1>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h2>Étape {step}: Test de base</h2>
        <p style={{ color: '#64748b', marginTop: '10px' }}>
          Si vous voyez ce message, React fonctionne correctement !
        </p>
        <button 
          onClick={() => setStep(step + 1)}
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            background: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test suivant
        </button>
      </div>

      {step >= 2 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <h2>Étape 2: Test des imports</h2>
          <p style={{ color: '#64748b' }}>Testons les imports...</p>
          <TestImports />
        </div>
      )}
    </div>
  );
}

function TestImports() {
  const [status, setStatus] = useState('Testing...');

  React.useEffect(() => {
    try {
      // Test import FilterContext
      import('./context/FilterContext').then(() => {
        setStatus(prev => prev + ' ✓ FilterContext');
      }).catch(err => {
        setStatus(prev => prev + ' ✗ FilterContext: ' + err.message);
      });

      // Test import mockData
      import('./data/mockData').then(module => {
        const count = module.mockData?.length || 0;
        setStatus(prev => prev + ` ✓ mockData (${count} entries)`);
      }).catch(err => {
        setStatus(prev => prev + ' ✗ mockData: ' + err.message);
      });

      // Test import Dashboard
      import('./components/Layout/Dashboard').then(() => {
        setStatus(prev => prev + ' ✓ Dashboard');
      }).catch(err => {
        setStatus(prev => prev + ' ✗ Dashboard: ' + err.message);
      });
    } catch (error: any) {
      setStatus('Error: ' + error.message);
    }
  }, []);

  return <pre style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>{status}</pre>;
}

// Import React pour useEffect
import React from 'react';

export default DebugApp;

