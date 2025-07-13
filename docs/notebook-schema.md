# Notebook Schema Documentation

## Folder Structure
```
notebooks/
├── notebook-{timestamp}-{uuid}/
│   ├── notebook.json          # Metadata and settings
│   ├── messages.json          # Chat history
│   ├── docs/                  # Uploaded documents
│   │   ├── filename.pdf
│   │   ├── filename.txt
│   │   └── ...
│   ├── images/                # Generated/uploaded images
│   │   ├── image1.png
│   │   └── ...
│   ├── videos/                # Generated/uploaded videos
│   │   ├── video1.mp4
│   │   └── ...
│   └── outputs/               # Generated code outputs
│       ├── plot1.png
│       └── ...
```

## notebook.json Schema
```json
{
  "id": "notebook-1642012345678-abc123",
  "title": "Data Analysis Project",
  "description": "Analyzing sales data for Q4 2024",
  "createdAt": "2024-01-12T14:30:00Z",
  "updatedAt": "2024-01-12T16:45:00Z",
  "thumbnail": "images/thumbnail.png",
  "tags": ["data-science", "sales", "analysis"],
  "model": "llama3.1:8b",
  "plugins": {
    "enabled": ["python-runner", "document-rag", "image-generator"],
    "settings": {
      "python-runner": {
        "environment": "default",
        "packages": ["pandas", "matplotlib", "numpy"]
      },
      "document-rag": {
        "chunkSize": 1000,
        "overlap": 200
      }
    }
  },
  "stats": {
    "totalMessages": 25,
    "totalTokens": 15420,
    "totalFiles": 3,
    "lastActive": "2024-01-12T16:45:00Z"
  }
}
```

## messages.json Schema
```json
{
  "messages": [
    {
      "id": "msg-1642012345678",
      "role": "user",
      "content": "Analyze this sales data",
      "timestamp": "2024-01-12T14:30:00Z",
      "mediaFiles": [
        {
          "type": "document",
          "path": "docs/sales-data.csv",
          "name": "sales-data.csv",
          "size": 124532
        }
      ],
      "sources": []
    },
    {
      "id": "msg-1642012345679",
      "role": "assistant",
      "content": "I'll analyze your sales data...",
      "timestamp": "2024-01-12T14:30:15Z",
      "sources": [
        {
          "fileName": "sales-data.csv",
          "index": 0,
          "text": "Chunk content..."
        }
      ],
      "outputs": [
        {
          "type": "code",
          "language": "python",
          "code": "import pandas as pd...",
          "result": "Success"
        },
        {
          "type": "image",
          "path": "outputs/sales-chart.png",
          "caption": "Sales trends over time"
        }
      ]
    }
  ]
}
```
