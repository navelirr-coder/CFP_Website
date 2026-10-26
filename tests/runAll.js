// tests/runAll.js
// Master test runner for all Phase 2 backend verification test suites

const { runLifecycleTests } = require('./lifecycle.test');
const { runStateMachineTests } = require('./stateMachine.test');
const { runSecurityTests } = require('./security.test');
const { runWebhookTests } = require('./webhooks.test');
const { runEnquiryTests } = require('./enquiries.test');

async function runAllTests() {
  console.log('====================================================');
  console.log(' Starting CFP Backend Automated Verification Suite');
  console.log('====================================================');
  const startTime = Date.now();

  try {
    await runLifecycleTests();
    await runStateMachineTests();
    await runSecurityTests();
    await runWebhookTests();
    await runEnquiryTests();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n====================================================');
    console.log(` ALL TESTS PASSED SUCCESSFULLY in ${duration}s`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\nTest Suite FAILED with error:');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
