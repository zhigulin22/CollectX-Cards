// API Tests
const API = 'http://localhost:3001/api';

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + endpoint, opts);
  return res.json();
}

function test(name, condition, details = '') {
  if (condition) {
    tests.passed++;
    tests.results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } else {
    tests.failed++;
    tests.results.push({ name, passed: false, details });
    console.log(`❌ ${name}${details ? ': ' + details : ''}`);
  }
}

async function runTests() {
  console.log('\n🧪 Running API Tests...\n');
  
  // 1. Auth Tests
  console.log('--- AUTH TESTS ---');
  
  const auth1 = await api('/users/auth', 'POST', { telegramId: 999999999, username: 'test_user' });
  test('Auth creates new user', auth1.user?.id);
  test('Auth returns stats', auth1.stats?.total !== undefined);
  test('Auth returns ranks', auth1.ranks?.bronze);
  
  const auth2 = await api('/users/auth', 'POST', { telegramId: 999999999, username: 'test_user' });
  test('Auth returns existing user', auth1.user?.id === auth2.user?.id);
  
  const authFail = await api('/users/auth', 'POST', {});
  test('Auth fails without telegramId', authFail.error);
  
  // 2. Collections Tests
  console.log('\n--- COLLECTIONS TESTS ---');
  
  const collections = await api('/collections');
  test('Get collections returns array', Array.isArray(collections));
  test('Collections have required fields', collections[0]?.id && collections[0]?.name);
  
  if (collections.length > 0) {
    const col = await api(`/collections/${collections[0].id}`);
    test('Get single collection works', col.id);
    test('Collection has cards array', Array.isArray(col.cards));
    test('Collection has stats', col.stats?.total_cards !== undefined);
    
    const progress = await api(`/collections/${collections[0].id}/progress/${auth1.user.id}`);
    test('Collection progress works', progress.total !== undefined);
  }
  
  // 3. Inventory Tests
  console.log('\n--- INVENTORY TESTS ---');
  
  const inventory = await api(`/users/${auth1.user.id}/inventory`);
  test('Get inventory returns array', Array.isArray(inventory));
  
  const invFiltered = await api(`/users/${auth1.user.id}/inventory?rarity=rare`);
  test('Inventory filter by rarity works', Array.isArray(invFiltered));
  
  // 4. Box Tests
  console.log('\n--- BOX TESTS ---');
  
  const boxes = await api('/boxes');
  test('Get boxes returns array', Array.isArray(boxes));
  test('Boxes have required fields', boxes[0]?.id && boxes[0]?.name);
  
  const freeBox = boxes.find(b => b.price === 0);
  if (freeBox) {
    const freeStatus = await api(`/users/${auth1.user.id}/free-box`);
    test('Free box status works', freeStatus.available !== undefined);
    
    if (freeStatus.available) {
      const openResult = await api(`/boxes/${freeBox.id}/open`, 'POST', {
        userId: auth1.user.id, isFree: true
      });
      test('Open free box works', openResult.success);
      test('Open box returns cards', openResult.cards?.length > 0);
    }
  }
  
  // 5. Card Tests
  console.log('\n--- CARD TESTS ---');
  
  const inv = await api(`/users/${auth1.user.id}/inventory`);
  if (inv.length > 0) {
    const cardDetail = await api(`/cards/${inv[0].card_id || inv[0].id}`);
    test('Get card details works', cardDetail.id);
    test('Card has market value', cardDetail.marketValue !== undefined);
    test('Card has uniqueness score', cardDetail.uniqueness !== undefined);
    test('Card has collection info', cardDetail.collection_name);
  }
  
  // 6. Security Tests
  console.log('\n--- SECURITY TESTS ---');
  
  const invalidUser = await api('/users/invalid-id-12345');
  test('Invalid user returns 404', invalidUser.error);
  
  const invalidCollection = await api('/collections/invalid-id-12345');
  test('Invalid collection returns 404', invalidCollection.error);
  
  // Test rate limiting (make many requests)
  let rateLimited = false;
  for (let i = 0; i < 100; i++) {
    const res = await api('/users/auth', 'POST', { telegramId: 888888888, username: 'rate_test' });
    if (res.error?.includes('Too many')) {
      rateLimited = true;
      break;
    }
  }
  test('Rate limiting works', rateLimited, 'Made 100 requests without rate limit');
  
  // Report
  console.log('\n' + '═'.repeat(40));
  console.log(`📊 TEST RESULTS: ${tests.passed} passed, ${tests.failed} failed`);
  console.log('═'.repeat(40) + '\n');
  
  return tests;
}

// Run if called directly
runTests().catch(console.error);

export { runTests };

