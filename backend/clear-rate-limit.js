require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

redis.on('error', (err) => {
  console.error('Redis error:', err);
  process.exit(1);
});

(async () => {
  try {
    console.log('Connected to Redis');
    
    const keys = await redis.keys('*login*');
    console.log('Found login rate limit keys:', keys.length);
    
    if (keys.length > 0) {
      const deleted = await redis.del(...keys);
      console.log('Deleted:', deleted, 'keys');
    }
    
    await redis.quit();
    console.log('✅ Rate limits cleared');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
