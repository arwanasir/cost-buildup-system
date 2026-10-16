import React, { useState } from 'react';
import {
  useShipmentDocumentChecklist,
  useUploadShipmentDocument,
  useDeleteShipmentDocument,
} from '../api';
import {
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  ErrorState,
  PermissionGate,
} from '@/components/ui';

const DOCUMENT_TYPES = [
  { label: 'Commercial Invoice (CI)', value: 'ci' },
  { label: 'Bill of Lading (B/L)', value: 'bl' },
  { label: 'Air Waybill (AWB)', value: 'awb' },
  { label: 'Packing List', value: 'packing_list' },
  { label: 'Certificate of Origin', value: 'coo' },
  { label: 'Insurance Certificate', value: 'insurance' },
  { label: 'Phytosanitary Certificate', value: 'phytosanitary' },
  { label: 'Other', value: 'other' },
];

export function DocumentsTab({ shipmentId }: { shipmentId: string }) {
  const {
    data: checklistData,
    isLoading,
    isError,
    refetch,
  } = useShipmentDocumentChecklist(shipmentId);
  const uploadDoc = useUploadShipmentDocument();
  const deleteDoc = useDeleteShipmentDocument();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('ci');
  const [docRef, setDocRef] = useState('');

  const checklistObj = checklistData?.data;

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (isError || !checklistObj)
    return (
      <ErrorState
        message="Failed to load documents"
        onRetry={() => refetch()}
      />
    );

  const { checklist, summary } = checklistObj;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadDoc.mutateAsync({
        shipmentId,
        file: selectedFile,
        documentType: docType,
        documentRef: docRef,
      });
      setSelectedFile(null);
      setDocRef('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?'))
      return;
    try {
      await deleteDoc.mutateAsync({ shipmentId, docId });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <PermissionGate permission="shipment:write">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 border-dashed">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Upload New Document
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Select
              label="Document Type"
              options={DOCUMENT_TYPES}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            />
            <Input
              label="Reference Number (Optional)"
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              placeholder="e.g., INV-001"
            />
            <div className="col-span-1 md:col-span-2 flex items-center gap-4">
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-md p-1 bg-white"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile}
                isLoading={uploadDoc.isPending}
                variant="primary"
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      </PermissionGate>

      {/* Checklist Summary */}
      <div className="flex items-center gap-4 py-2 border-b">
        <h4 className="text-lg font-medium text-gray-900">
          Required Checklist
        </h4>
        <Badge variant={summary.status === 'complete' ? 'success' : 'warning'}>
          {summary.totalUploaded} of {summary.totalRequired} Required Uploaded
        </Badge>
      </div>

      {/* Document Grid */}
      {checklist.length === 0 ? (
        <p className="text-sm text-gray-500">
          No documents required or uploaded.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklist.map((item: any) => (
            <div
              key={item.documentType}
              className={`border rounded-lg p-4 shadow-sm ${item.isPending ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="font-medium text-gray-900 uppercase">
                    {item.documentType.replace('_', ' ')}
                  </h5>
                  {item.isRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                      REQUIRED
                    </span>
                  )}
                </div>
                {item.isPending ? (
                  <Badge variant="warning">Missing</Badge>
                ) : (
                  <Badge variant="success">Fulfilled</Badge>
                )}
              </div>

              {item.uploadedFiles && item.uploadedFiles.length > 0 ? (
                <ul className="space-y-3">
                  {item.uploadedFiles.map((file: any) => (
                    <li
                      key={file.id}
                      className="flex flex-col gap-2 p-3 bg-gray-50 border rounded text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className="font-medium text-gray-900 truncate max-w-[200px]"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                        <PermissionGate permission="shipment:write">
                          <button
                            onClick={() => handleDelete(file.id)}
                            disabled={deleteDoc.isPending}
                            className="text-red-600 hover:text-red-900 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </PermissionGate>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {file.referenceNumber
                            ? `Ref: ${file.referenceNumber}`
                            : 'No Ref'}
                        </span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          View File ↗
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm italic">
                  Awaiting Upload
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
