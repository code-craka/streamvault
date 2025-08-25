// Creator payout management and tax documentation component
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  DollarSign, 
  Download, 
  Calendar, 
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Building,
  User,
  Settings
} from 'lucide-react'

interface PayoutMethod {
  id: string
  type: 'bank' | 'paypal' | 'stripe'
  name: string
  details: string
  isDefault: boolean
  isVerified: boolean
}

interface PayoutHistory {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  method: string
  date: Date
  taxWithheld: number
  fees: number
  netAmount: number
}

interface TaxDocument {
  id: string
  type: '1099' | 'W9' | 'tax_summary'
  year: number
  amount: number
  downloadUrl: string
  generatedAt: Date
}

export function PayoutManagement() {
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([])
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMethod, setShowAddMethod] = useState(false)

  // Form state for adding payout method
  const [methodType, setMethodType] = useState<'bank' | 'paypal' | 'stripe'>('bank')
  const [accountDetails, setAccountDetails] = useState({
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    email: ''
  })

  useEffect(() => {
    loadPayoutData()
  }, [])

  const loadPayoutData = async () => {
    try {
      setLoading(true)
      
      // Mock data - in production, fetch from API
      setPayoutMethods([
        {
          id: '1',
          type: 'bank',
          name: 'Primary Bank Account',
          details: '****1234',
          isDefault: true,
          isVerified: true
        },
        {
          id: '2',
          type: 'paypal',
          name: 'PayPal Account',
          details: 'user@example.com',
          isDefault: false,
          isVerified: true
        }
      ])

      setPayoutHistory([
        {
          id: '1',
          amount: 1250.00,
          status: 'completed',
          method: 'Bank Transfer',
          date: new Date('2024-01-15'),
          taxWithheld: 125.00,
          fees: 12.50,
          netAmount: 1112.50
        },
        {
          id: '2',
          amount: 890.50,
          status: 'processing',
          method: 'PayPal',
          date: new Date('2024-01-01'),
          taxWithheld: 89.05,
          fees: 8.91,
          netAmount: 792.54
        }
      ])

      setTaxDocuments([
        {
          id: '1',
          type: '1099',
          year: 2023,
          amount: 15600.00,
          downloadUrl: '/api/tax-documents/1099-2023.pdf',
          generatedAt: new Date('2024-01-31')
        },
        {
          id: '2',
          type: 'tax_summary',
          year: 2023,
          amount: 15600.00,
          downloadUrl: '/api/tax-documents/summary-2023.pdf',
          generatedAt: new Date('2024-01-31')
        }
      ])

    } catch (error) {
      console.error('Error loading payout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPayoutMethod = async () => {
    try {
      // Mock implementation
      const newMethod: PayoutMethod = {
        id: Date.now().toString(),
        type: methodType,
        name: methodType === 'bank' ? 'Bank Account' : 
              methodType === 'paypal' ? 'PayPal Account' : 'Stripe Account',
        details: methodType === 'bank' ? `****${accountDetails.accountNumber.slice(-4)}` :
                methodType === 'paypal' ? accountDetails.email : 'Connected',
        isDefault: payoutMethods.length === 0,
        isVerified: false
      }

      setPayoutMethods(prev => [...prev, newMethod])
      setShowAddMethod(false)
      setAccountDetails({
        accountName: '',
        accountNumber: '',
        routingNumber: '',
        email: ''
      })
    } catch (error) {
      console.error('Error adding payout method:', error)
    }
  }

  const setDefaultMethod = async (methodId: string) => {
    setPayoutMethods(prev => prev.map(method => ({
      ...method,
      isDefault: method.id === methodId
    })))
  }

  const requestPayout = async () => {
    try {
      // Mock payout request
      console.log('Requesting payout...')
    } catch (error) {
      console.error('Error requesting payout:', error)
    }
  }

  const downloadTaxDocument = (document: TaxDocument) => {
    // Mock download
    window.open(document.downloadUrl, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const totalEarnings = payoutHistory.reduce((sum, payout) => sum + payout.amount, 0)
  const pendingPayouts = payoutHistory.filter(p => p.status === 'pending' || p.status === 'processing')
  const availableBalance = 2450.75 // Mock available balance

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(availableBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pendingPayouts.reduce((sum, p) => sum + p.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingPayouts.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={requestPayout} disabled={availableBalance < 50}>
              Request Payout
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Statement
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Payout Settings
            </Button>
          </div>
          {availableBalance < 50 && (
            <p className="text-sm text-muted-foreground mt-2">
              Minimum payout amount is $50.00
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payout Methods</CardTitle>
                <CardDescription>Manage how you receive payments</CardDescription>
              </div>
              <Button onClick={() => setShowAddMethod(true)} size="sm">
                Add Method
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {payoutMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{method.name}</span>
                      {method.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {method.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.details}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!method.isDefault && (
                    <Button 
                      onClick={() => setDefaultMethod(method.id)}
                      variant="outline" 
                      size="sm"
                    >
                      Set Default
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Method Form */}
            {showAddMethod && (
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Add Payout Method</h4>
                  <Button 
                    onClick={() => setShowAddMethod(false)}
                    variant="ghost" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Method Type</Label>
                    <Select value={methodType} onValueChange={(value: any) => setMethodType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Account</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe Express</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {methodType === 'bank' && (
                    <>
                      <div>
                        <Label>Account Name</Label>
                        <Input
                          value={accountDetails.accountName}
                          onChange={(e) => setAccountDetails(prev => ({
                            ...prev,
                            accountName: e.target.value
                          }))}
                          placeholder="Account holder name"
                        />
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input
                          value={accountDetails.accountNumber}
                          onChange={(e) => setAccountDetails(prev => ({
                            ...prev,
                            accountNumber: e.target.value
                          }))}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <Label>Routing Number</Label>
                        <Input
                          value={accountDetails.routingNumber}
                          onChange={(e) => setAccountDetails(prev => ({
                            ...prev,
                            routingNumber: e.target.value
                          }))}
                          placeholder="Routing number"
                        />
                      </div>
                    </>
                  )}

                  {methodType === 'paypal' && (
                    <div>
                      <Label>PayPal Email</Label>
                      <Input
                        type="email"
                        value={accountDetails.email}
                        onChange={(e) => setAccountDetails(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  <Button onClick={addPayoutMethod} className="w-full">
                    Add Method
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
            <CardDescription>Your payout transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payoutHistory.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(payout.amount)}</span>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payout.method} • {payout.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(payout.netAmount)}</div>
                    <div className="text-xs text-muted-foreground">
                      Net amount
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Documents
          </CardTitle>
          <CardDescription>
            Download your tax forms and earnings summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taxDocuments.map((document) => (
              <div key={document.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">
                    {document.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {document.year}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="font-medium">{formatCurrency(document.amount)}</div>
                  <div className="text-sm text-muted-foreground">
                    Generated {document.generatedAt.toLocaleDateString()}
                  </div>
                </div>
                <Button 
                  onClick={() => downloadTaxDocument(document)}
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Tax Information</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tax documents are generated annually by January 31st</li>
              <li>• 1099 forms are issued for earnings over $600</li>
              <li>• Consult with a tax professional for advice</li>
              <li>• Keep records of all business expenses</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}