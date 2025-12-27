/**
 * Service Worker Installation Test
 * Tests that service workers can install and remain active
 */

class ServiceWorkerTest {
  constructor() {
    this.results = {
      registration: false,
      installation: false,
      activation: false,
      noSelfDestruct: false,
      fetchTimeoutWorks: false
    };
  }

  async runTests() {
    console.log('Starting Service Worker Tests...');

    try {
      // Test 1: Service Worker Registration
      await this.testRegistration();

      // Test 2: Installation without self-destruct
      await this.testInstallation();

      // Test 3: Activation
      await this.testActivation();

      // Test 4: Verify no self-destruct code
      await this.testNoSelfDestruct();

      // Test 5: Test fetchWithTimeout function
      await this.testFetchTimeout();

      this.printResults();
    } catch (error) {
      console.error('Test failed:', error);
    }
  }

  async testRegistration() {
    console.log('Test 1: Service Worker Registration');

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker-optimized.js');
        console.log('✓ Service worker registered successfully');
        this.results.registration = true;

        // Wait a bit for installation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if still registered
        const currentRegistration = await navigator.serviceWorker.getRegistration();
        if (currentRegistration) {
          console.log('✓ Service worker remains registered');
        } else {
          console.error('✗ Service worker was unregistered');
          throw new Error('Service worker was unregistered');
        }

      } catch (error) {
        console.error('✗ Service worker registration failed:', error);
        throw error;
      }
    } else {
      console.error('✗ Service Worker API not supported');
      throw new Error('Service Worker API not supported');
    }
  }

  async testInstallation() {
    console.log('Test 2: Service Worker Installation');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Installation test timed out'));
      }, 5000);

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('✓ Service worker controller changed (indicates successful installation)');
        this.results.installation = true;
        clearTimeout(timeout);
        resolve();
      });

      // Also check for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
          console.log('✓ Service worker sent performance metrics (indicates active)');
          this.results.installation = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  async testActivation() {
    console.log('Test 3: Service Worker Activation');

    return new Promise((resolve) => {
      const checkActivation = () => {
        if (navigator.serviceWorker.controller) {
          console.log('✓ Service worker is active and controlling page');
          this.results.activation = true;
          resolve();
        } else {
          setTimeout(checkActivation, 500);
        }
      };

      checkActivation();
    });
  }

  async testNoSelfDestruct() {
    console.log('Test 4: Verify No Self-Destruct Code');

    // Wait and check if service worker is still registered
    await new Promise(resolve => setTimeout(resolve, 3000));

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('✓ Service worker did not self-destruct');
      this.results.noSelfDestruct = true;
    } else {
      console.error('✗ Service worker self-destructed');
      throw new Error('Service worker self-destructed');
    }
  }

  async testFetchTimeout() {
    console.log('Test 5: Test fetchWithTimeout Function');

    try {
      // Test with a URL that should timeout
      const testRequest = new Request('https://httpbin.org/delay/1', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      // This should work within timeout (8 seconds default)
      const response = await this.callFetchWithTimeout(testRequest, 10000); // 10 second timeout

      if (response && response.ok) {
        console.log('✓ fetchWithTimeout completed successfully');
        this.results.fetchTimeoutWorks = true;
      } else {
        console.error('✗ fetchWithTimeout returned invalid response');
        throw new Error('Invalid response from fetchWithTimeout');
      }
    } catch (error) {
      console.error('✗ fetchWithTimeout test failed:', error);
      throw error;
    }
  }

  // Helper method to call the service worker's fetchWithTimeout
  callFetchWithTimeout(request, timeout) {
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'FETCH_TIMEOUT_RESULT') {
          resolve(event.data.response);
        } else if (event.data.type === 'FETCH_TIMEOUT_ERROR') {
          reject(new Error(event.data.error));
        }
      };

      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_FETCH_TIMEOUT',
        request: {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries())
        },
        timeout: timeout
      }, [messageChannel.port2]);
    });
  }

  printResults() {
    console.log('\n=== SERVICE WORKER TEST RESULTS ===');
    Object.entries(this.results).forEach(([test, passed]) => {
      const status = passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}: ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    });

    const allPassed = Object.values(this.results).every(result => result);
    if (allPassed) {
      console.log('\n🎉 All tests passed! Service workers are working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Service worker functionality may be impaired.');
    }
  }
}

// Add message handler to service worker for testing
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'TEST_FETCH_TIMEOUT') {
      // This would need to be implemented in the service worker
      // For now, we'll just test the basic functionality
    }
  });
}

// Run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
  const testButton = document.createElement('button');
  testButton.textContent = 'Run Service Worker Tests';
  testButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 10000;
  `;

  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    testButton.textContent = 'Running Tests...';

    const tester = new ServiceWorkerTest();
    await tester.runTests();

    testButton.textContent = 'Tests Complete';
    setTimeout(() => {
      testButton.textContent = 'Run Service Worker Tests';
      testButton.disabled = false;
    }, 2000);
  });

  document.body.appendChild(testButton);
});