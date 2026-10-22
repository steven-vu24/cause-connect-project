import {
  CurrentUser,
  Event,
  NonprofitProfile,
  OpportunityInput,
  StudentProfile,
  UserType,
  Volunteer,
} from '../types/types';

// The server serves this app and the API from one origin (the dev server
// proxies /api to it), so requests are relative and the session cookie is
// first-party.
const API_BASE = '/api';

export interface AuthResponse {
  success: boolean;
  message: string;
  userType?: UserType;
  nextRoute?: string;
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 && window.location.pathname !== '/') {
    window.location.assign('/');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

async function authenticate(path: string, body: unknown): Promise<AuthResponse> {
  try {
    const data = await request<{ userType: UserType; nextRoute: string }>(path, 'POST', body);
    return { success: true, message: 'Logged in', ...data };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Network error' };
  }
}

export const signup = (
  email: string,
  password: string,
  usertype: UserType,
  profile: StudentProfile | NonprofitProfile
) => authenticate('/signup', { email, password, usertype, profile });

export const login = (email: string, password: string) => authenticate('/login', { email, password });

export async function logout() {
  await request('/logout', 'POST').catch(() => undefined);
}

export const getSession = () => request<{ email: string }>('/session');
export const getMe = <Profile>() => request<CurrentUser<Profile>>('/me');
export const getProfile = () => request<StudentProfile | NonprofitProfile>('/profile');
export const saveProfile = (profile: StudentProfile | NonprofitProfile) => request('/profile', 'PUT', profile);
export const updateAccount = (changes: { currentPassword: string; email?: string; newPassword?: string }) =>
  request('/account/update', 'POST', changes);

export async function getNonprofitProfile(): Promise<NonprofitProfile> {
  const me = await getMe<NonprofitProfile>();
  if (me.user_type !== 'nonprofit') throw new Error('User is not a nonprofit organization');
  if (!me.profile) throw new Error('Nonprofit profile not found');
  return me.profile;
}

export const getUpcomingEvents = () => request<Event[]>('/opportunities/all');
export const getNearbyEvents = (location: string, radius: number) =>
  request<Event[]>(`/opportunities/nearby?location=${encodeURIComponent(location)}&radius=${radius}`);
export const getMyOpportunities = () => request<Event[]>('/opportunities');
export const createOpportunity = (opportunity: OpportunityInput) =>
  request<{ opportunityId: number }>('/opportunities', 'POST', opportunity);
export const updateOpportunity = (id: number, opportunity: OpportunityInput) =>
  request(`/opportunities/${id}`, 'PUT', opportunity);
export const deleteOpportunity = (id: number) => request(`/opportunities/${id}`, 'DELETE');

export const getEventVolunteers = (eventId: number) => request<Volunteer[]>(`/opportunities/${eventId}/volunteers`);
export const removeVolunteer = (eventId: number, userId: number) =>
  request(`/opportunities/${eventId}/volunteers/${userId}`, 'DELETE');

export const joinEvent = (eventId: number) => request('/events/volunteer', 'POST', { opportunity_id: eventId });
export const leaveEvent = (eventId: number) => request(`/events/volunteer/cancel/${eventId}`, 'DELETE');
export const getJoinedEvents = () => request<Event[]>('/events/volunteered');
