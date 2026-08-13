import { createClient } from '@supabase/supabase-js';

export default async function seedUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🌱 Starting user seeding...\n');

  const groups = [
    { prefix: 'stu', role: 'STUDENT' },
    { prefix: 'inst', role: 'INSTRUCTOR' },
  ];

  let successCount = 0;

  for (const group of groups) {
    for (let i = 1; i <= 5; i++) {
      const email = `${group.prefix}${i}@gmail.com`;
      const password = email;
      const fullName = `${group.prefix}${i}`;

      console.log(`Creating ${group.role}: ${email}...`);

      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: group.role,
        },
      });

      if (error) {
        console.error(`❌ Failed to create ${email}:`, error.message);
      } else {
        console.log(`✅ Success: ${email}`);
        successCount++;
      }
    }
  }

  console.log(`\nUser seeding complete! Created ${successCount}/10 users.`);
}
