import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';
import { useReverseCostEntry, type CostEntry } from '../api';

const formSchema = z.object({
  reason: z
    .string()
    .min(
      5,
      'A detailed reason (min 5 characters) is required for audit trails.',
    ),
});

type FormData = z.infer<typeof formSchema>;

export function ReverseEntryModal({
  entry,
  isOpen,
  onClose,
}: {
  entry: CostEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const reverseMutation = useReverseCostEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) form.reset();
  }, [isOpen, form]);

  const onSubmit = async (data: FormData) => {
    if (!entry) return;
    try {
      await reverseMutation.mutateAsync({
        id: entry.id,
        data: { reason: data.reason },
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reverse Cost Entry">
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
        <strong className="block mb-1">
          WARNING: Secure Financial Reversal
        </strong>
        You are about to cryptographically reverse an actualized ledger entry
        (ETB {parseFloat(entry.amountEtb).toLocaleString()}). This will create a
        negative offset entry and flag the original entry as reversed. This
        action is permanently audited.
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Reversal Reason (Audit Trail) *"
          {...form.register('reason')}
          error={form.formState.errors.reason?.message}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={reverseMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={reverseMutation.isPending}
          >
            Execute Reversal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
