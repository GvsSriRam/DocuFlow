import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Check, AlertCircle } from 'lucide-react'
import axios from 'axios'
import LineItemCard from './LineItemCard'

const DocumentProcessor = ({ document, onBack }) => {
    const [lineItems, setLineItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedMatches, setSelectedMatches] = useState({})
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [verified, setVerified] = useState(false)

    useEffect(() => {
        fetchLineItems()
    }, [document.id])

    const fetchLineItems = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`http://localhost:8000/documents/${document.id}/items`)
            setLineItems(response.data.line_items)

            // Initialize selected matches (first match for each item)
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

    const handleMatchSelection = (lineItemId, productId) => {
        setSelectedMatches(prev => ({
            ...prev,
            [lineItemId]: productId
        }))
    }

    const handleVerifyMatches = async () => {
        setIsSaving(true)
        try {
            const verifiedItems = Object.entries(selectedMatches).map(([lineItemId, productId]) => ({
                line_item_id: parseInt(lineItemId),
                selected_product_id: productId
            }))

            await axios.post(`http://localhost:8000/documents/${document.id}/verify`, {
                verified_items: verifiedItems
            })

            setVerified(true)
        } catch (err) {
            setError('Failed to save verification')
        } finally {
            setIsSaving(false)
        }
    }

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const response = await axios.get(`http://localhost:8000/documents/${document.id}/export`, {
                responseType: 'blob'
            })

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `matches_${document.filename}_${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err) {
            setError('Failed to export matches')
        } finally {
            setIsExporting(false)
        }
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <button
                            onClick={onBack}
                            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{document.filename}</h2>
                            <p className="text-sm text-gray-500">
                                Status: {document.status} • {lineItems.length} line items
                            </p>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        {!verified ? (
                            <button
                                onClick={handleVerifyMatches}
                                disabled={isSaving || Object.keys(selectedMatches).length === 0}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Verify Matches
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Success/Error Messages */}
                {verified && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex">
                            <Check className="h-5 w-5 text-green-400" />
                            <div className="ml-3">
                                <p className="text-sm text-green-800">
                                    Matches verified successfully! You can now export the results.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Line Items */}
                <div className="space-y-6">
                    {lineItems.map((item, index) => (
                        <LineItemCard
                            key={item.id}
                            item={item}
                            index={index + 1}
                            selectedMatch={selectedMatches[item.id]}
                            onMatchSelect={(productId) => handleMatchSelection(item.id, productId)}
                            disabled={verified}
                        />
                    ))}
                </div>

                {lineItems.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No line items found in this document.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DocumentProcessor