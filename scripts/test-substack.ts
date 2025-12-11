/**
 * Test script for Substack publishing
 * Run with: npx tsx scripts/test-substack.ts
 */

import 'dotenv/config';
import { SubstackPublisher } from '../src/publishers/substack-publisher.js';

async function testSubstack() {
  const publisher = new SubstackPublisher();

  // Check configuration
  console.log('Checking Substack configuration...');
  console.log('  Email:', process.env.SUBSTACK_EMAIL ? '✓ Set' : '✗ Missing');
  console.log('  Password:', process.env.SUBSTACK_PASSWORD ? '✓ Set' : '✗ Missing');
  console.log('  Publication URL:', process.env.SUBSTACK_PUBLICATION_URL || '✗ Missing');

  if (!publisher.isConfigured()) {
    console.error('\n❌ Substack is not configured. Set environment variables in .env');
    process.exit(1);
  }

  console.log('\n✓ Configuration valid\n');

  // Test article
  const testArticle = {
    id: 'test-' + Date.now(),
    title: 'Test Post from News Radar - ' + new Date().toLocaleString(),
    content: `
This is a test post from News Radar Studio.

## What is this?

This post was automatically published using browser automation since Substack doesn't provide a public API.

**Key features:**
- Automatic publishing from your dashboard
- Markdown to HTML conversion
- Scheduled posting support

If you see this, the integration is working! You can delete this post.

---
*Published via News Radar Studio*
    `.trim(),
    created_at: new Date().toISOString(),
  };

  console.log('Publishing test article...');
  console.log('  Title:', testArticle.title);
  console.log('');

  const result = await publisher.publish(testArticle);

  if (result.success) {
    console.log('✓ Published successfully!');
    console.log('  URL:', result.postUrl);
    console.log('  Post ID:', result.postId);
  } else {
    console.error('✗ Publishing failed:', result.error);
  }
}

testSubstack().catch(console.error);
