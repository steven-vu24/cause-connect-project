import {
  CurrentUser,
  Event,
  NonprofitProfile,
  OpportunityInput,
  StudentProfile,
  Volunteer,
} from '../types/types';

const API_BASE = process.env.REACT_APP_API_URL || 'https://causeconnectbackend.onrender.com/api';
const TOKEN_KEY = 'token';

export interface AuthResponse {
  success: boolean;
  message: string;
  userType?: string;
  nextRoute?: string;
}

// Safari drops the API's cross-site cookie, so the token is also kept in
// localStorage and sent as a Bearer header.
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(API_BASE + path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
  return response;
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await send(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'An error occurred');
  }
  return response.json();
}

export async function signup(email: string, password: string, usertype: string): Promise<AuthResponse> {
  try {
    const res = await send('/signup', { method: 'POST', body: JSON.stringify({ email, password, usertype }) });
    if (!res.ok) return { success: false, message: await res.text() };
    return { success: true, message: 'User created' };
  } catch {
    return { success: false, message: 'Network error' };
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await send('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!res.ok) return { success: false, message: await res.text() };

    const data = await res.json();
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return { success: true, message: 'Logged in', userType: data.userType, nextRoute: data.nextRoute };
  } catch {
    return { success: false, message: 'Network error' };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    const res = await send('/logout', { method: 'POST' });
    return res.ok ? { success: true, message: 'Logged out' } : { success: false, message: 'Logout failed' };
  } catch {
    return { success: false, message: 'Network error' };
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function getSession(): Promise<{ email: string } | null> {
  try {
    const res = await send('/session');
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export const getMe = <Profile>() => request<CurrentUser<Profile>>('/me');
export const getProfile = () => request<StudentProfile | NonprofitProfile>('/profile');
export const saveProfile = (profile: StudentProfile | NonprofitProfile) => request('/profile', 'PUT', profile);
export const updateAccount = (changes: { email?: string; currentPassword?: string; newPassword?: string }) =>
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
export const getJoinedEventIds = async () =>
  (await request<{ id: number }[]>('/events/volunteered')).map((event) => event.id);
