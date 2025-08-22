'use client'

// User profile management component

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { User, Settings, Bell, Eye } from 'lucide-react'
import type { UserPreferences, StreamVaultUser } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getSubscriptionTierDisplayName, getSubscriptionStatusText } from '@/lib/auth/subscription'

export function UserProfile() {
    const { user, isLoaded } = useUser()
    const [isUpdating, setIsUpdating] = useState(false)

    // Initialize preferences with defaults, then update with user's existing preferences
    const defaultPreferences: UserPreferences = useMemo(() => ({
        theme: 'system',
        language: 'en',
        notifications: {
            email: true,
            push: true,
            streamStart: true,
            newFollower: true,
            chatMention: true,
        },
        privacy: {
            showOnlineStatus: true,
            allowDirectMessages: true,
            showViewingHistory: false,
        },
        streaming: {
            defaultQuality: '1080p',
            autoPlay: true,
            chatEnabled: true,
        },
    }), [])

    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)

    // Load user's existing preferences when component mounts
    useEffect(() => {
        if (user && user.unsafeMetadata?.preferences) {
            setPreferences({
                ...defaultPreferences,
                ...user.unsafeMetadata.preferences,
            })
        }
    }, [user, defaultPreferences])

    if (!isLoaded) {
        return <LoadingSpinner text="Loading profile..." />
    }

    if (!user) {
        return <div>Please sign in to view your profile.</div>
    }

    const streamVaultUser = transformClerkUser(user)

    const handleUpdatePreferences = async () => {
        setIsUpdating(true)
        try {
            // For user preferences, we should use unsafeMetadata since it's user-controlled
            // publicMetadata should only be updated from the backend for security
            await user.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    preferences,
                    updatedAt: new Date().toISOString(),
                },
            })
        } catch (error) {
            console.error('Failed to update preferences:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.imageUrl} alt={user.firstName || 'User'} />
                            <AvatarFallback>
                                {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-2xl">
                                {user.firstName} {user.lastName}
                            </CardTitle>
                            <CardDescription className="text-lg">
                                @{user.username || user.emailAddresses[0]?.emailAddress}
                            </CardDescription>
                            <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="secondary">
                                    {streamVaultUser.role}
                                </Badge>
                                <Badge variant={streamVaultUser.subscriptionStatus === 'active' ? 'default' : 'outline'}>
                                    {getSubscriptionTierDisplayName(streamVaultUser.subscriptionTier)}
                                </Badge>
                                <Badge variant="outline">
                                    {getSubscriptionStatusText(streamVaultUser.subscriptionStatus)}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Profile Tabs */}
            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>General</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Privacy</span>
                    </TabsTrigger>
                    <TabsTrigger value="streaming" className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Streaming</span>
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>
                                Manage your basic account settings and preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={user.firstName || ''}
                                        onChange={(e) => user.update({ firstName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={user.lastName || ''}
                                        onChange={(e) => user.update({ lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={user.username || ''}
                                    onChange={(e) => user.update({ username: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="theme">Theme</Label>
                                <Select
                                    value={preferences.theme}
                                    onValueChange={(value: 'light' | 'dark' | 'system') =>
                                        setPreferences(prev => ({ ...prev, theme: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="dark">Dark</SelectItem>
                                        <SelectItem value="system">System</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="language">Language</Label>
                                <Select
                                    value={preferences.language}
                                    onValueChange={(value) =>
                                        setPreferences(prev => ({ ...prev, language: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                        <SelectItem value="de">German</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>
                                Choose how you want to be notified about activity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="email-notifications">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive notifications via email
                                    </p>
                                </div>
                                <Switch
                                    id="email-notifications"
                                    checked={preferences.notifications.email}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            notifications: { ...prev.notifications, email: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="push-notifications">Push Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive push notifications in your browser
                                    </p>
                                </div>
                                <Switch
                                    id="push-notifications"
                                    checked={preferences.notifications.push}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            notifications: { ...prev.notifications, push: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="stream-start">Stream Start Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified when followed streamers go live
                                    </p>
                                </div>
                                <Switch
                                    id="stream-start"
                                    checked={preferences.notifications.streamStart}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            notifications: { ...prev.notifications, streamStart: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="new-follower">New Follower Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified when someone follows you
                                    </p>
                                </div>
                                <Switch
                                    id="new-follower"
                                    checked={preferences.notifications.newFollower}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            notifications: { ...prev.notifications, newFollower: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="chat-mention">Chat Mention Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified when mentioned in chat
                                    </p>
                                </div>
                                <Switch
                                    id="chat-mention"
                                    checked={preferences.notifications.chatMention}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            notifications: { ...prev.notifications, chatMention: checked }
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Privacy Settings */}
                <TabsContent value="privacy">
                    <Card>
                        <CardHeader>
                            <CardTitle>Privacy Settings</CardTitle>
                            <CardDescription>
                                Control your privacy and what others can see.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="show-online">Show Online Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Let others see when you&apos;re online
                                    </p>
                                </div>
                                <Switch
                                    id="show-online"
                                    checked={preferences.privacy.showOnlineStatus}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            privacy: { ...prev.privacy, showOnlineStatus: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="allow-dms">Allow Direct Messages</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Allow other users to send you direct messages
                                    </p>
                                </div>
                                <Switch
                                    id="allow-dms"
                                    checked={preferences.privacy.allowDirectMessages}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            privacy: { ...prev.privacy, allowDirectMessages: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="show-history">Show Viewing History</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Let others see what streams you&apos;ve watched
                                    </p>
                                </div>
                                <Switch
                                    id="show-history"
                                    checked={preferences.privacy.showViewingHistory}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            privacy: { ...prev.privacy, showViewingHistory: checked }
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Streaming Settings */}
                <TabsContent value="streaming">
                    <Card>
                        <CardHeader>
                            <CardTitle>Streaming Preferences</CardTitle>
                            <CardDescription>
                                Configure your streaming and viewing preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="default-quality">Default Video Quality</Label>
                                <Select
                                    value={preferences.streaming.defaultQuality}
                                    onValueChange={(value: '480p' | '720p' | '1080p' | '4K') =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            streaming: { ...prev.streaming, defaultQuality: value }
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="480p">480p</SelectItem>
                                        <SelectItem value="720p">720p</SelectItem>
                                        <SelectItem value="1080p">1080p</SelectItem>
                                        <SelectItem value="4K">4K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="auto-play">Auto-play Videos</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically start playing videos when you visit a stream
                                    </p>
                                </div>
                                <Switch
                                    id="auto-play"
                                    checked={preferences.streaming.autoPlay}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            streaming: { ...prev.streaming, autoPlay: checked }
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="chat-enabled">Enable Chat</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Show chat when watching streams
                                    </p>
                                </div>
                                <Switch
                                    id="chat-enabled"
                                    checked={preferences.streaming.chatEnabled}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({
                                            ...prev,
                                            streaming: { ...prev.streaming, chatEnabled: checked }
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleUpdatePreferences}
                    disabled={isUpdating}
                >
                    {isUpdating ? (
                        <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </div>
        </div>
    )
}

// Transform Clerk user to StreamVault user
function transformClerkUser(clerkUser: any): StreamVaultUser {
    const publicMetadata = clerkUser.publicMetadata || {}
    const unsafeMetadata = clerkUser.unsafeMetadata || {}

    return {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        username: clerkUser.username,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        // Role and subscription data should come from publicMetadata (backend controlled)
        role: publicMetadata.role || 'viewer',
        subscriptionTier: publicMetadata.subscriptionTier || null,
        subscriptionStatus: publicMetadata.subscriptionStatus || null,
        subscriptionId: publicMetadata.subscriptionId,
        customerId: publicMetadata.customerId,
        // User preferences come from unsafeMetadata (user controlled)
        preferences: unsafeMetadata.preferences,
        createdAt: new Date(clerkUser.createdAt),
        updatedAt: new Date(clerkUser.updatedAt),
    }
}