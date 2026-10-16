import React from 'react';
import { type LetterOfCredit, useMarkDocumentReceived } from '../api';
import { Badge, PermissionGate } from '@/components/ui';

export function RequiredDocumentsChecklist({ lc }: { lc: LetterOfCredit }) {
  const markDoc = useMarkDocumentReceived();

  const toggleDoc = async (docId: string, current: boolean) => {
    try {
      await markDoc.mutateAsync({ id: lc.id, docId, isReceived: !current });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Customs & Shipping Documents
        </h3>
      </div>
      <div className="px-4 py-5">
        <ul className="space-y-4">
          {lc.documents?.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between p-3 border rounded bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-900 uppercase">
                {doc.documentType.replace(/_/g, ' ')}
              </span>
              <PermissionGate
                permission="lc:write"
                fallback={
                  <Badge variant={doc.isReceived ? 'success' : 'warning'}>
                    {doc.isReceived ? 'Received' : 'Pending'}
                  </Badge>
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${doc.isReceived ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {doc.isReceived ? 'RECEIVED' : 'PENDING'}
                  </span>
                  <button
                    onClick={() => toggleDoc(doc.id, doc.isReceived)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${doc.isReceived ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${doc.isReceived ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </PermissionGate>
            </li>
          ))}
          {(!lc.documents || lc.documents.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              No customs documents strictly required for this instrument.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
