import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { useGrnClaims, useUpdateClaim } from '../api';
import { Table, Select, Input, Toast } from '@/components/ui';
import { formatAmount4 } from '@/lib/money';

export function ClaimsTab({ grnId }: { grnId: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: claimsResponse, isLoading } = useGrnClaims(grnId);
  const claims = Array.isArray(claimsResponse)
    ? claimsResponse
    : claimsResponse?.data || [];

  const updateClaimMutation = useUpdateClaim();

  const handleUpdate = async (id: string, field: string, value: string) => {
    try {
      await updateClaimMutation.mutateAsync({
        id,
        data: { [field]: value },
      });
    } catch (e: any) {
      const message = e.response?.data?.message || 'Failed to update claim';
      setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">
        <LocalizedText text={'Loading claims...'} />
      </div>
    );

  if (claims.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <LocalizedText
          text={
            '\n        No rejected goods claims found for this GRN.\n      '
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
      <Table>
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              Claim ID\n            '} />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Rejected Qty\n            '}
              />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Value (ETB)\n            '}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Resolution Type (BR13)\n            '}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              Status\n            '} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              Notes\n            '} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {claims.map((claim: any) => (
            <tr key={claim.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 text-sm">
                {claim.id.slice(0, 8)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                {parseFloat(claim.quantity).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                {formatAmount4(claim.valueEtb)}
              </td>
              <td className="px-4 py-3">
                <Select
                  value={claim.claimType}
                  onChange={(e) =>
                    handleUpdate(claim.id, 'claimType', e.target.value)
                  }
                  options={[
                    { label: 'Supplier Claim', value: 'supplier_claim' },
                    { label: 'Write-off', value: 'write_off' },
                  ]}
                  disabled={updateClaimMutation.isPending}
                />
              </td>
              <td className="px-4 py-3">
                <Select
                  value={claim.status}
                  onChange={(e) =>
                    handleUpdate(claim.id, 'status', e.target.value)
                  }
                  options={[
                    { label: 'Open', value: 'open' },
                    { label: 'Closed', value: 'closed' },
                  ]}
                  disabled={updateClaimMutation.isPending}
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  defaultValue={claim.notes || ''}
                  onBlur={(e) =>
                    handleUpdate(claim.id, 'notes', e.target.value)
                  }
                  placeholder="Resolution notes..."
                  disabled={updateClaimMutation.isPending}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
