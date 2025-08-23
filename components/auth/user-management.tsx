'use client'

import { useState } from 'react'
import { UserRole, SubscriptionTier } from '@/types/auth'
import { SubscriptionBadge } from './role-badge'
import { setUserRole, banUser, unbanUser } from '@/lib/auth/clerk-config'

interface UserData {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: string | null
  banned: boolean
  createdAt: Date
  lastActiveAt?: Date
}

interface UserManagementProps {
  users: UserData[]
  onUserUpdate?: () => void
}

export function UserManagement({ users, onUserUpdate }: UserManagementProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(userId)
    try {
      await setUserRole(userId, newRole)
      onUserUpdate?.()
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('Failed to update user role')
    } finally {
      setLoading(null)
    }
  }

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    setLoading(userId)
    try {
      if (isBanned) {
        await unbanUser(userId)
      } else {
        await banUser(userId)
      }
      onUserUpdate?.()
    } catch (error) {
      console.error('Failed to update user ban status:', error)
      alert('Failed to update user ban status')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800">
      <div className="border-b border-gray-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">User Management</h3>
        <p className="text-sm text-gray-400">
          Manage user roles and permissions
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map(user => {
              const displayName =
                user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.username || 'Anonymous'

              return (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        <span className="text-sm font-semibold text-white">
                          {(user.firstName || user.username || user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">
                          {displayName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <select
                      value={user.role}
                      onChange={e =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                      disabled={loading === user.id}
                      className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="streamer">Streamer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <SubscriptionBadge
                      tier={user.subscriptionTier}
                      status={user.subscriptionStatus || undefined}
                    />
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {user.banned ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBanToggle(user.id, user.banned)}
                        disabled={loading === user.id}
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                          user.banned
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        } disabled:opacity-50`}
                      >
                        {loading === user.id
                          ? '...'
                          : user.banned
                            ? 'Unban'
                            : 'Ban'}
                      </button>

                      <button
                        onClick={() =>
                          setSelectedUser(
                            selectedUser === user.id ? null : user.id
                          )
                        }
                        className="rounded bg-gray-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
