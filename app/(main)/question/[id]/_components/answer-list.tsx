"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react"
import { voteAnswer } from "../_actions/question-actions"
import { useTransition } from "react"
import { toast } from "sonner"

interface Answer {
  id: string
  content: string
  author: {
    name: string | null
    image: string | null
  }
  createdAt: Date
  votes: Array<{ value: number }>
  isAccepted: boolean
}

interface AnswerListProps {
  answers: Answer[]
  isEducator?: boolean
}

export function AnswerList({ answers, isEducator = false }: AnswerListProps) {
  const [isPending, startTransition] = useTransition()

  const handleVote = (answerId: string, value: 1 | -1) => {
    startTransition(async () => {
      try {
        await voteAnswer(answerId, value)
      } catch (error) {
        toast.error("You must be logged in to vote")
      }
    })
  }

  return (
    <div className="space-y-6">
      {answers.map((answer) => {
        const upvotes = answer.votes.filter(v => v.value === 1).length
        const downvotes = answer.votes.filter(v => v.value === -1).length

        return (
          <div key={answer.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={answer.author.image || undefined} alt={answer.author.name || undefined} />
                  <AvatarFallback>{answer.author.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{answer.author.name}</span>
                <span className="text-sm text-gray-400">
                  {new Date(answer.createdAt).toLocaleString()}
                </span>
              </div>
              {isEducator && (
                <Button variant="ghost" size="sm" className="text-yellow-600">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  Moderate
                </Button>
              )}
            </div>
            <p className="text-gray-700 mb-4">{answer.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleVote(answer.id, 1)}
                  disabled={isPending}
                >
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  {upvotes}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleVote(answer.id, -1)}
                  disabled={isPending}
                >
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  {downvotes}
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-1 h-4 w-4" />
                Reply
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
} 