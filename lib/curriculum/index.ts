import raw from "@/data/curriculum-2022.json";
import { CurriculumSchema, type Curriculum, type Unit } from "@/lib/schemas";

/** 로딩 시점에 스키마를 검증해 데이터 오류를 즉시 드러낸다. */
export const curriculum: Curriculum = CurriculumSchema.parse(raw);

export const SEMESTERS = [
  { grade: 1, semester: 1 },
  { grade: 1, semester: 2 },
  { grade: 2, semester: 1 },
  { grade: 2, semester: 2 },
  { grade: 3, semester: 1 },
  { grade: 3, semester: 2 },
] as const;

export function semesterLabel(grade: number, semester: number): string {
  return `중${grade}-${semester}`;
}

export function getUnit(id: string, data: Curriculum = curriculum): Unit | undefined {
  return data.units.find((u) => u.id === id);
}

export function unitsBySemester(grade: number, semester: number, data: Curriculum = curriculum): Unit[] {
  return data.units.filter((u) => u.grade === grade && u.semester === semester);
}

/** 선수 단원을 재귀적으로 모두 찾는다(가까운 것부터, 중복·순환 방지). */
export function allPrerequisites(id: string, data: Curriculum = curriculum): Unit[] {
  const result: Unit[] = [];
  const seen = new Set<string>([id]);
  const queue = [...(getUnit(id, data)?.prerequisites ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    const unit = getUnit(next, data);
    if (!unit) continue;
    result.push(unit);
    queue.push(...unit.prerequisites);
  }
  return result;
}

/** 이 단원을 선수로 삼는 후속 단원. */
export function followUps(id: string, data: Curriculum = curriculum): Unit[] {
  return data.units.filter((u) => u.prerequisites.includes(id));
}
