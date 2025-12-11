import { FilterProvider } from './context/FilterContext';
import { Dashboard } from './components/Layout/Dashboard';
import './styles/global.css';

function App() {
  // Log pour debug
  console.log('App component rendering...');
  
  try {
    return (
      <FilterProvider>
        <Dashboard />
      </FilterProvider>
    );
  } catch (error) {
    console.error('Error in App:', error);
    return (
      <div style={{ padding: '40px', color: 'red' }}>
        <h1>Erreur de rendu</h1>
        <pre>{String(error)}</pre>
        <p>Vérifiez la console pour plus de détails.</p>
      </div>
    );
  }
}

export default App;
