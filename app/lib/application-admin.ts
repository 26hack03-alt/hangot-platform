export const applicationStatuses = ["submitted", "under_review", "waiting", "approved", "rejected", "cancelled"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type AdminApplicationStatus = "under_review" | "waiting" | "approved" | "rejected";

const transitions: Record<ApplicationStatus, readonly AdminApplicationStatus[]> = {
  submitted: ["under_review", "approved", "rejected"],
  under_review: ["waiting", "approved", "rejected"],
  waiting: ["approved", "rejected"],
  approved: [],
  rejected: [],
  cancelled: [],
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.includes(value as ApplicationStatus);
}

export function canReviewTransition(from: ApplicationStatus, to: string): to is AdminApplicationStatus {
  return transitions[from].includes(to as AdminApplicationStatus);
}

export const canAdminTransition = canReviewTransition;
