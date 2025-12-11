// Test component to debug the issue
import { FilterProvider } from './context/FilterContext';
import './styles/global.css';

function TestApp() {
  return (
    <FilterProvider>
      <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
        <h1 style={{ color: '#1e3a5f' }}>DSA Dashboard Test</h1>
        <p>If you see this, React is working!</p>
        <button onClick={() => alert('Click works!')}>Test Button</button>
      </div>
    </FilterProvider>
  );
}

export default TestApp;

