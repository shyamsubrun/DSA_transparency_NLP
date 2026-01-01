import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './config/queryClient'
import App from './App.tsx'

// Error boundary pour capturer les erreurs
try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  );
} catch (error) {
  console.error('Fatal error rendering app:', error);
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif;">
      <h1 style="color: red;">Erreur de chargement</h1>
      <pre>${error}</pre>
      <p>Vérifiez la console du navigateur pour plus de détails.</p>
    </div>
  `;
}
