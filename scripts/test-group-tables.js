const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroupTables() {
  console.log('🔍 Testing Group Tables Implementation...');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if group_members table exists
    console.log('\n1. Testing group_members table...');
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .limit(1);
    
    if (membersError) {
      console.log('❌ group_members table not found or accessible');
      console.log('Error:', membersError.message);
    } else {
      console.log('✅ group_members table exists and accessible');
    }
    
    // Test 2: Check if group_settings table exists
    console.log('\n2. Testing group_settings table...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('group_settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      console.log('❌ group_settings table not found or accessible');
      console.log('Error:', settingsError.message);
    } else {
      console.log('✅ group_settings table exists and accessible');
    }
    
    // Test 3: Check if chats table has group-related columns
    console.log('\n3. Testing chats table group columns...');
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id, name, is_group, unique_link, created_by, avatar_url')
      .limit(1);
    
    if (chatsError) {
      console.log('❌ Error accessing chats table group columns');
      console.log('Error:', chatsError.message);
    } else {
      console.log('✅ Chats table group columns accessible');
    }
    
    console.log('\n' + '=' .repeat(50));
    
    if (!membersError && !settingsError && !chatsError) {
      console.log('🎉 All group tables are ready!');
      console.log('\n📋 Available Features:');
      console.log('   • Member role management (Admin/Moderator/Member)');
      console.log('   • Group settings configuration');
      console.log('   • Permission-based access control');
      console.log('   • Automatic group setup triggers');
      console.log('   • Row Level Security policies');
    } else {
      console.log('⚠️  Some tables need to be created.');
      console.log('\n📝 Next Steps:');
      console.log('   1. Apply the migration file: 20250627000000_add_group_roles_and_settings.sql');
      console.log('   2. Run this test again to verify');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testGroupTables();