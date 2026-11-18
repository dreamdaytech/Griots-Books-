import type { EditorialComment, Manuscript, UserProfile, UserRole } from './types';

export const ALL_ROLES: { value: UserRole; label: string; privileged: boolean }[] = [
  { value: 'visitor', label: 'Visitor / Reader', privileged: false },
  { value: 'author', label: 'Registered Author', privileged: false },
  { value: 'researcher', label: 'Researcher', privileged: false },
  { value: 'institutional_admin', label: 'Institutional Administrator', privileged: true },
  { value: 'editor', label: 'Editor', privileged: true },
  { value: 'managing_editor', label: 'Managing Editor', privileged: true },
  { value: 'editor_in_chief', label: 'Editor-in-Chief', privileged: true },
  { value: 'reviewer', label: 'Academic Peer Reviewer', privileged: true },
  { value: 'proofreader', label: 'Proofreader', privileged: true },
  { value: 'designer', label: 'Graphic Designer / Typesetter', privileged: true },
  { value: 'publishing_manager', label: 'Publishing Manager', privileged: true },
  { value: 'printing_partner', label: 'Printing Partner', privileged: true },
  { value: 'finance_officer', label: 'Finance Officer', privileged: true },
  { value: 'platform_admin', label: 'Platform Administrator', privileged: true },
  { value: 'super_admin', label: 'Super Administrator', privileged: true },
];

export const PUBLIC_REGISTRATION_ALLOWED_ROLES: UserRole[] = ['author', 'researcher'];

export const EDITORIAL_ROLES: UserRole[] = [
  'editor',
  'managing_editor',
  'editor_in_chief',
  'proofreader',
  'designer',
  'publishing_manager',
  'platform_admin',
  'super_admin',
];

export const ADMIN_ROLES: UserRole[] = ['platform_admin', 'super_admin'];

export const PUBLISHING_MANAGER_ROLES: UserRole[] = [
  'publishing_manager',
  'managing_editor',
  'editor_in_chief',
  'platform_admin',
  'super_admin',
];

export function hasAnyRole(user: Pick<UserProfile, 'roles'> | null | undefined, allowed: UserRole[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((r) => allowed.includes(r));
}

export function sanitizePublicRegistrationRoles(requested?: UserRole[]): UserRole[] {
  if (!requested || requested.length === 0) return ['author'];
  const filtered = requested.filter((r) => PUBLIC_REGISTRATION_ALLOWED_ROLES.includes(r));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['author'];
}

export function canAccessEditorialWorkspace(user: UserProfile | null | undefined): boolean {
  return hasAnyRole(user, EDITORIAL_ROLES);
}

export function canAccessAdminConsole(user: UserProfile | null | undefined): boolean {
  return hasAnyRole(user, ADMIN_ROLES);
}

export function canManageServices(user: UserProfile | null | undefined): boolean {
  return hasAnyRole(user, ADMIN_ROLES);
}

export function canReleasePublication(user: UserProfile | null | undefined): boolean {
  return hasAnyRole(user, PUBLISHING_MANAGER_ROLES);
}

export function canViewManuscript(
  user: UserProfile | null | undefined,
  manuscript: Pick<Manuscript, 'authorId' | 'assignedEditorId' | 'assignedReviewerIds'>,
): boolean {
  if (!user) return false;
  if (user.accountStatus === 'suspended') return false;
  if (manuscript.authorId === user.uid) return true;
  if (canAccessEditorialWorkspace(user)) return true;
  if (manuscript.assignedEditorId && manuscript.assignedEditorId === user.uid) return true;
  if (Array.isArray(manuscript.assignedReviewerIds) && manuscript.assignedReviewerIds.includes(user.uid)) {
    return true;
  }
  return false;
}

export function canViewComment(user: UserProfile | null | undefined, comment: EditorialComment): boolean {
  if (!user) return false;
  if (canAccessEditorialWorkspace(user)) return true;
  if (comment.manuscriptAuthorId === user.uid) {
    return comment.visibility === 'author_visible';
  }
  return false;
}

export function filterVisibleComments(
  user: UserProfile | null | undefined,
  comments: EditorialComment[],
): EditorialComment[] {
  return comments.filter((c) => canViewComment(user, c));
}
