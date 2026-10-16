import React, { useState } from 'react';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useDeactivateUser,
  type User,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDialog,
  Badge,
  Skeleton,
  ErrorState,
  FormError,
} from '@/components/ui';

// --- Schemas ---
const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.string().min(1),
  department: z.string().optional(),
  preferredLanguage: z.string().optional(),
  temporaryPassword: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

// --- Constants ---
const ROLES = [
  { label: 'System Admin', value: 'system_admin' },
  { label: 'General Manager', value: 'general_manager' },
  { label: 'Procurement Manager', value: 'procurement_manager' },
  { label: 'Procurement Officer', value: 'procurement_officer' },
  { label: 'Finance Manager', value: 'finance_manager' },
  { label: 'Finance Officer', value: 'finance_officer' },
  { label: 'Warehouse Manager', value: 'warehouse_manager' },
  { label: 'Customs Officer', value: 'customs_officer' },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Amharic', value: 'am' },
];

// --- Main Component ---
export function UsersPage() {
  const queryClient = useQueryClient();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  // Queries
  const { data: users, isLoading, isError, refetch } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetMutation = useResetPassword();
  const deactivateMutation = useDeactivateUser();

  // Form Handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const openCreate = () => {
    setEditingUser(null);
    reset({
      email: '',
      fullName: '',
      role: '',
      department: '',
      preferredLanguage: 'en',
      temporaryPassword: '',
    });
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    reset({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department || '',
      preferredLanguage: user.preferredLanguage || 'en',
      temporaryPassword: '', // Don't prefill passwords
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate(
        { id: editingUser.id, data },
        { onSuccess: () => setIsFormOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  // Table Columns
  const columns = [
    { header: 'Name', accessor: 'fullName' as keyof User, sortable: true },
    { header: 'Email', accessor: 'email' as keyof User },
    {
      header: 'Role',
      accessor: (row: User) => (
        <span className="capitalize">{row.role.replace('_', ' ')}</span>
      ),
    },
    { header: 'Department', accessor: (row: User) => row.department || '-' },
    {
      header: 'Status',
      accessor: (row: User) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEdit(row)}
            className="text-blue-600 hover:text-blue-900 font-medium text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => setResetUser(row)}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            Reset PW
          </button>
          {row.isActive && (
            <button
              onClick={() => setDeactivateUser(row)}
              className="text-red-600 hover:text-red-900 font-medium text-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError)
    return (
      <ErrorState message="Failed to load users" onRetry={() => refetch()} />
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Users Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage system users, roles, and access.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={openCreate}>Add User</Button>
        </div>
      </div>

      <Table columns={columns} data={users || []} />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError error={createMutation.error || updateMutation.error} />
          <Input
            label="Full Name"
            {...register('fullName')}
            error={errors.fullName?.message}
          />
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Select
            label="Role"
            options={ROLES}
            {...register('role')}
            error={errors.role?.message}
          />
          <Input
            label="Department"
            {...register('department')}
            error={errors.department?.message}
          />
          <Select
            label="Preferred Language"
            options={LANGUAGES}
            {...register('preferredLanguage')}
            error={errors.preferredLanguage?.message}
          />

          {!editingUser && (
            <Input
              label="Temporary Password"
              type="password"
              {...register('temporaryPassword')}
              error={errors.temporaryPassword?.message}
            />
          )}

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:ml-3 sm:w-auto"
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Reset Password for ${resetUser?.fullName}`}
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={resetPasswordVal}
            onChange={(e) => setResetPasswordVal(e.target.value)}
          />
          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={() =>
                resetUser &&
                resetMutation.mutate(
                  { id: resetUser.id, newPassword: resetPasswordVal },
                  {
                    onSuccess: () => {
                      setResetUser(null);
                      setResetPasswordVal('');
                    },
                  },
                )
              }
              isLoading={resetMutation.isPending}
              disabled={!resetPasswordVal}
              className="w-full sm:ml-3 sm:w-auto"
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              onClick={() => setResetUser(null)}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deactivateUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deactivateUser?.fullName}? They will immediately lose access to the system.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={deactivateMutation.isPending}
        onConfirm={() =>
          deactivateUser &&
          deactivateMutation.mutate(deactivateUser.id, {
            onSuccess: () => setDeactivateUser(null),
          })
        }
        onClose={() => setDeactivateUser(null)}
      />
    </div>
  );
}
