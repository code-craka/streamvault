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
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">User Management</h3>
        <p className="text-gray-400 text-sm">Manage user roles and permissions</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => {
              const displayName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.username || 'Anonymous'
              
              return (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {(user.firstName || user.username || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">
                          {displayName}
                        </div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      disabled={loading === user.id}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="streamer">Streamer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SubscriptionBadge 
                      tier={user.subscriptionTier} 
                      status={user.subscriptionStatus || undefined}
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.banned ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBanToggle(user.id, user.banned)}
                        disabled={loading === user.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          user.banned
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        } disabled:opacity-50`}
                      >
                        {loading === user.id ? '...' : user.banned ? 'Unban' : 'Ban'}
                      </button>
                      
                      <button
                        onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
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