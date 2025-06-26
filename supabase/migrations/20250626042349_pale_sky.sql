/*
  # Fix Posts Schema Issues

  1. New Tables
    - `posts` - Main table for service posts with proper foreign key
    - `post_bookmarks` - For users to save/bookmark posts
    - `post_ratings` - For rating service posts
    - `post_categories` - Categories for posts
    - `post_tags` - Tags for posts
    - `service_bundles` - Service packages
    - `availability_slots` - Booking slots
    - `case_studies` - Work showcases
  
  2. Security
    - Enable RLS on all tables
    - Add policies for CRUD operations
    
  3. Changes
    - Add necessary indexes for performance
    - Add triggers for updated_at timestamps
    - Fix foreign key relationships
*/

-- Drop existing tables if they exist to ensure clean recreation
DROP TABLE IF EXISTS case_studies CASCADE;
DROP TABLE IF EXISTS availability_slots CASCADE;
DROP TABLE IF EXISTS service_bundles CASCADE;
DROP TABLE IF EXISTS post_ratings CASCADE;
DROP TABLE IF EXISTS post_bookmarks CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS post_categories CASCADE;

-- Create post_categories table first (referenced by other tables)
CREATE TABLE post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_tags table
CREATE TABLE post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES post_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table with explicit foreign key constraint
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location JSONB,
  is_remote BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'hourly', 'free', 'contact')),
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  availability_date DATE,
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'unavailable')),
  experience_level TEXT DEFAULT 'mid' CHECK (experience_level IN ('junior', 'mid', 'senior')),
  service_type TEXT DEFAULT 'one-time' CHECK (service_type IN ('one-time', 'long-term', 'consulting', 'coaching')),
  media_urls TEXT[] DEFAULT '{}',
  has_video_pitch BOOLEAN DEFAULT false,
  has_voice_intro BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_collaborative BOOLEAN DEFAULT false,
  collaborators UUID[] DEFAULT '{}',
  success_rate INTEGER,
  projects_completed INTEGER DEFAULT 0,
  avg_response_time INTEGER, -- in minutes
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint explicitly
ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create post_bookmarks table
CREATE TABLE post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post_ratings table
CREATE TABLE post_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create service_bundles table
CREATE TABLE service_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  delivery_time INTEGER, -- in days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability_slots table
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  booked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create case_studies table
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  results TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_posts_price ON posts(price);
CREATE INDEX idx_posts_experience_level ON posts(experience_level);
CREATE INDEX idx_posts_service_type ON posts(service_type);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX idx_post_bookmarks_post_id ON post_bookmarks(post_id);
CREATE INDEX idx_post_ratings_post_id ON post_ratings(post_id);
CREATE INDEX idx_post_ratings_user_id ON post_ratings(user_id);
CREATE INDEX idx_availability_slots_post_id ON availability_slots(post_id);
CREATE INDEX idx_availability_slots_start_time ON availability_slots(start_time);
CREATE INDEX idx_service_bundles_post_id ON service_bundles(post_id);
CREATE INDEX idx_case_studies_post_id ON case_studies(post_id);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_bookmarks
CREATE POLICY "Users can view their own bookmarks" ON post_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bookmarks" ON post_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bookmarks" ON post_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_ratings
CREATE POLICY "Users can view all ratings" ON post_ratings FOR SELECT USING (true);
CREATE POLICY "Users can create their own ratings" ON post_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON post_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings" ON post_ratings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_categories
CREATE POLICY "Everyone can view categories" ON post_categories FOR SELECT USING (true);

-- RLS Policies for post_tags
CREATE POLICY "Everyone can view tags" ON post_tags FOR SELECT USING (true);

-- RLS Policies for service_bundles
CREATE POLICY "Everyone can view service bundles" ON service_bundles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own service bundles" ON service_bundles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM posts WHERE posts.id = service_bundles.post_id AND posts.user_id = auth.uid()
  )
);

-- RLS Policies for availability_slots
CREATE POLICY "Everyone can view availability slots" ON availability_slots FOR SELECT USING (true);
CREATE POLICY "Users can manage their own availability slots" ON availability_slots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM posts WHERE posts.id = availability_slots.post_id AND posts.user_id = auth.uid()
  )
);

-- RLS Policies for case_studies
CREATE POLICY "Everyone can view case studies" ON case_studies FOR SELECT USING (true);
CREATE POLICY "Users can manage their own case studies" ON case_studies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM posts WHERE posts.id = case_studies.post_id AND posts.user_id = auth.uid()
  )
);

-- Function to update post rating when a new rating is added
CREATE OR REPLACE FUNCTION update_post_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM post_ratings 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM post_ratings 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post rating
CREATE TRIGGER trigger_update_post_rating
  AFTER INSERT OR UPDATE OR DELETE ON post_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_post_rating();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_service_bundles_updated_at
  BEFORE UPDATE ON service_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO post_categories (name, description, icon, color)
VALUES
  ('Development', 'Software and web development services', 'code', '#3B82F6'),
  ('Design', 'UI/UX and graphic design services', 'palette', '#10B981'),
  ('Marketing', 'Digital marketing and SEO services', 'trending-up', '#F59E0B'),
  ('Writing', 'Content writing and copywriting services', 'pen-tool', '#8B5CF6'),
  ('Legal', 'Legal services and consultancy', 'scale', '#EF4444'),
  ('Finance', 'Financial services and consultancy', 'dollar-sign', '#06B6D4'),
  ('Education', 'Teaching and tutoring services', 'book-open', '#EC4899'),
  ('Health', 'Health and wellness services', 'heart', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- Insert default tags
INSERT INTO post_tags (name, category_id)
VALUES
  ('React', (SELECT id FROM post_categories WHERE name = 'Development')),
  ('JavaScript', (SELECT id FROM post_categories WHERE name = 'Development')),
  ('Python', (SELECT id FROM post_categories WHERE name = 'Development')),
  ('UI Design', (SELECT id FROM post_categories WHERE name = 'Design')),
  ('Logo Design', (SELECT id FROM post_categories WHERE name = 'Design')),
  ('SEO', (SELECT id FROM post_categories WHERE name = 'Marketing')),
  ('Content Marketing', (SELECT id FROM post_categories WHERE name = 'Marketing')),
  ('Copywriting', (SELECT id FROM post_categories WHERE name = 'Writing')),
  ('Technical Writing', (SELECT id FROM post_categories WHERE name = 'Writing')),
  ('Contract Review', (SELECT id FROM post_categories WHERE name = 'Legal')),
  ('Tax Planning', (SELECT id FROM post_categories WHERE name = 'Finance')),
  ('Math Tutoring', (SELECT id FROM post_categories WHERE name = 'Education')),
  ('Fitness Training', (SELECT id FROM post_categories WHERE name = 'Health'))
ON CONFLICT (name) DO NOTHING;

-- Force schema refresh by updating a system table comment
COMMENT ON TABLE posts IS 'Service posts table - updated to fix schema cache';