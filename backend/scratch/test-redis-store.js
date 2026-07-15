const cr = require('connect-redis');
console.log('Keys:', Object.keys(cr));
console.log('RedisStore:', cr.RedisStore);
try {
  new cr.RedisStore({ client: {} });
  console.log('Success with cr.RedisStore');
} catch (e) {
  console.log('Failed with cr.RedisStore:', e.message);
}
