// Database Seeding Script for RoleNet
// This script populates the Supabase database with sample users

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample user data
const sampleUsers = [
  {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'Teacher',
    tags: ['Education', 'Mentorship', 'Learning'],
    location: { latitude: 37.7749, longitude: -122.4194, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Passionate educator with 10+ years experience',
    online_status: 'online',
    is_available: true,
    rating: 4.8,
    rating_count: 23,
  },
  {
    name: 'Michael Chen',
    email: 'michael@example.com',
    role: 'Developer',
    tags: ['Technology', 'Programming', 'Innovation'],
    location: { latitude: 37.7849, longitude: -122.4094, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Full-stack developer passionate about clean code',
    online_status: 'online',
    is_available: true,
    rating: 4.6,
    rating_count: 45,
  },
  {
    name: 'Dr. Amanda Rodriguez',
    email: 'amanda@example.com',
    role: 'Doctor',
    tags: ['Healthcare', 'Wellness', 'Consultation'],
    location: { latitude: 37.7649, longitude: -122.4294, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Family physician with expertise in preventive care',
    online_status: 'away',
    is_available: false,
    rating: 4.9,
    rating_count: 67,
  },
  {
    name: 'James Wilson',
    email: 'james@example.com',
    role: 'Designer',
    tags: ['Creative', 'UI/UX', 'Branding'],
    location: { latitude: 37.7549, longitude: -122.4394, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Creative designer specializing in user experience',
    online_status: 'online',
    is_available: true,
    rating: 4.7,
    rating_count: 34,
  },
  {
    name: 'Lisa Thompson',
    email: 'lisa@example.com',
    role: 'Chef',
    tags: ['Culinary', 'Nutrition', 'Training'],
    location: { latitude: 37.7449, longitude: -122.4494, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Professional chef with expertise in healthy cooking',
    online_status: 'offline',
    is_available: false,
    rating: 4.5,
    rating_count: 56,
  },
  // Additional users
  {
    name: 'Robert Garcia',
    email: 'robert@example.com',
    role: 'Architect',
    tags: ['Design', 'Construction', 'Sustainability'],
    location: { latitude: 34.0522, longitude: -118.2437, address: 'Los Angeles, CA' },
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Award-winning architect focused on sustainable design',
    online_status: 'online',
    is_available: true,
    rating: 4.9,
    rating_count: 42,
  },
  {
    name: 'Emily Patel',
    email: 'emily@example.com',
    role: 'Marketing Specialist',
    tags: ['Digital Marketing', 'Social Media', 'Content Creation'],
    location: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Digital marketing expert with a focus on growth strategies',
    online_status: 'online',
    is_available: true,
    rating: 4.7,
    rating_count: 38,
  },
  {
    name: 'David Kim',
    email: 'david@example.com',
    role: 'Financial Advisor',
    tags: ['Investment', 'Retirement Planning', 'Wealth Management'],
    location: { latitude: 41.8781, longitude: -87.6298, address: 'Chicago, IL' },
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Helping clients achieve financial freedom through smart planning',
    online_status: 'away',
    is_available: true,
    rating: 4.8,
    rating_count: 51,
  },
  {
    name: 'Sophia Martinez',
    email: 'sophia@example.com',
    role: 'Photographer',
    tags: ['Portrait', 'Commercial', 'Event'],
    location: { latitude: 33.4484, longitude: -112.0740, address: 'Phoenix, AZ' },
    avatar: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Capturing life\'s special moments with a creative eye',
    online_status: 'online',
    is_available: true,
    rating: 4.6,
    rating_count: 29,
  },
  {
    name: 'Thomas Wright',
    email: 'thomas@example.com',
    role: 'Fitness Trainer',
    tags: ['Personal Training', 'Nutrition', 'Wellness'],
    location: { latitude: 32.7157, longitude: -117.1611, address: 'San Diego, CA' },
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Certified personal trainer specializing in holistic fitness',
    online_status: 'online',
    is_available: true,
    rating: 4.9,
    rating_count: 63,
  },
];

// Function to seed the database
async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Insert users
    const { data: insertedUsers, error: userError } = await supabase
      .from('users')
      .upsert(sampleUsers, { onConflict: 'email' })
      .select();

    if (userError) {
      throw userError;
    }

    console.log(`Successfully inserted ${insertedUsers.length} users`);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seeding function
seedDatabase();