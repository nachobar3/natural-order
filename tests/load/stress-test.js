/**
 * k6 Load Test Script for Natural Order
 *
 * Usage:
 *   k6 run tests/load/stress-test.js
 *
 * With environment variables:
 *   k6 run -e BASE_URL=https://natural-order.vercel.app tests/load/stress-test.js
 *
 * Install k6:
 *   - macOS: brew install k6
 *   - Linux: sudo apt-get install k6
 *   - Windows: choco install k6
 *   - Or download from: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const apiResponseTime = new Trend('api_response_time')

// Test configuration
export const options = {
  // Define test stages
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Hold at 100 users (main test)
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],

  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failures
    errors: ['rate<0.05'],              // Custom error rate below 5%
  },
}

// Base URL (can be overridden with environment variable)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Test data
const cardSearchQueries = [
  'lightning bolt',
  'counterspell',
  'sol ring',
  'brainstorm',
  'fatal push',
  'thoughtseize',
  'path to exile',
  'swords to plowshares',
  'dark ritual',
  'force of will',
]

/**
 * Main test function
 * Each virtual user runs this function in a loop
 */
export default function () {
  // Scenario 1: Public card search (most common)
  testCardSearch()

  // Scenario 2: Homepage/Landing
  testHomepage()

  // Sleep between iterations (simulates user think time)
  sleep(Math.random() * 2 + 1) // 1-3 seconds
}

/**
 * Test card search endpoint (public, high traffic)
 */
function testCardSearch() {
  const query = cardSearchQueries[Math.floor(Math.random() * cardSearchQueries.length)]

  const startTime = new Date()
  const response = http.get(`${BASE_URL}/api/cards/search?q=${encodeURIComponent(query)}`)
  const duration = new Date() - startTime

  apiResponseTime.add(duration)

  const success = check(response, {
    'search: status is 200': (r) => r.status === 200,
    'search: response is JSON': (r) => {
      try {
        JSON.parse(r.body)
        return true
      } catch {
        return false
      }
    },
    'search: response time < 500ms': (r) => r.timings.duration < 500,
  })

  errorRate.add(!success)
}

/**
 * Test homepage (landing page for non-authenticated users)
 */
function testHomepage() {
  const response = http.get(`${BASE_URL}/`)

  const success = check(response, {
    'homepage: status is 200 or redirect': (r) => r.status === 200 || r.status === 307,
    'homepage: response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  errorRate.add(!success)
}

/**
 * Test card printings endpoint (public, cached)
 */
function testCardPrintings() {
  // Use a common card name
  const response = http.get(`${BASE_URL}/api/cards/printings?name=lightning+bolt`)

  const success = check(response, {
    'printings: status is 200': (r) => r.status === 200,
    'printings: response time < 500ms': (r) => r.timings.duration < 500,
  })

  errorRate.add(!success)
}

/**
 * Smoke test - quick sanity check
 * Run with: k6 run --duration 10s --vus 1 tests/load/stress-test.js
 */
export function smokeTest() {
  testHomepage()
  testCardSearch()
  testCardPrintings()
}

/**
 * Spike test - sudden traffic surge
 * Run with: k6 run --config tests/load/spike-config.json tests/load/stress-test.js
 */
export const spikeOptions = {
  stages: [
    { duration: '10s', target: 10 },   // Baseline
    { duration: '10s', target: 200 },  // Spike!
    { duration: '30s', target: 200 },  // Hold
    { duration: '10s', target: 10 },   // Recovery
    { duration: '30s', target: 10 },   // Monitor recovery
  ],
}

/**
 * Summary handler - runs at the end of the test
 */
export function handleSummary(data) {
  return {
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  }
}

/**
 * Generate text summary
 */
function textSummary(data) {
  const metrics = data.metrics

  return `
============================================
  Natural Order Load Test Summary
============================================

Requests:
  Total:     ${metrics.http_reqs?.values?.count || 0}
  Rate:      ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s
  Failed:    ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%

Response Times:
  Average:   ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
  p(50):     ${(metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms
  p(90):     ${(metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms
  p(95):     ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
  Max:       ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms

Custom Metrics:
  Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
  API p(95):  ${(metrics.api_response_time?.values?.['p(95)'] || 0).toFixed(2)}ms

============================================
`
}
