import React, { useState } from 'react'
import { ChevronDown, Search, Package } from 'lucide-react'

const LineItemCard = ({ item, index, selectedMatch, onMatchSelect, disabled }) => {
    const [showAllMatches, setShowAllMatches] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const filteredMatches = item.matches.filter(match =>
        match.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.product_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const displayMatches = showAllMatches ? filteredMatches : filteredMatches.slice(0, 3)

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'text-green-600 bg-green-100'
        if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
        return 'text-red-600 bg-red-100'
    }

    return (
        <div className="bg-white rounded-lg shadow border">
            {/* Line Item Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-3">
                                {index}
                            </span>
                            <h3 className="text-lg font-medium text-gray-900">Line Item {index}</h3>
                        </div>
                        <p className="text-gray-700 mb-2">{item.description}</p>
                        <div className="flex space-x-4 text-sm text-gray-500">
                            <span>Quantity: {item.quantity}</span>
                            <span>Unit Price: ${item.unit_price?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                    <Package className="h-6 w-6 text-gray-400" />
                </div>
            </div>

            {/* Matches Section */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">
                        Product Matches ({item.matches.length})
                    </h4>

                    {item.matches.length > 3 && (
                        <button
                            onClick={() => setShowAllMatches(!showAllMatches)}
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                        >
                            {showAllMatches ? 'Show Less' : 'Show All'}
                            <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllMatches ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                {(showAllMatches || item.matches.length > 3) && (
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}

                {/* Matches List */}
                <div className="space-y-3">
                    {displayMatches.length > 0 ? (
                        displayMatches.map((match, matchIndex) => (
                            <div
                                key={`${match.product_id}-${matchIndex}`}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedMatch === match.product_id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                                onClick={() => !disabled && onMatchSelect(match.product_id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="radio"
                                                checked={selectedMatch === match.product_id}
                                                onChange={() => !disabled && onMatchSelect(match.product_id)}
                                                disabled={disabled}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <span className="ml-3 font-medium text-gray-900">
                                                {match.product_id}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 ml-7">{match.description}</p>
                                    </div>
                                    <div className="ml-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(match.confidence)}`}>
                                            {(match.confidence * 100).toFixed(0)}% match
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            {searchTerm ? 'No matches found for your search.' : 'No product matches found.'}
                        </div>
                    )}
                </div>

                {/* Show more indicator */}
                {!showAllMatches && filteredMatches.length > 3 && (
                    <div className="text-center mt-4">
                        <span className="text-sm text-gray-500">
                            {filteredMatches.length - 3} more matches available
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LineItemCard