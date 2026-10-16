import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  type Supplier,
  useCreateSupplier,
  useUpdateSupplier,
  useAddBankAccount,
  useUpdateBankAccount,
  useRemoveBankAccount,
} from '../api';
import { Modal, Button, Input, Select, FormError } from '@/components/ui';
import { api } from '@/lib/api-client';

const CURRENCIES = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CNY', value: 'CNY' },
  { label: 'AED', value: 'AED' },
  { label: 'ETB', value: 'ETB' },
];

const bankAccountSchema = z.object({
  id: z.string().optional(), // Existing accounts will have this
  bankName: z.string().min(2, 'Bank name is required'),
  swift: z.string().optional(),
  ibanOrAccount: z.string().min(5, 'IBAN/Account is required'),
  currency: z.string().length(3),
  isDefault: z.boolean().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  country: z.string().optional(),
  tin: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  paymentTerms: z.string().optional(),
  defaultCurrency: z.string().min(3).max(3),
  leadTimeDays: z.number().min(0),
  bankAccounts: z.array(bankAccountSchema).optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null; // null if creating new
}

export function SupplierFormModal({ isOpen, onClose, supplier }: Props) {
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const addBankMutation = useAddBankAccount();
  const updateBankMutation = useUpdateBankAccount();
  const removeBankMutation = useRemoveBankAccount();

  const [activeTab, setActiveTab] = React.useState('details');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      bankAccounts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bankAccounts',
  });

  // Fetch full supplier details (including bank accounts) if editing
  useEffect(() => {
    if (supplier && isOpen) {
      api.get(`/suppliers/${supplier.id}`).then((res) => {
        const fullData = res.data;
        reset({
          name: fullData.name,
          country: fullData.country || '',
          tin: fullData.tin || '',
          contactPerson: fullData.contactPerson || '',
          phone: fullData.phone || '',
          email: fullData.email || '',
          paymentTerms: fullData.paymentTerms || '',
          defaultCurrency: fullData.defaultCurrency,
          leadTimeDays: fullData.leadTimeDays,
          bankAccounts:
            fullData.bankAccounts
              ?.filter((b: any) => b.isActive)
              .map((b: any) => ({
                id: b.id,
                bankName: b.bankName,
                swift: b.swift || '',
                ibanOrAccount: b.ibanOrAccount,
                currency: b.currency,
                isDefault: b.isDefault,
              })) || [],
        });
      });
    } else if (isOpen) {
      reset({
        name: '',
        country: '',
        tin: '',
        contactPerson: '',
        phone: '',
        email: '',
        paymentTerms: 'LC at Sight',
        defaultCurrency: 'USD',
        leadTimeDays: 30,
        bankAccounts: [],
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('details');
    }
  }, [supplier, isOpen, reset]);

  const onSubmit = async (formData: SupplierFormData) => {
    const payload = { ...formData };
    if (!payload.email) delete payload.email;
    const { bankAccounts, ...coreData } = payload;

    try {
      let supplierId = supplier?.id;

      // 1. Save Core Details
      if (supplierId) {
        await updateMutation.mutateAsync({ id: supplierId, data: coreData });
      } else {
        const res = await createMutation.mutateAsync(coreData);
        supplierId = res.data.id;
      }

      // 2. Sync Bank Accounts
      if (supplierId) {
        const existingAccounts = supplier?.bankAccounts || [];

        // Add or Update
        for (const account of bankAccounts || []) {
          if (account.id) {
            // Update existing
            await updateBankMutation.mutateAsync({
              supplierId,
              accountId: account.id,
              data: account,
            });
          } else {
            // Add new
            await addBankMutation.mutateAsync({
              supplierId,
              data: account,
            });
          }
        }

        // Delete removed
        if (supplier) {
          const submittedIds = new Set(
            bankAccounts?.map((a) => a.id).filter(Boolean),
          );
          for (const existing of existingAccounts) {
            if (!submittedIds.has(existing.id)) {
              await removeBankMutation.mutateAsync({
                supplierId,
                accountId: existing.id,
              });
            }
          }
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save supplier', err);
    }
  };

  const tabs = [
    { id: 'details', label: 'Supplier Details' },
    { id: 'banking', label: 'Bank Accounts' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'Add New Supplier'}
      size="xl"
    >
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormError
          error={
            createMutation.error ||
            updateMutation.error ||
            addBankMutation.error ||
            updateBankMutation.error ||
            removeBankMutation.error
          }
        />
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier Name *"
              {...register('name')}
              error={errors.name?.message}
            />
            <Input
              label="Country"
              {...register('country')}
              error={errors.country?.message}
            />
            <Input
              label="TIN"
              {...register('tin')}
              error={errors.tin?.message}
            />
            <Input
              label="Contact Person"
              {...register('contactPerson')}
              error={errors.contactPerson?.message}
            />
            <Input
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Phone Number"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Input
              label="Payment Terms"
              {...register('paymentTerms')}
              error={errors.paymentTerms?.message}
              placeholder="e.g. LC at Sight"
            />
            <Select
              label="Default Currency *"
              options={CURRENCIES}
              {...register('defaultCurrency')}
              error={errors.defaultCurrency?.message}
            />
            <Input
              label="Lead Time (Days) *"
              type="number"
              {...register('leadTimeDays', { valueAsNumber: true })}
              error={errors.leadTimeDays?.message}
            />
          </div>
        )}

        {activeTab === 'banking' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Manage Banking Instructions
              </h4>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  append({
                    bankName: '',
                    swift: '',
                    ibanOrAccount: '',
                    currency: 'USD',
                    isDefault: false,
                  })
                }
              >
                + Add Bank Account
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4 border rounded-md bg-gray-50">
                No bank accounts added yet.
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative bg-gray-50 border border-gray-200 rounded-md p-4"
                  >
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                      title="Remove Account"
                    >
                      ✕
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <Input
                        label="Bank Name *"
                        {...register(`bankAccounts.${index}.bankName`)}
                        error={errors.bankAccounts?.[index]?.bankName?.message}
                      />
                      <Input
                        label="SWIFT / BIC"
                        {...register(`bankAccounts.${index}.swift`)}
                      />
                      <Input
                        label="IBAN / Account Number *"
                        {...register(`bankAccounts.${index}.ibanOrAccount`)}
                        error={
                          errors.bankAccounts?.[index]?.ibanOrAccount?.message
                        }
                      />
                      <Select
                        label="Currency *"
                        options={CURRENCIES}
                        {...register(`bankAccounts.${index}.currency`)}
                        error={errors.bankAccounts?.[index]?.currency?.message}
                      />

                      <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id={`default-bank-${index}`}
                          {...register(`bankAccounts.${index}.isDefault`)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`default-bank-${index}`}
                          className="text-sm font-medium text-gray-700"
                        >
                          Set as default account for{' '}
                          {CURRENCIES.find(
                            (c) =>
                              c.value ===
                              control._formValues.bankAccounts?.[index]
                                ?.currency,
                          )?.label || 'this currency'}
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-5 border-t border-gray-200 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            isLoading={
              createMutation.isPending ||
              updateMutation.isPending ||
              addBankMutation.isPending ||
              updateBankMutation.isPending ||
              removeBankMutation.isPending
            }
            className="w-full sm:ml-3 sm:w-auto"
          >
            {supplier ? 'Save Supplier & Accounts' : 'Create Supplier'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
