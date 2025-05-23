import React, { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'

const DocumentList = ({ onSelectDocument }) => {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
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
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'extracted':
                return <Clock className="h-5 w-5 text-yellow-500" />
            case 'uploaded':
                return <Clock className="h-5 w-5 text-blue-500" />
            default:
                return <XCircle className="h-5 w-5 text-red-500" />
        }
    }

    const getStatusText = (status) => {
        switch (status) {
            case 'verified':
                return 'Verified'
            case 'extracted':
                return 'Ready for Review'
            case 'uploaded':
                return 'Processing'
            default:
                return 'Failed'
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString()
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="px-4 py-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Processed Documents</h2>
                    <p className="text-gray-600">View and manage your uploaded purchase orders</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by uploading a purchase order PDF.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {documents.map((document) => (
                                <li key={document.id}>
                                    <button
                                        onClick={() => onSelectDocument(document)}
                                        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <FileText className="h-6 w-6 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {document.filename}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Uploaded {formatDate(document.upload_time)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                {getStatusIcon(document.status)}
                                                <span className="ml-2 text-sm text-gray-700">
                                                    {getStatusText(document.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {documents.length > 0 && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={fetchDocuments}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DocumentList