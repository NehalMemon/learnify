
'use server'

import { createClient } from '@supabase/supabase-js';

export async function seedTestUsers() {
  // 1. Initialize the Admin Client using the Service Role Key
  // This bypasses RLS and gives us access to the auth.admin methods
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const groups = [
    { prefix: 'stu', role: 'STUDENT' },
    { prefix: 'inst', role: 'INSTRUCTOR' }
  ];

  let successCount = 0;

  for (const group of groups) {
    for (let i = 1; i <= 5; i++) {
      const email = `${group.prefix}${i}@gmail.com`;
      const password = email; // Password same as email
      const fullName = `${group.prefix}${i}`;

      console.log(`Creating user: ${email}...`);

      // 2. Safely create the user via the GoTrue Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) {
        console.error(`❌ Failed to create auth for ${email}:`, authError.message);
        continue;
      }

      // 3. Sync with your public.users table
      if (authData.user) {
        // Attempt to insert the user into the public table
        const { error: dbError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            role: group.role,
            full_name: fullName
          });

        // If it fails (e.g., because you already have an auto-insert trigger), 
        // fallback to an UPDATE to ensure the role is set correctly.
        if (dbError) {
          await supabaseAdmin
            .from('users')
            .update({ role: group.role, full_name: fullName })
            .eq('id', authData.user.id);
        }
        
        successCount++;
        console.log(`✅ Successfully seeded ${email}`);
      }
    }
  }

  return { success: true, message: `Successfully created ${successCount} test users!` };
}