import React from 'react';
import { useGrnClaims, useUpdateClaim } from '../api';
import { Table, Select, Input } from '@/components/ui';

export function ClaimsTab({ grnId }: { grnId: string }) {
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
      alert(e.response?.data?.message || 'Failed to update claim');
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">Loading claims...</div>
    );

  if (claims.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No rejected goods claims found for this GRN.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Claim ID
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Rejected Qty
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Value (ETB)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Resolution Type (BR13)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Notes
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
                {parseFloat(claim.valueEtb).toLocaleString()}
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
