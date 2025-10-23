/**
 * Server Verification Script
 * Checks if both frontend and backend servers are running
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

interface ServerStatus {
  name: string;
  url: string;
  running: boolean;
  error?: string;
  details?: any;
}

async function checkServer(name: string, url: string, healthEndpoint?: string): Promise<ServerStatus> {
  try {
    const checkUrl = healthEndpoint || url;
    const response = await axios.get(checkUrl, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });

    if (response.status < 400) {
      return {
        name,
        url,
        running: true,
        details: response.data
      };
    } else {
      return {
        name,
        url,
        running: false,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      name,
      url,
      running: false,
      error: error.code === 'ECONNREFUSED' 
        ? 'Server not running' 
        : error.message
    };
  }
}

async function checkPort(port: number): Promise<boolean> {
  try {
    // Windows command to check if port is in use
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.trim().length > 0;
    } else {
      // Mac/Linux command
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return stdout.trim().length > 0;
    }
  } catch (error) {
    return false;
  }
}

async function getBrowserCacheStatus(): Promise<string[]> {
  const issues: string[] = [];
  
  console.log('\n📦 Browser Cache Check:');
  console.log('   (This check requires manual verification in browser)');
  console.log('   1. Open browser DevTools (F12)');
  console.log('   2. Go to Application/Storage tab');
  console.log('   3. Check localStorage, sessionStorage, IndexedDB');
  console.log('   4. If issues persist, use: http://localhost:3000/clear-cache.html');
  
  return issues;
}

async function verifyServers() {
  console.log('\n🔍 RentFlow Server Verification');
  console.log('='.repeat(60));
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  // Check backend
  console.log('\n📡 Checking Backend Server...');
  const backendStatus = await checkServer('Backend API', BACKEND_URL, `${BACKEND_URL}/api/health`);
  
  if (backendStatus.running) {
    console.log(`✅ Backend is ONLINE at ${backendStatus.url}`);
    if (backendStatus.details) {
      console.log(`   Status: ${backendStatus.details.status}`);
      console.log(`   Network: ${backendStatus.details.network}`);
      console.log(`   Deployer: ${backendStatus.details.deployer}`);
    }
  } else {
    console.log(`❌ Backend is OFFLINE at ${backendStatus.url}`);
    console.log(`   Error: ${backendStatus.error}`);
    
    // Check if port is in use
    const portInUse = await checkPort(3001);
    if (portInUse) {
      console.log(`   ⚠️  Port 3001 is in use but not responding correctly`);
      console.log(`   💡 Try: Kill the process and restart`);
      if (process.platform === 'win32') {
        console.log(`      Windows: netstat -ano | findstr :3001`);
        console.log(`      Then: taskkill /F /PID <PID>`);
      } else {
        console.log(`      Mac/Linux: lsof -i :3001`);
        console.log(`      Then: kill -9 <PID>`);
      }
    } else {
      console.log(`   💡 Start backend: cd backend && npm run dev`);
    }
  }

  // Check frontend
  console.log('\n🌐 Checking Frontend Server...');
  const frontendStatus = await checkServer('Frontend', FRONTEND_URL);
  
  if (frontendStatus.running) {
    console.log(`✅ Frontend is ONLINE at ${frontendStatus.url}`);
  } else {
    console.log(`❌ Frontend is OFFLINE at ${frontendStatus.url}`);
    console.log(`   Error: ${frontendStatus.error}`);
    
    const portInUse = await checkPort(3000);
    if (portInUse) {
      console.log(`   ⚠️  Port 3000 is in use but not responding correctly`);
      console.log(`   💡 Try: Kill the process and restart`);
    } else {
      console.log(`   💡 Start frontend: cd frontend && npm start`);
    }
  }

  // Browser cache check
  await getBrowserCacheStatus();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  
  const allGood = backendStatus.running && frontendStatus.running;
  
  if (allGood) {
    console.log('✅ All servers are running correctly!');
    console.log('\n🚀 You can now access:');
    console.log(`   - Application: ${FRONTEND_URL}`);
    console.log(`   - API Health: ${BACKEND_URL}/api/health`);
    console.log(`   - Cache Tool: ${FRONTEND_URL}/clear-cache.html`);
  } else {
    console.log('❌ Some servers are not running');
    console.log('\n📝 Action Items:');
    
    if (!backendStatus.running) {
      console.log('   1. Start backend server');
      console.log('      cd backend');
      console.log('      npm run dev');
    }
    
    if (!frontendStatus.running) {
      console.log('   2. Start frontend server');
      console.log('      cd frontend');
      console.log('      npm start');
    }
    
    console.log('\n   OR use root command:');
    console.log('      npm run dev');
  }

  console.log('\n💡 Troubleshooting:');
  console.log('   - Connection refused? → Server not running');
  console.log('   - Empty page? → Clear browser cache');
  console.log('   - Different browsers? → Clear cache in each browser');
  console.log(`   - Use diagnostic tool: ${FRONTEND_URL}/clear-cache.html`);
  console.log('   - Read: BROWSER_CACHE_FIX.md');
  
  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(allGood ? 0 : 1);
}

// Run verification
verifyServers().catch(error => {
  console.error('\n💥 Verification failed:', error.message);
  process.exit(1);
});
