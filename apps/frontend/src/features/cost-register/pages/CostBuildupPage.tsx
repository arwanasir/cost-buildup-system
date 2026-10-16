import React, { useState } from 'react';
import { PageHeader, Badge } from '@/components/ui';
import { useShipments } from '@/features/import-shipments/api';
import { CostRegister } from '../components/CostRegister';

export function CostBuildupPage() {
  const { data: shipmentsResponse, isLoading } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );

  // useShipments returns axios response with { data } inside if not configured cleanly,
  // wait, the hook returns `res => res.data` so data is an array of Shipment or a paginated object.
  // Wait, let's assume `shipmentsResponse` is the array or { data: Shipment[] }
  const shipments = Array.isArray(shipmentsResponse)
    ? shipmentsResponse
    : (shipmentsResponse as any)?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Buildup & Register"
        description="Aggregate and allocate all imported costs for landing calculations"
      />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
        {/* Left Panel: Shipments List */}
        <div className="w-full lg:w-1/3 bg-white rounded-lg shadow border flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-medium">
            Select Shipment
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Loading shipments...
              </div>
            ) : shipments.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No shipments found.
              </div>
            ) : (
              shipments.map((shipment: any) => (
                <button
                  key={shipment.id}
                  onClick={() => setSelectedShipmentId(shipment.id)}
                  className={`w-full text-left p-4 rounded-md border transition-colors ${
                    selectedShipmentId === shipment.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-900">
                      {shipment.shipmentNumber}
                    </span>
                    <Badge
                      variant={
                        shipment.status === 'cleared' ? 'success' : 'default'
                      }
                    >
                      {shipment.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    PO: {shipment.po?.poNumber || 'N/A'}
                  </div>
                  {shipment.finalised ? (
                    <Badge variant="success">Finalised</Badge>
                  ) : (
                    <Badge variant="warning">Open Register</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Cost Register Details */}
        <div className="w-full lg:w-2/3 bg-white rounded-lg shadow border overflow-y-auto p-6">
          {selectedShipmentId ? (
            <CostRegister
              shipmentId={selectedShipmentId}
              isFinalised={
                shipments.find((s: any) => s.id === selectedShipmentId)
                  ?.finalised
              }
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a shipment from the left panel to view its cost register
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
