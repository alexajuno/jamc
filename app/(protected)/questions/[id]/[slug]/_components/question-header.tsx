"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader} from "@/components/ui/card"
import { Flag } from "lucide-react"
import { voteQuestion } from "../_actions/question-actions"
import { VoteButtons } from "@/components/ui/vote-buttons"
import { MathContent } from '@/components/MathContent'
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { UserLink } from "./UserLink"
import { EditButton } from "./EditButton"
import { CommentSection } from "./CommentSection"
import { useRouter } from "next/navigation"
import { formatDateTime } from "@/lib/utils/date"
import { AttachmentList } from "./AttachmentList"

interface QuestionHeaderProps {
  question: {
    id: string
    title: string
    content: string
    slug: string
    author: {
      id: string
      name: string | null
      image: string | null
      reputation?: number
    }
    createdAt: Date
    votes: Array<{ value: number, userId?: string }>
    currentUserVote?: number | null
    tags: Array<{ id: string; name: string }>
    attachments: Array<{ id: string; url: string; type: string }>
    course?: { id: string; title: string; slug: string }
    lesson?: { id: string; title: string; slug: string }
    comments: Array<{
      id: string
      content: string
      createdAt: Date
      author: {
        id: string
        name: string | null
        image: string | null
        reputation?: number
      }
      votes: Array<{
        id: string
        value: number
        userId: string
      }>
    }>
  }
  currentUserId?: string
}

export function QuestionHeader({ question, currentUserId }: QuestionHeaderProps) {
  const router = useRouter()
  const upvotes = question.votes.filter(v => v.value === 1).length
  const downvotes = question.votes.filter(v => v.value === -1).length
  const isOwner = currentUserId === question.author.id

  const handleEditQuestion = () => {
    router.push(`/questions/${question.id}/${question.slug}/edit`)
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <div className="flex flex-wrap gap-2">
            {question.course && (
              <Link href={`/courses/${question.course.slug}`}>
                <Badge variant="secondary" className="cursor-pointer">
                  Course: {question.course.title}
                </Badge>
              </Link>
            )}
            {question.lesson && question.course && (
              <Link href={`/courses/${question.course.slug}/lessons/${question.lesson.id}/${question.lesson.slug}`}>
                <Badge variant="outline" className="cursor-pointer">
                  Lesson: {question.lesson.title}
                </Badge>
              </Link>
            )}
          </div>
          {/* Display tags */}
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <MathContent className="text-foreground mb-4" content={question.content} />
        <AttachmentList attachments={question.attachments} />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserLink user={question.author} />
            <span className="text-sm text-muted-foreground">
              {formatDateTime(question.createdAt)}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <VoteButtons 
              itemId={question.id}
              upvotes={upvotes}
              downvotes={downvotes}
              userVote={question.currentUserVote}
              onVote={voteQuestion}
              size="md"
            />
            {isOwner && (
              <EditButton onClick={handleEditQuestion} />
            )}
            <Button variant="ghost" size="sm">
              <Flag className="mr-1 h-4 w-4" />
              Flag
            </Button>
          </div>
        </div>
        
        <CommentSection
          comments={question.comments}
          questionId={question.id}
          currentUserId={currentUserId}
          className="mt-6 border-t pt-4"
        />
      </CardContent>
    </Card>
  )
} 