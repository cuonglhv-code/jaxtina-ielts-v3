export type UserRole = 'student' | 'teacher' | 'admin'

export interface Profile {
  id:           string
  email:        string
  full_name:    string
  age:          number | null
  address:      string | null
  phone:        string | null
  current_band: number
  target_band:  number
  role:         UserRole
  onboarded:    boolean
  created_at:   string
  updated_at:   string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
