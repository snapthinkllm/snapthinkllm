import React from 'react';
import { FileText, Loader2, Check, AlertCircle } from 'lucide-react';

const DocumentProcessingModal = ({ 
  isOpen, 
  fileName, 
  stage, 
  progress, 
  details,
  onCancel 
}) => {
  if (!isOpen) return null;

  const getStageInfo = (stage) => {
    switch (stage) {
      case 'parsing':
        return {
          icon: <FileText className="h-6 w-6 text-blue-500" />,
          title: 'Parsing Document',
          description: 'Reading and extracting text from your document...',
          color: 'blue',
          estimatedTime: '~30 seconds'
        };
      case 'chunking':
        return {
          icon: <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />,
          title: 'Processing Content',
          description: 'Breaking document into manageable chunks for better search...',
          color: 'orange',
          estimatedTime: '~1 minute'
        };
      case 'embedding':
        return {
          icon: <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />,
          title: 'Creating Embeddings',
          description: 'Generating vector embeddings for semantic search (this may take a while for large documents)...',
          color: 'purple',
          estimatedTime: '~2-5 minutes'
        };
      case 'saving':
        return {
          icon: <Loader2 className="h-6 w-6 text-green-500 animate-spin" />,
          title: 'Saving Document',
          description: 'Storing document and embeddings to your notebook...',
          color: 'green',
          estimatedTime: '~10 seconds'
        };
      case 'complete':
        return {
          icon: <Check className="h-6 w-6 text-green-500" />,
          title: 'Processing Complete!',
          description: 'Document is ready for RAG queries and semantic search!',
          color: 'green'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-6 w-6 text-red-500" />,
          title: 'Processing Error',
          description: 'An error occurred while processing the document. Please try again.',
          color: 'red'
        };
      default:
        return {
          icon: <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />,
          title: 'Processing',
          description: 'Processing your document...',
          color: 'gray'
        };
    }
  };

  const stageInfo = getStageInfo(stage);
  const progressPercentage = Math.round(progress);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Document Processing
          </h3>
          {stage !== 'complete' && stage !== 'error' && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* File Info */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        {/* Processing Stage */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            {stageInfo.icon}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {stageInfo.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stageInfo.description}
              </p>
              {stageInfo.estimatedTime && stage !== 'complete' && stage !== 'error' && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stageInfo.estimatedTime}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {stage !== 'complete' && stage !== 'error' && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  stageInfo.color === 'blue' ? 'bg-blue-500' :
                  stageInfo.color === 'orange' ? 'bg-orange-500' :
                  stageInfo.color === 'purple' ? 'bg-purple-500' :
                  stageInfo.color === 'green' ? 'bg-green-500' :
                  'bg-gray-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}

          {/* Progress Text */}
          {stage !== 'complete' && stage !== 'error' && progressPercentage > 0 && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {progressPercentage}% complete
              </p>
              {details && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-between mb-6">
          {['parsing', 'chunking', 'embedding', 'saving'].map((stageName, index) => {
            const isActive = stageName === stage;
            const isComplete = ['parsing', 'chunking', 'embedding', 'saving'].indexOf(stage) > index;
            const isError = stage === 'error';

            return (
              <div key={stageName} className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mb-1 transition-colors ${
                    isError
                      ? 'bg-red-500'
                      : isComplete || stage === 'complete'
                      ? 'bg-green-500'
                      : isActive
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {stageName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {(stage === 'complete' || stage === 'error') && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                stage === 'complete'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {stage === 'complete' ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProcessingModal;
