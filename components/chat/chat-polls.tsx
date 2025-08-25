'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Plus, 
  X, 
  Vote,
  Clock,
  Users,
  CheckCircle
} from 'lucide-react'

interface PollOption {
  id: string
  text: string
  votes: number
  voters: string[]
}

interface ChatPoll {
  id: string
  question: string
  options: PollOption[]
  createdBy: string
  createdAt: Date
  endsAt: Date
  isActive: boolean
  totalVotes: number
}

interface ChatPollsProps {
  streamId: string
  onCreatePoll?: (question: string, options: string[], duration: number) => Promise<void>
  onVote?: (pollId: string, optionId: string) => Promise<void>
  className?: string
}

export function ChatPolls({ streamId, onCreatePoll, onVote, className }: ChatPollsProps) {
  const { user } = useUser()
  const [polls, setPolls] = useState<ChatPoll[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState(['', ''])
  const [pollDuration, setPollDuration] = useState(60) // seconds

  // Check if user can create polls (streamer or admin)
  const canCreatePolls = () => {
    if (!user) return false
    const userRole = user.publicMetadata?.role as string
    return ['admin', 'streamer'].includes(userRole)
  }

  const addPollOption = () => {
    if (newPollOptions.length < 6) {
      setNewPollOptions([...newPollOptions, ''])
    }
  }

  const removePollOption = (index: number) => {
    if (newPollOptions.length > 2) {
      setNewPollOptions(newPollOptions.filter((_, i) => i !== index))
    }
  }

  const updatePollOption = (index: number, value: string) => {
    const updated = [...newPollOptions]
    updated[index] = value
    setNewPollOptions(updated)
  }

  const handleCreatePoll = async () => {
    if (!newPollQuestion.trim()) {
      alert('Please enter a poll question')
      return
    }

    const validOptions = newPollOptions.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options')
      return
    }

    try {
      await onCreatePoll?.(newPollQuestion.trim(), validOptions, pollDuration)
      
      // Reset form
      setNewPollQuestion('')
      setNewPollOptions(['', ''])
      setPollDuration(60)
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating poll:', error)
      alert('Failed to create poll. Please try again.')
    }
  }

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return

    try {
      await onVote?.(pollId, optionId)
    } catch (error) {
      console.error('Error voting:', error)
      alert('Failed to vote. Please try again.')
    }
  }

  const getTimeRemaining = (endsAt: Date) => {
    const now = new Date()
    const remaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000))
    
    if (remaining >= 60) {
      return `${Math.floor(remaining / 60)}m ${remaining % 60}s`
    }
    return `${remaining}s`
  }

  const hasUserVoted = (poll: ChatPoll) => {
    if (!user) return false
    return poll.options.some(option => option.voters.includes(user.id))
  }

  const getUserVote = (poll: ChatPoll) => {
    if (!user) return null
    return poll.options.find(option => option.voters.includes(user.id))
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Create Poll Button */}
      {canCreatePolls() && !isCreating && (
        <Button
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="w-full"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Create Poll
        </Button>
      )}

      {/* Create Poll Form */}
      {isCreating && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Create Poll</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium">Question</label>
            <Input
              placeholder="What's your poll question?"
              value={newPollQuestion}
              onChange={(e) => setNewPollQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Options</label>
            <div className="space-y-2 mt-2">
              {newPollOptions.map((option, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    maxLength={100}
                  />
                  {newPollOptions.length > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePollOption(index)}
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {newPollOptions.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPollOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Duration</label>
            <div className="flex space-x-2 mt-2">
              {[30, 60, 120, 300].map((duration) => (
                <Button
                  key={duration}
                  variant={pollDuration === duration ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPollDuration(duration)}
                >
                  {duration >= 60 ? `${duration / 60}m` : `${duration}s`}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCreating(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              className="flex-1"
            >
              Create Poll
            </Button>
          </div>
        </Card>
      )}

      {/* Active Polls */}
      {polls.filter(poll => poll.isActive).map((poll) => (
        <Card key={poll.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Poll</span>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getTimeRemaining(poll.endsAt)}
              </Badge>
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{poll.totalVotes} votes</span>
            </div>
          </div>

          <p className="font-medium">{poll.question}</p>

          <div className="space-y-2">
            {poll.options.map((option) => {
              const percentage = poll.totalVotes > 0 
                ? Math.round((option.votes / poll.totalVotes) * 100) 
                : 0
              const userVoted = hasUserVoted(poll)
              const isUserChoice = getUserVote(poll)?.id === option.id

              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Button
                      variant={userVoted ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => !userVoted && handleVote(poll.id, option.id)}
                      disabled={userVoted}
                      className={`flex-1 justify-start ${
                        isUserChoice ? 'bg-blue-100 border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        {isUserChoice && <CheckCircle className="h-4 w-4 text-blue-500" />}
                        <span className="flex-1 text-left">{option.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {percentage}% ({option.votes})
                        </span>
                      </div>
                    </Button>
                  </div>
                  {userVoted && (
                    <Progress value={percentage} className="h-2" />
                  )}
                </div>
              )
            })}
          </div>

          {!hasUserVoted(poll) && (
            <p className="text-xs text-muted-foreground text-center">
              Click an option to vote
            </p>
          )}
        </Card>
      ))}

      {/* No Active Polls */}
      {polls.filter(poll => poll.isActive).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No active polls</p>
          {canCreatePolls() && (
            <p className="text-sm">Create a poll to engage with your audience!</p>
          )}
        </div>
      )}
    </div>
  )
}