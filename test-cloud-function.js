/**
 * Test file for the Google Cloud Function
 * Run this to test your function locally before deployment
 */

const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  // For local testing
  LOCAL_URL: 'http://localhost:8080',
  // For deployed function testing (update with your actual URL)
  DEPLOYED_URL: 'https://us-central1-dadabhagwan-qna.cloudfunctions.net/processFormSubmission',
  USE_LOCAL: true // Set to false to test deployed function
};

// Test data
const testCases = [
  {
    name: 'Complete Form Data',
    data: {
      email: 'test@example.com',
      firstname: 'John',
      lastname: 'Doe',
      age: '30',
      gender: 'Male',
      city: 'Mumbai',
      status: 'Married',
      gnan_vidhi_year: '2020',
      english_question: 'What is the meaning of life according to Akram Vignan?',
      telephone: '+91-9876543210',
      remarks: 'This is a test submission with complete data.'
    }
  },
  {
    name: 'Minimal Required Data',
    data: {
      email: 'minimal@example.com',
      firstname: 'Jane'
    }
  },
  {
    name: 'Invalid Data (Missing Email)',
    data: {
      firstname: 'Invalid',
      lastname: 'User'
    },
    expectError: true
  },
  {
    name: 'Invalid Data (Missing Firstname)',
    data: {
      email: 'nofirstname@example.com'
    },
    expectError: true
  }
];

/**
 * Run all test cases
 */
async function runTests() {
  console.log('🧪 Starting Cloud Function Tests...\n');
  
  const url = CONFIG.USE_LOCAL ? CONFIG.LOCAL_URL : CONFIG.DEPLOYED_URL;
  console.log(`Testing against: ${url}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`📤 Data:`, JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      const statusCode = response.status;
      
      console.log(`📥 Response (${statusCode}):`, JSON.stringify(result, null, 2));
      
      // Check if the test result matches expectations
      if (testCase.expectError) {
        if (statusCode >= 400) {
          console.log('✅ Test PASSED (Expected error received)\n');
          passed++;
        } else {
          console.log('❌ Test FAILED (Expected error but got success)\n');
          failed++;
        }
      } else {
        if (statusCode >= 200 && statusCode < 300 && result.success) {
          console.log('✅ Test PASSED\n');
          passed++;
        } else {
          console.log('❌ Test FAILED\n');
          failed++;
        }
      }
      
    } catch (error) {
      console.error('❌ Test ERROR:', error.message);
      
      if (testCase.expectError) {
        console.log('✅ Test PASSED (Expected error occurred)\n');
        passed++;
      } else {
        console.log('❌ Test FAILED (Unexpected error)\n');
        failed++;
      }
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the function implementation.');
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('🏥 Testing Health Check...\n');
  
  const url = CONFIG.USE_LOCAL 
    ? 'http://localhost:8080' 
    : CONFIG.DEPLOYED_URL.replace('processFormSubmission', 'healthCheck');
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    console.log(`📥 Health Check Response (${response.status}):`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.status === 'healthy') {
      console.log('✅ Health Check PASSED\n');
    } else {
      console.log('❌ Health Check FAILED\n');
    }
  } catch (error) {
    console.error('❌ Health Check ERROR:', error.message, '\n');
  }
}

/**
 * Performance test
 */
async function performanceTest() {
  console.log('⚡ Running Performance Test...\n');
  
  const url = CONFIG.USE_LOCAL ? CONFIG.LOCAL_URL : CONFIG.DEPLOYED_URL;
  const testData = {
    email: 'performance@example.com',
    firstname: 'Performance',
    lastname: 'Test',
    english_question: 'This is a performance test question.'
  };
  
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testData,
          email: `performance${i}@example.com`
        })
      });
      
      await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);
      
      console.log(`Request ${i + 1}: ${duration}ms`);
      
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('\n📊 Performance Results:');
    console.log(`Average: ${avgTime.toFixed(2)}ms`);
    console.log(`Min: ${minTime}ms`);
    console.log(`Max: ${maxTime}ms`);
    
    if (avgTime < 2000) {
      console.log('✅ Performance is good (< 2s average)');
    } else {
      console.log('⚠️  Performance might need optimization (> 2s average)');
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Google Cloud Function Test Suite\n');
  
  // Check if we're testing locally and the server is running
  if (CONFIG.USE_LOCAL) {
    console.log('ℹ️  Testing locally. Make sure to start the function with: npm start\n');
  }
  
  try {
    await testHealthCheck();
    await runTests();
    await performanceTest();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
  
  console.log('\n🏁 Test suite completed.');
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  testHealthCheck,
  performanceTest
}; 