'use server'

import { z } from 'zod'
import {
  listCoursesPage,
  listEnrolledPage,
  searchCourseOptions,
  type CourseOption,
  type CourseRow,
} from '@/lib/courses'
import {
  listGroupMembersPage,
  listGroupsPage,
  searchGroupOptions,
  type GroupMemberRow,
  type GroupOption,
  type GroupRow,
} from '@/lib/groups'
import { listAttendancePage, listLessonsPage, type LessonRow } from '@/lib/lessons'
import { searchMemberOptions, type PersonRef } from '@/lib/members'
import type { Page } from '@/lib/pagination'
import { requireUser } from '@/lib/session'

// Consultas paginadas que as telas chamam ao rolar (listas) ou ao abrir e buscar (seletores).
// Cada uma valida a entrada, porque chega de um cliente que pode ter sido adulterado.

const kind = z.enum(['ministry', 'cell'])
const id = z.number().int().positive()
const q = z.string().max(100)
const memberCursor = z.object({ firstName: z.string(), lastName: z.string(), id }).optional()
const groupCursor = z.object({ name: z.string() }).optional()
const courseCursor = z.object({ name: z.string() }).optional()
const lessonCursor = z.object({ date: z.string(), id }).optional()

const memberSearch = z.object({
  q,
  after: memberCursor,
  // O rascunho de uma chamada pode passar de 200 adições, por isso o limite é maior.
  excludeIds: z.array(id).max(1000).optional(),
  excludeFromGroup: z.object({ kind, id }).optional(),
  excludeFromSet: z.object({ kind: z.enum(['enrollment', 'attendance']), id }).optional(),
})

export async function searchMembers(params: z.input<typeof memberSearch>): Promise<Page<PersonRef>> {
  await requireUser()
  return searchMemberOptions(memberSearch.parse(params))
}

const groupSearch = z.object({ q, after: groupCursor, excludeLeaderId: id.optional() })

export async function searchGroups(
  groupKind: z.input<typeof kind>,
  params: z.input<typeof groupSearch>,
): Promise<Page<GroupOption>> {
  await requireUser()
  return searchGroupOptions(kind.parse(groupKind), groupSearch.parse(params))
}

export async function loadGroups(
  groupKind: z.input<typeof kind>,
  after?: z.input<typeof groupCursor>,
): Promise<Page<GroupRow>> {
  await requireUser()
  return listGroupsPage(kind.parse(groupKind), groupCursor.parse(after))
}

export async function loadGroupMembers(
  groupKind: z.input<typeof kind>,
  groupId: number,
  after?: z.input<typeof memberCursor>,
): Promise<Page<GroupMemberRow>> {
  await requireUser()
  return listGroupMembersPage(kind.parse(groupKind), id.parse(groupId), memberCursor.parse(after))
}

const courseSearch = z.object({ q, after: courseCursor })

export async function searchCourses(params: z.input<typeof courseSearch>): Promise<Page<CourseOption>> {
  await requireUser()
  return searchCourseOptions(courseSearch.parse(params))
}

export async function loadCourses(after?: z.input<typeof courseCursor>): Promise<Page<CourseRow>> {
  await requireUser()
  return listCoursesPage(courseCursor.parse(after))
}

export async function loadEnrolled(
  courseId: number,
  after?: z.input<typeof memberCursor>,
): Promise<Page<PersonRef>> {
  await requireUser()
  return listEnrolledPage(id.parse(courseId), memberCursor.parse(after))
}

export async function loadLessons(after?: z.input<typeof lessonCursor>): Promise<Page<LessonRow>> {
  await requireUser()
  return listLessonsPage(lessonCursor.parse(after))
}

export async function loadAttendance(
  lessonId: number,
  after?: z.input<typeof memberCursor>,
): Promise<Page<PersonRef>> {
  await requireUser()
  return listAttendancePage(id.parse(lessonId), memberCursor.parse(after))
}
