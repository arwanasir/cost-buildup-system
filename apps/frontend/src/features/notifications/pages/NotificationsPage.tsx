import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return (res.data.data || res.data) as Notification[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message="Failed to load notifications"
        onRetry={() => refetch()}
      />
    );

  const notifications = data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Notifications
        </h2>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="secondary"
            onClick={() => markAllAsRead.mutate()}
            isLoading={markAllAsRead.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <div
                  className={`px-4 py-4 sm:px-6 ${!notification.isRead ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium truncate ${!notification.isRead ? 'text-blue-600' : 'text-gray-900'}`}
                    >
                      {notification.title}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex items-center gap-4">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-gray-500">
                        {format(
                          new Date(notification.createdAt),
                          'MMM d, yyyy HH:mm',
                        )}
                      </p>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead.mutate(notification.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          disabled={markAsRead.isPending}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
