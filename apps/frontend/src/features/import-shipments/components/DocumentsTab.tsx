import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useRef, useState } from 'react';
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
  { label: 'Packing List', value: 'packing_list' },
  { label: 'Certificate of Origin', value: 'coo' },
  { label: 'Insurance Certificate', value: 'insurance_certificate' },
  { label: 'Customs Declaration', value: 'customs_declaration' },
  { label: 'Release Note', value: 'release_note' },
  { label: 'Inspection Report', value: 'inspection_report' },
  { label: 'Other', value: 'other' },
];

export function DocumentsTab({ shipmentId }: { shipmentId: string }) {
  const localize = useUiText();
  const {
    data: checklistData,
    isLoading,
    isError,
    refetch,
  } = useShipmentDocumentChecklist(shipmentId);
  const uploadDoc = useUploadShipmentDocument();
  const deleteDoc = useDeleteShipmentDocument();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('bl');
  const [docRef, setDocRef] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checklistObj = checklistData?.data;

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (isError || !checklistObj)
    return (
      <ErrorState
        message={localize('Failed to load documents')}
        onRetry={() => refetch()}
      />
    );

  const { checklist, summary } = checklistObj;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadError(null);
    setUploadSuccess(false);
    try {
      await uploadDoc.mutateAsync({
        shipmentId,
        file: selectedFile,
        documentType: docType,
        documentRef: docRef,
      });
      setSelectedFile(null);
      setDocRef('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadSuccess(true);
    } catch (e) {
      console.error(e);
      const error = e as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const serverMessage = error.response?.data?.message;
      setUploadError(
        Array.isArray(serverMessage)
          ? serverMessage.join('; ')
          : serverMessage ||
              error.message ||
              localize('Unable to upload document.'),
      );
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
            <LocalizedText
              text={'\n            Upload New Document\n          '}
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Select
              label={localize('Document Type')}
              options={DOCUMENT_TYPES}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            />
            <Input
              label={localize('Reference Number (Optional)')}
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              placeholder={localize('e.g., INV-001')}
            />
            <div className="col-span-1 md:col-span-2 flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-md p-1 bg-white"
              />
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile}
                isLoading={uploadDoc.isPending}
                variant="primary"
              >
                <LocalizedText
                  text={'\n                Upload\n              '}
                />
              </Button>
            </div>
          </div>
          {uploadError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {localize('Document upload failed.')} {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p role="status" className="mt-3 text-sm text-green-700">
              {localize('Document uploaded successfully.')}
            </p>
          )}
        </div>
      </PermissionGate>

      {/* Checklist Summary */}
      <div className="flex items-center gap-4 py-2 border-b">
        <h4 className="text-lg font-medium text-gray-900">
          <LocalizedText text={'\n          Required Checklist\n        '} />
        </h4>
        <Badge variant={summary.allRequiredUploaded ? 'success' : 'warning'}>
          {summary.totalUploaded} <LocalizedText text={' of '} />
          {summary.totalRequired}{' '}
          <LocalizedText text={' Required Uploaded\n        '} />
        </Badge>
      </div>

      {/* Document Grid */}
      {checklist.length === 0 ? (
        <p className="text-sm text-gray-500">
          <LocalizedText
            text={'\n          No documents required or uploaded.\n        '}
          />
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
                    <LocalizedText
                      text={item.documentType.replace(/_/g, ' ')}
                    />
                  </h5>
                  {item.isRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                      <LocalizedText
                        text={
                          '\n                      REQUIRED\n                    '
                        }
                      />
                    </span>
                  )}
                </div>
                {item.isPending ? (
                  <Badge variant="warning">
                    <LocalizedText text={'Missing'} />
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <LocalizedText text={'Fulfilled'} />
                  </Badge>
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
                            <LocalizedText
                              text={
                                '\n                            Delete\n                          '
                              }
                            />
                          </button>
                        </PermissionGate>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          <LocalizedText
                            text={
                              file.referenceNumber
                                ? `Ref: ${file.referenceNumber}`
                                : 'No Ref'
                            }
                          />
                        </span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          <LocalizedText
                            text={
                              '\n                          View File ↗\n                        '
                            }
                          />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm italic">
                  <LocalizedText
                    text={
                      '\n                  Awaiting Upload\n                '
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
