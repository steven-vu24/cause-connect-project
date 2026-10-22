export type UserType = 'student' | 'nonprofit';

// The event shape returned by every /api/opportunities route (server/events.js).
export type Event = {
  id: number;
  title: string;
  organization: string;
  body: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  cause: string;
  distance?: string;
};

export type StudentProfile = {
  full_name: string;
  age: number;
  school: string;
  bio: string;
  interests: string;
};

export type NonprofitProfile = {
  nonprofit_name: string;
  location: string;
  category: string;
  statement: string;
};

export type CurrentUser<Profile> = {
  id: number;
  email: string;
  user_type: UserType;
  profile: Profile | null;
};

export type Volunteer = StudentProfile & {
  id: number;
  user_id: number;
  email: string;
  signup_date: string;
};

export type OpportunityInput = {
  nonprofit_name: string;
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
};
