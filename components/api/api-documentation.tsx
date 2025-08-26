'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  permissions: string[]
  parameters?: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  requestBody?: {
    type: string
    properties: Record<
      string,
      {
        type: string
        required: boolean
        description: string
      }
    >
  }
  responses: {
    status: number
    description: string
    example: any
  }[]
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/streams',
    description: 'Get list of streams with pagination and filtering',
    permissions: ['stream:read'],
    parameters: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: 'Page number (default: 1)',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Items per page (default: 20, max: 100)',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by status (active, inactive, ended)',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        description: 'Filter by category',
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Success',
        example: {
          data: [
            {
              id: 'stream_123',
              title: 'My Live Stream',
              description: 'A great live stream',
              status: 'active',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5,
          },
        },
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/streams',
    description: 'Create a new stream',
    permissions: ['stream:create'],
    requestBody: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          required: true,
          description: 'Stream title (1-200 characters)',
        },
        description: {
          type: 'string',
          required: false,
          description: 'Stream description (max 1000 characters)',
        },
        category: {
          type: 'string',
          required: false,
          description: 'Stream category',
        },
        isPrivate: {
          type: 'boolean',
          required: false,
          description: 'Whether stream is private (default: false)',
        },
        scheduledStartTime: {
          type: 'string',
          required: false,
          description: 'ISO datetime for scheduled streams',
        },
      },
    },
    responses: [
      {
        status: 201,
        description: 'Stream created successfully',
        example: {
          data: {
            id: 'stream_123',
            title: 'My New Stream',
            status: 'inactive',
            streamKey: 'sk_live_...',
            rtmpUrl: 'rtmp://ingest.streamvault.app/live',
            createdAt: '2024-01-01T00:00:00Z',
          },
          message: 'Stream created successfully',
        },
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/white-label/instances',
    description: 'Get list of white-label instances (admin only)',
    permissions: ['admin:all'],
    responses: [
      {
        status: 200,
        description: 'Success',
        example: {
          data: [
            {
              instanceId: 'instance_123',
              branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#10B981',
                companyName: 'My Company',
              },
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        },
      },
    ],
  },
]

export function APIDocumentation() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint>(
    API_ENDPOINTS[0]
  )
  const [apiKey, setApiKey] = useState('')
  const [testRequest, setTestRequest] = useState('')
  const [testResponse, setTestResponse] = useState('')

  const handleTestRequest = async () => {
    if (!apiKey) {
      setTestResponse('Error: API key is required')
      return
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}${selectedEndpoint.path}`
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }

      if (selectedEndpoint.method !== 'GET' && testRequest) {
        options.body = testRequest
      }

      const response = await fetch(url, options)
      const data = await response.json()

      setTestResponse(
        JSON.stringify(
          {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: data,
          },
          null,
          2
        )
      )
    } catch (error) {
      setTestResponse(`Error: ${error}`)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          StreamVault API Documentation
        </h1>
        <p className="text-gray-600">
          Comprehensive API documentation for integrating with StreamVault's
          streaming platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Endpoint List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Select an endpoint to view details and test it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {API_ENDPOINTS.map((endpoint, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedEndpoint(endpoint)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedEndpoint === endpoint
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        endpoint.method === 'GET'
                          ? 'default'
                          : endpoint.method === 'POST'
                            ? 'secondary'
                            : endpoint.method === 'PUT'
                              ? 'outline'
                              : 'destructive'
                      }
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    {endpoint.description}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Endpoint Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedEndpoint.method === 'GET'
                          ? 'default'
                          : selectedEndpoint.method === 'POST'
                            ? 'secondary'
                            : selectedEndpoint.method === 'PUT'
                              ? 'outline'
                              : 'destructive'
                      }
                    >
                      {selectedEndpoint.method}
                    </Badge>
                    <code className="text-lg">{selectedEndpoint.path}</code>
                  </div>
                  <CardDescription>
                    {selectedEndpoint.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Permissions */}
                  <div>
                    <h3 className="mb-2 font-semibold">Required Permissions</h3>
                    <div className="flex gap-2">
                      {selectedEndpoint.permissions.map(permission => (
                        <Badge key={permission} variant="outline">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Parameters */}
                  {selectedEndpoint.parameters && (
                    <div>
                      <h3 className="mb-2 font-semibold">Parameters</h3>
                      <div className="space-y-2">
                        {selectedEndpoint.parameters.map(param => (
                          <div key={param.name} className="rounded border p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <code className="font-mono text-sm">
                                {param.name}
                              </code>
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                              {param.required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {param.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {selectedEndpoint.requestBody && (
                    <div>
                      <h3 className="mb-2 font-semibold">Request Body</h3>
                      <div className="space-y-2">
                        {Object.entries(
                          selectedEndpoint.requestBody.properties
                        ).map(([key, prop]) => (
                          <div key={key} className="rounded border p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <code className="font-mono text-sm">{key}</code>
                              <Badge variant="outline" className="text-xs">
                                {prop.type}
                              </Badge>
                              {prop.required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {prop.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responses */}
                  <div>
                    <h3 className="mb-2 font-semibold">Responses</h3>
                    <div className="space-y-4">
                      {selectedEndpoint.responses.map(response => (
                        <div
                          key={response.status}
                          className="rounded border p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Badge
                              variant={
                                response.status < 300
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {response.status}
                            </Badge>
                            <span className="text-sm">
                              {response.description}
                            </span>
                          </div>
                          <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                            {JSON.stringify(response.example, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test API Endpoint</CardTitle>
                  <CardDescription>
                    Test the selected endpoint with your API key
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk_live_..."
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                  </div>

                  {selectedEndpoint.method !== 'GET' && (
                    <div>
                      <Label htmlFor="request-body">Request Body (JSON)</Label>
                      <Textarea
                        id="request-body"
                        placeholder="Enter JSON request body..."
                        value={testRequest}
                        onChange={e => setTestRequest(e.target.value)}
                        rows={6}
                      />
                    </div>
                  )}

                  <Button onClick={handleTestRequest} className="w-full">
                    Send Request
                  </Button>

                  {testResponse && (
                    <div>
                      <Label>Response</Label>
                      <pre className="max-h-96 overflow-x-auto rounded bg-gray-100 p-4 text-sm">
                        {testResponse}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Authentication Guide */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            How to authenticate with the StreamVault API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">API Key Authentication</h3>
            <p className="mb-2 text-sm text-gray-600">
              Include your API key in the request headers:
            </p>
            <pre className="rounded bg-gray-100 p-3 text-sm">
              {`curl -H "X-API-Key: sk_live_your_api_key_here" \\
     -H "Content-Type: application/json" \\
     https://streamvault.app/api/v1/streams`}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Rate Limiting</h3>
            <p className="text-sm text-gray-600">
              API requests are rate limited based on your client configuration.
              Rate limit information is included in response headers:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
              <li>
                <code>X-RateLimit-Remaining</code>: Requests remaining in
                current window
              </li>
              <li>
                <code>X-RateLimit-Reset</code>: When the rate limit window
                resets
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Error Handling</h3>
            <p className="text-sm text-gray-600">
              All errors return a consistent JSON format with error codes:
            </p>
            <pre className="rounded bg-gray-100 p-3 text-sm">
              {`{
  "error": "Human readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {} // Additional error details when available
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
