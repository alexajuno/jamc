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
  // Validate params before using them
  if (!params?.id || typeof params.id !== 'string') {
    notFound()
  }

  const id = params.id
  const slug = params.slug as string
  
  const [question, answers, relatedQuestions, user] = await Promise.all([
    getQuestionDetails(id),
    getQuestionAnswers(id),
    getRelatedQuestions(id),
    getAuthUser(),
  ])

  if (!question) {
    notFound()
  }

  // If the slug doesn't match, redirect to the correct URL
  if (question.slug !== slug) {
    redirect(`/questions/${id}/${question.slug}`)
  }

  const isEducator = hasPermission(user, "MANAGE")

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content area */}
        <div className="lg:col-span-2">
          <QuestionHeader question={question} />
          <AnswerList answers={answers} isEducator={isEducator} />
          <AnswerForm questionId={id} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <RelatedQuestions questions={relatedQuestions} />
        </div>
      </div>
    </div>
  )
}
