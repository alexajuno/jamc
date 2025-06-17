"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"
import { calculateUserReputation } from "@/lib/utils/reputation"
import { notifyComment } from "@/lib/services/notification-triggers"

export async function updateQuestion(questionId: string, title: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("You must be logged in to edit")
  }

  // Check if user owns the question
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { authorId: true, slug: true }
  })

  if (!question || question.authorId !== session.user.id) {
    throw new Error("You can only edit your own questions")
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: { title, content }
  })

  revalidatePath(`/questions/${questionId}/${question.slug}`)
  return updatedQuestion
}

export async function updateAnswer(answerId: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("You must be logged in to edit")
  }

  // Check if user owns the answer
  const answer = await prisma.answer.findUnique({
    where: { id: answerId },
    select: { 
      authorId: true, 
      questionId: true,
      question: {
        select: { slug: true }
      }
    }
  })

  if (!answer || answer.authorId !== session.user.id) {
    throw new Error("You can only edit your own answers")
  }

  const updatedAnswer = await prisma.answer.update({
    where: { id: answerId },
    data: { content }
  })

  revalidatePath(`/questions/${answer.questionId}/${answer.question.slug}`)
  return updatedAnswer
}

export async function addComment(content: string, questionId?: string, answerId?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("You must be logged in to comment")
  }

  if (!questionId && !answerId) {
    throw new Error("Comment must be on either a question or answer")
  }

  if (questionId && answerId) {
    throw new Error("Comment cannot be on both question and answer")
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      authorId: session.user.id,
      questionId,
      answerId
    }
  })

  // Send notification to question/answer author
  try {
    await notifyComment(comment.id, session.user.id, questionId, answerId)
  } catch (error) {
    console.error('Failed to send comment notification:', error)
    // Don't fail the comment creation if notification fails
  }

  // Get the question slug for revalidation
  if (questionId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { slug: true }
    })
    if (question) {
      revalidatePath(`/questions/${questionId}/${question.slug}`)
    }
  } else if (answerId) {
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { 
        questionId: true,
        question: { select: { slug: true } }
      }
    })
    if (answer) {
      revalidatePath(`/questions/${answer.questionId}/${answer.question.slug}`)
    }
  }

  return comment
}

export async function getQuestionWithReputation(id: string) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      votes: {
        select: {
          id: true,
          value: true,
          userId: true,
        }
      },
      tags: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        }
      },
      lesson: {
        select: {
          id: true,
          title: true,
          slug: true,
        }
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          votes: {
            select: {
              id: true,
              value: true,
              userId: true,
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      attachments: {
        select: {
          id: true,
          url: true,
          type: true,
        }
      },
    },
  })

  if (!question) return null

  // Calculate author reputation
  const authorReputation = await calculateUserReputation(question.author.id)

  // Calculate reputation for comment authors
  const commentsWithReputation = await Promise.all(
    question.comments.map(async (comment) => {
      const commentAuthorReputation = await calculateUserReputation(comment.author.id)
      return {
        ...comment,
        author: {
          ...comment.author,
          reputation: commentAuthorReputation
        }
      }
    })
  )

  return {
    ...question,
    author: {
      ...question.author,
      reputation: authorReputation
    },
    comments: commentsWithReputation
  }
}

export async function getAnswersWithReputation(questionId: string) {
  const answers = await prisma.answer.findMany({
    where: { questionId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      votes: {
        select: {
          id: true,
          value: true,
          userId: true,
        }
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          votes: {
            select: {
              id: true,
              value: true,
              userId: true,
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      question: {
        select: {
          id: true,
          authorId: true,
          courseId: true,
          course: {
            select: {
              authorId: true,
            }
          }
        }
      }
    },
    orderBy: [
      { isAcceptedByUser: 'desc' },
      { isAcceptedByTeacher: 'desc' },
      { createdAt: 'desc' }
    ],
  })

  // Calculate reputation for each answer author and comment authors
  const answersWithReputation = await Promise.all(
    answers.map(async (answer) => {
      const authorReputation = await calculateUserReputation(answer.author.id)
      
      const commentsWithReputation = await Promise.all(
        answer.comments.map(async (comment) => {
          const commentAuthorReputation = await calculateUserReputation(comment.author.id)
          return {
            ...comment,
            author: {
              ...comment.author,
              reputation: commentAuthorReputation
            }
          }
        })
      )

      return {
        ...answer,
        author: {
          ...answer.author,
          reputation: authorReputation
        },
        comments: commentsWithReputation,
        questionOwnerId: answer.question.authorId,
        courseTeacherId: answer.question.course?.authorId,
        isLinkedToCourse: !!answer.question.courseId,
      }
    })
  )

  return answersWithReputation
}

export async function voteComment(commentId: string, value: number) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("You must be logged in to vote")
  }

  // Check if user has already voted on this comment
  const existingVote = await prisma.commentVote.findUnique({
    where: {
      commentId_userId: {
        commentId,
        userId: session.user.id
      }
    }
  })

  if (existingVote) {
    if (existingVote.value === value) {
      // Remove vote if clicking the same vote
      await prisma.commentVote.delete({
        where: { id: existingVote.id }
      })
    } else {
      // Update vote if clicking different vote
      await prisma.commentVote.update({
        where: { id: existingVote.id },
        data: { value }
      })
    }
  } else {
    // Create new vote
    await prisma.commentVote.create({
      data: {
        commentId,
        userId: session.user.id,
        value
      }
    })
  }

  // Get the comment to find the question for revalidation
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      questionId: true,
      answerId: true,
      question: { select: { slug: true } },
      answer: { 
        select: { 
          questionId: true,
          question: { select: { slug: true } }
        }
      }
    }
  })

  if (comment) {
    if (comment.questionId && comment.question) {
      revalidatePath(`/questions/${comment.questionId}/${comment.question.slug}`)
    } else if (comment.answerId && comment.answer) {
      revalidatePath(`/questions/${comment.answer.questionId}/${comment.answer.question.slug}`)
    }
  }
} 