import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserOrganization() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  console.log('=== FIX USER ORGANIZATION ===\n');
  console.log(`Connected to database: ${db.databaseName}\n`);

  // 1. Find the user
  const userEmail = 'gagan.kapoor@netgroup.ai';
  console.log(`Looking for user: ${userEmail}`);
  const user = await db.collection('users').findOne({ email: userEmail });

  if (!user) {
    console.error(`❌ User not found: ${userEmail}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`✓ Found user: ${user.name} (ID: ${user._id})`);
  console.log(`  Current organization_id: ${user.organization_id || 'NULL'}`);

  // 2. Check organizations
  console.log('\n--- ORGANIZATIONS IN DATABASE ---');
  const orgs = await db.collection('organizations').find({}).toArray();
  console.log(`Found ${orgs.length} organization(s):`);
  orgs.forEach((o: any, idx: number) => {
    console.log(`  ${idx + 1}. ${o.name} (ID: ${o._id})`);
    console.log(`     Domain: ${o.domain || 'none'}`);
    console.log(`     Owner: ${o.owner_id || 'none'}`);
  });

  // 3. Check organization members
  console.log('\n--- ORGANIZATION MEMBERSHIPS ---');
  const orgMembers = await db.collection('organizationmembers').find({}).toArray();
  console.log(`Found ${orgMembers.length} membership(s):`);

  const userMembership = orgMembers.find((m: any) => m.user_id?.toString() === user._id.toString());
  if (userMembership) {
    console.log(`✓ User has membership record:`);
    console.log(`  Organization: ${userMembership.organization_id}`);
    console.log(`  Role: ${userMembership.role || 'member'}`);
  } else {
    console.log(`❌ No membership record found for user`);
  }

  // 4. Find or create NetGroup organization
  console.log('\n--- FIXING ORGANIZATION ASSOCIATION ---');

  let targetOrg = orgs.find((o: any) =>
    o.domain === 'netgroup.ai' ||
    o.name.toLowerCase().includes('netgroup')
  );

  if (!targetOrg) {
    console.log('⚠️  No NetGroup organization found. Creating one...');

    const newOrg = {
      name: 'NetGroup',
      slug: 'netgroup',
      domain: 'netgroup.ai',
      owner_id: user._id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await db.collection('organizations').insertOne(newOrg);
    targetOrg = { ...newOrg, _id: result.insertedId };
    console.log(`✓ Created organization: ${targetOrg.name} (ID: ${targetOrg._id})`);
  } else {
    console.log(`✓ Found organization: ${targetOrg.name} (ID: ${targetOrg._id})`);
  }

  // 5. Update user's organization_id
  console.log(`\nUpdating user's organization_id to: ${targetOrg._id}`);
  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        organization_id: targetOrg._id,
        updated_at: new Date().toISOString()
      }
    }
  );
  console.log('✓ User organization_id updated');

  // 6. Create or update organization membership
  if (userMembership) {
    console.log('\nUpdating existing membership record...');
    await db.collection('organizationmembers').updateOne(
      { _id: userMembership._id },
      {
        $set: {
          organization_id: targetOrg._id,
          role: 'owner', // Make the user an owner since they're the first/primary user
          updated_at: new Date().toISOString()
        }
      }
    );
    console.log('✓ Membership record updated');
  } else {
    console.log('\nCreating new membership record...');
    await db.collection('organizationmembers').insertOne({
      user_id: user._id,
      organization_id: targetOrg._id,
      role: 'owner',
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('✓ Membership record created');
  }

  // 7. Check if there are projects without organization_id and associate them
  console.log('\n--- CHECKING PROJECTS ---');
  const projectsWithoutOrg = await db.collection('projects').find({
    $or: [
      { organization_id: null },
      { organization_id: { $exists: false } }
    ]
  }).toArray();

  if (projectsWithoutOrg.length > 0) {
    console.log(`Found ${projectsWithoutOrg.length} project(s) without organization:`);
    projectsWithoutOrg.forEach((p: any) => {
      console.log(`  - ${p.name} (ID: ${p._id})`);
    });

    console.log('\nAssociating projects with organization...');
    await db.collection('projects').updateMany(
      {
        $or: [
          { organization_id: null },
          { organization_id: { $exists: false } }
        ]
      },
      {
        $set: {
          organization_id: targetOrg._id,
          updated_at: new Date().toISOString()
        }
      }
    );
    console.log(`✓ Updated ${projectsWithoutOrg.length} project(s)`);
  } else {
    console.log('✓ All projects already have organization associations');
  }

  // 8. Verify the fix
  console.log('\n--- VERIFICATION ---');
  const updatedUser = await db.collection('users').findOne({ email: userEmail });
  console.log(`✓ User organization_id: ${updatedUser?.organization_id}`);

  const membership = await db.collection('organizationmembers').findOne({
    user_id: user._id,
    organization_id: targetOrg._id
  });
  console.log(`✓ Membership exists: ${membership ? 'YES' : 'NO'}`);
  if (membership) {
    console.log(`  Role: ${membership.role}`);
  }

  await mongoose.disconnect();
  console.log('\n=== FIX COMPLETE ===');
  console.log('\n🎉 You should now be able to log in without seeing the onboarding modal!');
  console.log('Please refresh your browser to see the changes.');
}

fixUserOrganization().catch(console.error);
