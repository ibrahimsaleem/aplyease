#!/usr/bin/env node

/**
 * Database Connection Tester
 * 
 * This script helps diagnose PostgreSQL connection issues:
 * 1. Checks if DATABASE_URL is set
 * 2. Attempts to connect to both direct (5432) and pooler (6543) ports
 * 3. Tests SSL connectivity
 * 4. Provides recommendations for fixing connection issues
 */

const { Client } = require('pg');
const dns = require('dns').promises;

async function testConnection(connectionString, label) {
  console.log(`\n🔍 Testing ${label}...`);
  console.log(`Connection string: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
  
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log(`✅ ${label} - SUCCESS`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);
    return true;
  } catch (error) {
    console.log(`❌ ${label} - FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore errors when closing failed connections
    }
  }
}

async function parseConnectionString(url) {
  const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/(.+?)(\?.*)?$/;
  const match = url.match(regex);
  
  if (!match) {
    console.error('❌ Invalid DATABASE_URL format');
    return null;
  }
  
  const [, user, password, host, port, database, params] = match;
  return { user, password, host, port, database, params: params || '' };
}

async function checkDNS(host) {
  console.log(`\n🔍 Checking DNS for ${host}...`);
  try {
    const addresses = await dns.resolve4(host);
    console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
    return addresses;
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Database Connection Diagnostic Tool\n');
  console.log('=' .repeat(60));
  
  // Check environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('\n📋 To fix this, set your DATABASE_URL:');
    console.log('   export DATABASE_URL="postgresql://user:pass@host:port/db"');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set');
  
  // Parse connection string
  const parsed = await parseConnectionString(databaseUrl);
  if (!parsed) {
    process.exit(1);
  }
  
  console.log(`\n📊 Connection Details:`);
  console.log(`   Host: ${parsed.host}`);
  console.log(`   Port: ${parsed.port}`);
  console.log(`   Database: ${parsed.database}`);
  console.log(`   User: ${parsed.user}`);
  console.log(`   SSL Params: ${parsed.params || 'none'}`);
  
  // Check DNS
  const addresses = await checkDNS(parsed.host);
  
  // Test current connection
  const currentSuccess = await testConnection(databaseUrl, 'Current Configuration');
  
  // If current port is 6543 (pooler), also try 5432 (direct)
  if (parsed.port === '6543' && !currentSuccess) {
    console.log('\n💡 Port 6543 failed (pooler). Trying direct connection on 5432...');
    const directUrl = databaseUrl.replace(':6543/', ':5432/');
    const directSuccess = await testConnection(directUrl, 'Direct Connection (Port 5432)');
    
    if (directSuccess) {
      console.log('\n✨ RECOMMENDATION:');
      console.log('   The direct connection (port 5432) works!');
      console.log('   Update your DATABASE_URL to use port 5432:');
      console.log(`   ${directUrl.replace(/:[^:@]+@/, ':****@')}`);
    }
  }
  
  // If current port is 5432 (direct), also try 6543 (pooler)
  if (parsed.port === '5432') {
    console.log('\n🔄 Testing pooler connection on 6543...');
    const poolerUrl = databaseUrl.replace(':5432/', ':6543/');
    const poolerSuccess = await testConnection(poolerUrl, 'Pooler Connection (Port 6543)');
    
    if (poolerSuccess && !poolerUrl.includes('pgbouncer=true')) {
      console.log('\n✨ RECOMMENDATION:');
      console.log('   The pooler connection works! For serverless deployments, consider:');
      const recommendedUrl = poolerUrl.includes('?') 
        ? `${poolerUrl}&pgbouncer=true&connection_limit=1`
        : `${poolerUrl}?pgbouncer=true&connection_limit=1`;
      console.log(`   ${recommendedUrl.replace(/:[^:@]+@/, ':****@')}`);
    }
  }
  
  // Test SSL variations if initial connection failed
  if (!currentSuccess) {
    console.log('\n🔒 Testing SSL variations...');
    
    // Test with sslmode=require
    const sslRequireUrl = databaseUrl.includes('?') 
      ? `${databaseUrl}&sslmode=require`
      : `${databaseUrl}?sslmode=require`;
    await testConnection(sslRequireUrl, 'With sslmode=require');
    
    // Test with sslmode=disable
    const sslDisableUrl = databaseUrl.includes('?')
      ? `${databaseUrl}&sslmode=disable`
      : `${databaseUrl}?sslmode=disable`;
    await testConnection(sslDisableUrl, 'With sslmode=disable');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📚 Common Issues and Solutions:\n');
  console.log('1. ECONNREFUSED - The port is not accessible:');
  console.log('   - Check if the port (5432 or 6543) is open');
  console.log('   - Verify firewall/security group rules');
  console.log('   - Try switching between port 5432 and 6543\n');
  
  console.log('2. Connection Pooler Issues:');
  console.log('   - Add ?pgbouncer=true&connection_limit=1 for PgBouncer');
  console.log('   - Use max: 1 in your pool configuration');
  console.log('   - Enable keepAlive: true\n');
  
  console.log('3. SSL Certificate Issues:');
  console.log('   - Add ?sslmode=require to connection string');
  console.log('   - Or use ssl: { rejectUnauthorized: true } in code');
  console.log('   - Never use NODE_TLS_REJECT_UNAUTHORIZED=0 in production\n');
  
  console.log('4. Provider-Specific:');
  console.log('   - Supabase: Use Transaction mode pooler, add pgbouncer=true');
  console.log('   - AWS RDS: Use direct connection (5432) with SSL');
  console.log('   - Render: Use external connection URL with SSL\n');
  
  console.log('✅ Diagnostic complete!\n');
}

main().catch(console.error);
