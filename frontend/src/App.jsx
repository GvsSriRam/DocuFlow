import React, { useState } from 'react'
import { Upload, FileText, Download, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'process', 'documents'
  const [currentDocument, setCurrentDocument] = useState(null)
  const [documents, setDocuments] = useState([])

  const FileUpload = ({ onDocumentUploaded }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState(null)

    const handleDragOver = (e) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      setIsDragging(false)
    }

    const handleDrop = (e) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) handleFileUpload(files[0])
    }

    const handleFileSelect = (e) => {
      const file = e.target.files[0]
      if (file) handleFileUpload(file)
    }

    const handleFileUpload = async (file) => {
      if (!file.type.includes('pdf')) {
        setError('Please select a PDF file')
        return
      }

      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await axios.post('http://localhost:8000/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        onDocumentUploaded(response.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      } finally {
        setIsUploading(false)
      }
    }

    return (
      <div className="upload-container">
        <div className="upload-header">
          <h2 className="upload-title">Upload Purchase Order</h2>
          <p className="upload-subtitle">
            Upload a PDF purchase order to automatically extract and match line items
          </p>
        </div>

        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="upload-input"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="upload-content">
              <div className="spinner"></div>
              <p className="upload-text-large">Processing document...</p>
              <p className="upload-text-small">Extracting line items and generating matches</p>
            </div>
          ) : (
            <div className="upload-content">
              <Upload className="upload-icon" />
              <p className="upload-text-large">Drop your PDF here, or click to browse</p>
              <p className="upload-text-small">Supports PDF files up to 10MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle className="alert-icon" />
            <p>{error}</p>
          </div>
        )}
      </div>
    )
  }

  const DocumentProcessor = ({ document, onBack }) => {
    const [lineItems, setLineItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedMatches, setSelectedMatches] = useState({})
    const [isVerifying, setIsVerifying] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [verified, setVerified] = useState(false)

    React.useEffect(() => {
      fetchLineItems()
    }, [document.id])

    const fetchLineItems = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`http://localhost:8000/documents/${document.id}/items`)
        setLineItems(response.data.line_items)

        // Initialize selections with best matches
        const initialSelections = {}
        response.data.line_items.forEach(item => {
          if (item.matches && item.matches.length > 0) {
            initialSelections[item.id] = item.matches[0].product_id
          }
        })
        setSelectedMatches(initialSelections)
      } catch (err) {
        setError('Failed to load line items')
      } finally {
        setLoading(false)
      }
    }

    const handleMatchSelection = (itemId, productId) => {
      setSelectedMatches(prev => ({
        ...prev,
        [itemId]: productId
      }))
    }

    const handleVerify = async () => {
      setIsVerifying(true)
      try {
        await axios.post(`http://localhost:8000/documents/${document.id}/verify`, {
          selections: selectedMatches
        })
        setVerified(true)
      } catch (err) {
        setError('Verification failed')
      } finally {
        setIsVerifying(false)
      }
    }

    const handleExport = async () => {
      setIsExporting(true)
      try {
        const response = await axios.get(`http://localhost:8000/documents/${document.id}/export`, {
          responseType: 'blob'
        })

        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `matches_${document.filename}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      } catch (err) {
        setError('Export failed')
      } finally {
        setIsExporting(false)
      }
    }

    const getConfidenceColor = (confidence) => {
      if (confidence >= 0.9) return 'confidence-high'
      if (confidence >= 0.75) return 'confidence-medium'
      return 'confidence-low'
    }

    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading line items...</p>
        </div>
      )
    }

    return (
      <div className="processor-container">
        <div className="processor-header">
          <div className="header-left">
            <button onClick={onBack} className="back-button">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2>{document.filename}</h2>
              <p>Status: {document.status} • {lineItems.length} line items</p>
            </div>
          </div>

          <div className="header-actions">
            {!verified ? (
              <button
                onClick={handleVerify}
                disabled={isVerifying || Object.keys(selectedMatches).length === 0}
                className="button button-primary"
              >
                {isVerifying ? (
                  <>
                    <div className="spinner-small"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Verify Matches
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="button button-success"
              >
                {isExporting ? (
                  <>
                    <div className="spinner-small"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export CSV
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {verified && (
          <div className="alert alert-success">
            <Check className="alert-icon" />
            <p>Matches verified successfully! You can now export the results.</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <AlertCircle className="alert-icon" />
            <p>{error}</p>
          </div>
        )}

        <div className="line-items">
          {lineItems.map((item, index) => (
            <div key={item.id} className="line-item-card">
              <div className="line-item-header">
                <div className="item-number">{index + 1}</div>
                <div className="item-details">
                  <h3>Line Item {index + 1}</h3>
                  <p className="item-description">{item.description}</p>
                  <div className="item-metadata">
                    <span>Qty: {item.quantity}</span>
                    <span>Price: ${item.unit_price?.toFixed(2) || '0.00'}</span>
                    <span>Total: ${(item.quantity * (item.unit_price || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="matches-section">
                <h4>Product Matches ({item.matches.length})</h4>
                <div className="matches-list">
                  {item.matches.map((match, matchIndex) => (
                    <div
                      key={`${match.product_id}-${matchIndex}`}
                      className={`match-option ${selectedMatches[item.id] === match.product_id ? 'selected' : ''
                        } ${verified ? 'disabled' : ''}`}
                      onClick={() => !verified && handleMatchSelection(item.id, match.product_id)}
                    >
                      <div className="match-content">
                        <input
                          type="radio"
                          name={`item-${item.id}`}
                          checked={selectedMatches[item.id] === match.product_id}
                          onChange={() => !verified && handleMatchSelection(item.id, match.product_id)}
                          disabled={verified}
                        />
                        <div className="match-info">
                          <div className="match-header">
                            <span className="product-id">{match.product_id}</span>
                            <span className={`confidence-badge ${getConfidenceColor(match.confidence)}`}>
                              {Math.round(match.confidence * 100)}% match
                            </span>
                          </div>
                          <p className="match-description">{match.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {lineItems.length === 0 && (
          <div className="empty-state">
            <FileText size={48} />
            <p>No line items found in this document.</p>
          </div>
        )}
      </div>
    )
  }

  const DocumentList = ({ onSelectDocument }) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    React.useEffect(() => {
      fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const response = await axios.get('http://localhost:8000/documents')
        setDocuments(response.data)
      } catch (err) {
        setError('Failed to load documents')
      } finally {
        setLoading(false)
      }
    }

    const getStatusIcon = (status) => {
      switch (status) {
        case 'verified':
          return <Check className="status-icon status-verified" />
        case 'extracted':
          return <FileText className="status-icon status-processing" />
        default:
          return <AlertCircle className="status-icon status-failed" />
      }
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      )
    }

    return (
      <div className="documents-container">
        <div className="documents-header">
          <h2>Processed Documents</h2>
          <p>View and manage your uploaded purchase orders</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle className="alert-icon" />
            <p>{error}</p>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No documents processed yet</h3>
            <p>Upload a purchase order PDF to get started</p>
          </div>
        ) : (
          <div className="documents-list">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="document-item"
                onClick={() => onSelectDocument(doc)}
              >
                <div className="document-info">
                  <FileText className="document-icon" />
                  <div className="document-details">
                    <h4>{doc.filename}</h4>
                    <p>Uploaded {formatDate(doc.upload_time)} • {doc.items_count} items</p>
                  </div>
                </div>
                <div className="document-status">
                  {getStatusIcon(doc.status)}
                  <span>{doc.status === 'verified' ? 'Verified' : 'Ready for Review'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="documents-actions">
          <button onClick={fetchDocuments} className="button button-secondary">
            Refresh List
          </button>
        </div>
      </div>
    )
  }

  const handleDocumentUploaded = (document) => {
    setCurrentDocument(document)
    setCurrentView('process')
  }

  const handleSelectDocument = (document) => {
    setCurrentDocument(document)
    setCurrentView('process')
  }

  const handleBackToUpload = () => {
    setCurrentDocument(null)
    setCurrentView('upload')
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-content">
          <h1 className="nav-title">Endeavor Document Processor</h1>
          <div className="nav-buttons">
            <button
              onClick={() => setCurrentView('upload')}
              className={`nav-button ${currentView === 'upload' ? 'active' : ''}`}
            >
              Upload
            </button>
            <button
              onClick={() => setCurrentView('documents')}
              className={`nav-button ${currentView === 'documents' ? 'active' : ''}`}
            >
              Documents
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        {currentView === 'upload' && (
          <FileUpload onDocumentUploaded={handleDocumentUploaded} />
        )}

        {currentView === 'process' && currentDocument && (
          <DocumentProcessor
            document={currentDocument}
            onBack={handleBackToUpload}
          />
        )}

        {currentView === 'documents' && (
          <DocumentList onSelectDocument={handleSelectDocument} />
        )}
      </main>
    </div>
  )
}

export default App