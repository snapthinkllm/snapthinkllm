import { useState } from 'react';
import { 
  Database, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  FileText,
  ArrowRight
} from 'lucide-react';

function MigrationDialog({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState('backup'); // backup, migrate, complete
  const [loading, setLoading] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [migrationResult, setMigrationResult] = useState(null);
  const [error, setError] = useState('');

  const handleBackup = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await window.notebookAPI.backupChats();
      
      if (result.canceled) {
        setLoading(false);
        return;
      }
      
      if (result.success) {
        setBackupPath(result.filePath);
        setStep('migrate');
      } else {
        setError(result.message || 'Failed to create backup');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during backup');
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await window.notebookAPI.migrateChatsToNotebooks();
      
      if (result.success) {
        setMigrationResult(result);
        setStep('complete');
      } else {
        setError('Migration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during migration');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete?.(migrationResult);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Migrate to Notebooks
          </h2>
        </div>

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Important: Backup Your Data</p>
                <p>
                  We recommend creating a backup of your existing chat sessions before migrating 
                  to the new notebook format. This ensures your data is safe.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This migration will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Convert your chat sessions to notebook format</li>
                <li>• Preserve all messages and uploaded documents</li>
                <li>• Organize files into docs/, images/, videos/ folders</li>
                <li>• Keep your original chats intact as backup</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBackup}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{loading ? 'Creating...' : 'Create Backup'}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'migrate' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">Backup Created Successfully</p>
                <p className="text-xs mt-1 font-mono truncate">{backupPath}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Now let's migrate your chats to the new notebook format. This process will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Create a notebook for each chat session</li>
                <li>• Convert messages to the new format</li>
                <li>• Copy and organize your files</li>
                <li>• Add migration metadata for tracking</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setStep('backup')}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleMigration}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                <span>{loading ? 'Migrating...' : 'Start Migration'}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">Migration Completed Successfully!</p>
              </div>
            </div>

            {migrationResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">
                      {migrationResult.migrated}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Notebooks Created
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">
                      {migrationResult.notebooks?.reduce((sum, nb) => sum + (nb.stats?.totalMessages || 0), 0) || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Messages Migrated
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>What's Next:</strong> Your notebooks are ready! You can now enjoy the new 
                    notebook-based interface with better organization, file management, and collaboration features.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleComplete}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>View Notebooks</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MigrationDialog;
