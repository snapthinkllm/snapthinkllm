import { useState } from 'react';
import NotebookDashboard from './components/NotebookDashboard';
import NotebookWorkspace from './components/NotebookWorkspace';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'workspace'
  const [selectedNotebookId, setSelectedNotebookId] = useState(null);

  const handleNotebookSelect = (notebookId) => {
    setSelectedNotebookId(notebookId);
    setCurrentView('workspace');
  };

  const handleCreateNotebook = (notebookId) => {
    setSelectedNotebookId(notebookId);
    setCurrentView('workspace');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedNotebookId(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {currentView === 'dashboard' ? (
        <NotebookDashboard 
          onNotebookSelect={handleNotebookSelect}
          onCreateNotebook={handleCreateNotebook}
        />
      ) : (
        <NotebookWorkspace 
          notebookId={selectedNotebookId}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
}

export default App;
