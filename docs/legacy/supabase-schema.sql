CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'counselor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'pending')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  credits NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  semester TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS college_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  college_name TEXT NOT NULL,
  application_deadline DATE NOT NULL,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'submitted', 'accepted', 'rejected')) DEFAULT 'not_started',
  essay_status TEXT CHECK (essay_status IN ('not_started', 'draft', 'completed')) DEFAULT 'not_started',
  recommendation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  deadline DATE NOT NULL,
  eligibility JSONB,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  organization TEXT NOT NULL,
  hours NUMERIC NOT NULL,
  date_completed DATE NOT NULL,
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can insert their profile during signup" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can view their own journey" ON journeys
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents can view journeys they created" ON journeys
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Counselors can view all journeys" ON journeys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'counselor'
    )
  );

CREATE POLICY "Parents can create journeys" ON journeys
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'parent'
    )
  );

CREATE POLICY "Students can manage their academic records" ON academic_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = academic_records.journey_id 
      AND journeys.student_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view academic records for their student" ON academic_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = academic_records.journey_id 
      AND journeys.created_by = auth.uid()
    )
  );

CREATE POLICY "Counselors can view all academic records" ON academic_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'counselor'
    )
  );

CREATE POLICY "Students can manage their college applications" ON college_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = college_applications.journey_id 
      AND journeys.student_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view college applications for their student" ON college_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = college_applications.journey_id 
      AND journeys.created_by = auth.uid()
    )
  );

CREATE POLICY "Counselors can view all college applications" ON college_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'counselor'
    )
  );

CREATE POLICY "Anyone can view scholarships" ON scholarships
  FOR SELECT USING (true);

CREATE POLICY "Students can manage their service hours" ON service_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = service_hours.journey_id 
      AND journeys.student_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view and verify service hours for their student" ON service_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = service_hours.journey_id 
      AND journeys.created_by = auth.uid()
    )
  );

CREATE POLICY "Parents can update verification status" ON service_hours
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = service_hours.journey_id 
      AND journeys.created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = service_hours.journey_id 
      AND journeys.created_by = auth.uid()
    )
  );

CREATE POLICY "Counselors can view all service hours" ON service_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'counselor'
    )
  );

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_journeys_student_id ON journeys(student_id);
CREATE INDEX IF NOT EXISTS idx_journeys_created_by ON journeys(created_by);
CREATE INDEX IF NOT EXISTS idx_academic_records_journey_id ON academic_records(journey_id);
CREATE INDEX IF NOT EXISTS idx_college_applications_journey_id ON college_applications(journey_id);
CREATE INDEX IF NOT EXISTS idx_service_hours_journey_id ON service_hours(journey_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE TABLE IF NOT EXISTS scraped_scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount TEXT,
  deadline TEXT NOT NULL,
  link TEXT NOT NULL,
  state TEXT,
  tags TEXT[],
  source TEXT NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE scraped_scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scraped scholarships" ON scraped_scholarships
  FOR SELECT USING (is_active = true);

CREATE POLICY "System can insert scraped scholarships" ON scraped_scholarships
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scraped_scholarships_source ON scraped_scholarships(source);
CREATE INDEX IF NOT EXISTS idx_scraped_scholarships_active ON scraped_scholarships(is_active);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT,
  path TEXT CHECK (path IN ('College', 'Trade/Apprenticeship', 'Military', 'Gap Year', 'Workforce', 'Entrepreneurship')),
  testing TEXT CHECK (testing IN ('SAT', 'ACT', 'Both', 'None')),
  early_action BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('Applications', 'Essays', 'Testing', 'Scholarships', 'Financial Aid', 'Campus Visits', 'Housing', 'Enrollment', 'Documents', 'Admin/Other')),
  status TEXT CHECK (status IN ('todo', 'doing', 'done')) DEFAULT 'todo',
  month TEXT NOT NULL,
  due_date DATE,
  notes TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_type)
);

CREATE TABLE IF NOT EXISTS user_recommenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  requested_date DATE,
  submitted_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visit_date DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tasks" ON user_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own documents" ON user_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recommenders" ON user_recommenders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own visits" ON user_visits
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommenders_user_id ON user_recommenders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_user_id ON user_visits(user_id);

INSERT INTO scholarships (title, deadline, eligibility, link) VALUES
('National Merit Scholarship', '2025-10-15', '{"gpa_min": 3.5, "grade_level": "senior"}', 'https://www.nationalmerit.org/'),
('Gates Millennium Scholars Program', '2025-01-15', '{"gpa_min": 3.3, "financial_need": true}', 'https://www.gmsp.org/'),
('Coca-Cola Scholars Program', '2024-10-31', '{"leadership": true, "community_service": 100}', 'https://www.coca-colascholarsfoundation.org/'),
('Dell Scholars Program', '2024-12-01', '{"gpa_min": 2.4, "financial_need": true}', 'https://www.dellscholars.org/'),
('Jack Kent Cooke Foundation Scholarship', '2024-11-14', '{"gpa_min": 3.5, "financial_need": true}', 'https://www.jkcf.org/')
ON CONFLICT DO NOTHING;
