import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import EnrollButton from "./enroll-button"
import { CourseModule } from "@/lib/types/course"

interface CourseSidebarProps {
  courseId: string
  courseSlug: string
  isEnrolled: boolean
  isLoggedIn: boolean
  modules: CourseModule[] | undefined
  stats: {
    moduleCount: number
    questionCount: number
    createdAt: Date
  }
  hasNewStructure?: boolean
  volumeCount?: number
  chapterCount?: number
}

export default function CourseSidebar({
  courseId,
  courseSlug,
  isEnrolled,
  isLoggedIn,
  modules = [],
  stats,
  hasNewStructure = false,
  volumeCount = 0,
  chapterCount = 0
}: CourseSidebarProps) {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Course Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 flex flex-col">
          <EnrollButton 
            courseId={courseId} 
            isEnrolled={isEnrolled} 
            isLoggedIn={isLoggedIn}
          />
          
          {isEnrolled && (
            <>
              {/* For new structure with volumes */}
              {hasNewStructure && volumeCount > 0 && (
                <Link href={`/courses/${courseId}/${courseSlug}/volumes`}>
                  <Button variant="outline" className="w-full">Continue Learning</Button>
                </Link>
              )}
              
              {/* For old structure with modules */}
              {!hasNewStructure && modules?.length > 0 && (
                <Link href={`/courses/${courseId}/${courseSlug}/modules/${modules[0].id}`}>
                  <Button variant="outline" className="w-full">Continue Learning</Button>
                </Link>
              )}
            </>
          )}
          
          <Link href={`/questions/ask?courseId=${courseId}`}>
            <Button variant="outline" className="w-full">Ask a Question</Button>
          </Link>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Course Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNewStructure && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volumes:</span>
                <span className="font-medium">{volumeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chapters:</span>
                <span className="font-medium">{chapterCount}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modules:</span>
            <span className="font-medium">{stats.moduleCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Questions:</span>
            <span className="font-medium">{stats.questionCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">{stats.createdAt.toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 