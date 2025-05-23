import React, { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import axios from 'axios'

const FileUpload = ({ onDocumentUploaded }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

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
        if (files.length > 0) {
            handleFileUpload(files[0])
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            handleFileUpload(file)
        }
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
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            onDocumentUploaded(response.data)
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="px-4 py-6">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Upload Purchase Order
                    </h2>
                    <p className="text-lg text-gray-600">
                        Upload a PDF purchase order to automatically extract and match line items
                    </p>
                </div>

                <div
                    className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-lg font-medium text-gray-900">Processing document...</p>
                            <p className="text-sm text-gray-500">This may take a few moments</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Upload className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">
                                Drop your PDF here, or click to browse
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports PDF files up to 10MB
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Supported File Names
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Easy</h4>
                            <ul className="space-y-1 text-gray-600">
                                <li>Easy - 1.pdf</li>
                                <li>Easy - 2.pdf</li>
                                <li>Easy - 3.pdf</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Medium</h4>
                            <ul className="space-y-1 text-gray-600">
                                <li>Medium - 1.pdf</li>
                                <li>Medium - 2.pdf</li>
                                <li>Medium - 3.pdf</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Hard</h4>
                            <ul className="space-y-1 text-gray-600">
                                <li>Hard - 1.pdf</li>
                                <li>Hard - 2.pdf</li>
                                <li>Hard - 3.pdf</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FileUpload