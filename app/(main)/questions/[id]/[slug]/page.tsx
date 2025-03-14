import { getAuthUser } from "@/lib/auth/get-user"
import { QuestionHeader } from "./_components/question-header"
import { AnswerList } from "./_components/answer-list"
import { AnswerForm } from "./_components/answer-form"
import { RelatedQuestions } from "./_components/related-questions"
import { 
  getQuestionDetails, 
  getQuestionAnswers, 
  getRelatedQuestions 
} from "./_actions/question-actions"
import { notFound, redirect } from "next/navigation"
import { hasPermission } from "@/lib/types/prisma"

interface QuestionPageProps {
  params: {
    id: string
    slug: string
  }
}

export default async function QuestionPage({
  params,
}: QuestionPageProps) {
  // Store params in local variables to avoid Next.js warnings
  const questionId = params?.id
  const questionSlug = params?.slug
  
  // Validate params before using them
  if (!questionId || typeof questionId !== 'string') {
    notFound()
  }

  if (!questionSlug || typeof questionSlug !== 'string') {
    notFound()
  }
  
  const [question, answers, relatedQuestions, user] = await Promise.all([
    getQuestionDetails(questionId),
    getQuestionAnswers(questionId),
    getRelatedQuestions(questionId),
    getAuthUser(),
  ])

  if (!question) {
    notFound()
  }

  // If the slug doesn't match, redirect to the correct URL
  if (question.slug !== questionSlug) {
    redirect(`/questions/${questionId}/${question.slug}`)
  }

  const isEducator = hasPermission(user, "MANAGE")
  
  // Determine the current user's vote on this question
  let currentUserVote = null
  if (user) {
    const userVote = question.votes.find(vote => vote.userId === user.id)
    if (userVote) {
      currentUserVote = userVote.value
    }
  }
  
  // Enhance question with current user's vote
  const enhancedQuestion = {
    ...question,
    currentUserVote
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-8">
          <QuestionHeader question={enhancedQuestion} />
          <AnswerList answers={answers} isEducator={isEducator} />
          <AnswerForm questionId={questionId} />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <RelatedQuestions questions={relatedQuestions} />
        </aside>
      </div>
    </div>
  )
}
