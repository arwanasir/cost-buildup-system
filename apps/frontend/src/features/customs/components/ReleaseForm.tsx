import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';

const releaseSchema = z.object({
  releaseDate: z.string().min(1, 'Release date is required'),
  releaseReference: z.string().min(1, 'Release reference is required'),
  customsOfficer: z.string().optional(),
});

type ReleaseFormData = z.infer<typeof releaseSchema>;

interface ReleaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReleaseFormData) => Promise<void>;
  isLoading: boolean;
}

export function ReleaseForm({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: ReleaseFormProps) {
  const localize = useUiText();
  const form = useForm<ReleaseFormData>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      releaseDate: new Date().toISOString().split('T')[0],
      releaseReference: '',
      customsOfficer: '',
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (isOpen) {
      reset({
        releaseDate: new Date().toISOString().split('T')[0],
        releaseReference: '',
        customsOfficer: '',
      });
    }
  }, [isOpen, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={localize('Log Customs Release')}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={localize('Release Date *')}
          type="date"
          {...form.register('releaseDate')}
          error={form.formState.errors.releaseDate?.message}
        />
        <Input
          label={localize('Release Reference / Document # *')}
          {...form.register('releaseReference')}
          error={form.formState.errors.releaseReference?.message}
        />
        <Input
          label={localize('Customs Officer Name (Optional)')}
          {...form.register('customsOfficer')}
          error={form.formState.errors.customsOfficer?.message}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            <LocalizedText text={'\n            Cancel\n          '} />
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <LocalizedText text={'\n            Confirm Release\n          '} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
