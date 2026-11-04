import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000';

let adminToken: string;
let studentToken: string;

before(async () => {
  // Ensure database simulation is reset before tests
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });

  // Authenticate Admin
  const adminRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@exampro.edu',
      password: 'Admin@1234',
    }),
  });
  assert.equal(adminRes.status, 200, 'Admin login should succeed');
  const adminData = await adminRes.json();
  adminToken = adminData.token;

  // Register & authenticate Student
  const studentEmail = `student-${Date.now()}@college.edu`;
  const studentPassword = 'SecurePass@123';
  const collegeId = `CS-STU-${Date.now()}`;

  await fetch(`${baseUrl}/api/students/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Test Student',
      email: studentEmail,
      password: studentPassword,
      college_student_id: collegeId,
      enrollment_number: `ENR-${Date.now()}`,
      course_id: 'course-bca',
      semester_id: 'sem-3',
      id_card_image_url: 'data:image/png;base64,sample',
    }),
  });

  const studentRes = await fetch(`${baseUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: collegeId,
      password: studentPassword,
    }),
  });
  assert.equal(studentRes.status, 200, 'Student login should succeed');
  const studentData = await studentRes.json();
  studentToken = studentData.token;
});

after(async () => {
  // Always restore connection state
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });
});

test('Scenario 1: Database connected - GET /api/health/database returns 200 with real connectivity and latency', async () => {
  const res = await fetch(`${baseUrl}/api/health/database`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.connected, true);
  assert.equal(data.status, 'connected');
  assert.equal(data.message, 'Database connected successfully');
  assert.ok(typeof data.timestamp === 'string');
  assert.ok(typeof data.latencyMs === 'number');

  // Verify Security: NEVER expose credentials, tokens or connection strings
  const str = JSON.stringify(data);
  assert.ok(!str.includes('service_role'));
  assert.ok(!str.includes('secret'));
  assert.ok(!str.includes('postgres://'));
  assert.ok(!str.includes('supabase.co'));
});

test('Scenario 2: Database unavailable - returns 503 and safe standardized message', async () => {
  // Use simulated disconnect query parameter
  const res = await fetch(`${baseUrl}/api/health/database?simulate_disconnect=true`);
  assert.equal(res.status, 503);

  const data = await res.json();
  assert.equal(data.connected, false);
  assert.equal(data.status, 'disconnected');
  assert.equal(data.message, 'We are unable to connect to the database. Please try again later.');
});

test('Scenario 3: Global outage simulation and restoration', async () => {
  // 1. Trigger outage
  const disconnectRes = await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: true }),
  });
  const disconnectData = await disconnectRes.json();
  assert.equal(disconnectData.simulatedOutage, true);

  // 2. Health check reports 503 disconnected
  const healthDuringOutage = await fetch(`${baseUrl}/api/health/database`);
  assert.equal(healthDuringOutage.status, 503);
  const healthData = await healthDuringOutage.json();
  assert.equal(healthData.connected, false);

  // 3. Restore connection
  const restoreRes = await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });
  const restoreData = await restoreRes.json();
  assert.equal(restoreData.simulatedOutage, false);

  // 4. Health check reports 200 connected
  const healthAfterRestore = await fetch(`${baseUrl}/api/health/database`);
  assert.equal(healthAfterRestore.status, 200);
  const restoreHealthData = await healthAfterRestore.json();
  assert.equal(restoreHealthData.connected, true);
});

test('Scenario 4 & 8: Mutating operations (create, update, delete) are strictly disabled during disconnection', async () => {
  // Disconnect database
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: true }),
  });

  // Attempt Create (POST)
  const createRes = await fetch(`${baseUrl}/api/admin/exams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ title: 'Test Scheduled Exam' }),
  });
  assert.equal(createRes.status, 503, 'Create must return 503 during outage');
  const createData = await createRes.json();
  assert.equal(createData.code, 'DATABASE_UNAVAILABLE');
  assert.equal(createData.connected, false);

  // Attempt Delete (DELETE)
  const deleteRes = await fetch(`${baseUrl}/api/admin/exams/sample-id-123`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(deleteRes.status, 503, 'Delete must return 503 during outage');
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.code, 'DATABASE_UNAVAILABLE');

  // Attempt Update (PUT)
  const updateRes = await fetch(`${baseUrl}/api/admin/courses/sample-id-123`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: 'Updated Course Name' }),
  });
  assert.equal(updateRes.status, 503, 'Update must return 503 during outage');

  // Restore connection
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });
});

test('Scenario 5: Security - Authorization failure (403) is NOT confused with database connection failure', async () => {
  // Ensure database is online
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });

  // Student attempts to access admin endpoint
  const unauthorizedRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });

  // Authorization rejection must be 403 Forbidden, NEVER 503 Database Unavailable
  assert.equal(unauthorizedRes.status, 403);
  assert.notEqual(unauthorizedRes.status, 503);
  const data = await unauthorizedRes.json();
  assert.ok(data.error.toLowerCase().includes('admin') || data.code === 'ADMIN_ACCESS_REQUIRED');
});

test('Scenario 6: Admin dashboard query executes successfully when database connected', async () => {
  const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.stats, 'Dashboard should return statistics');
  assert.ok(typeof data.stats.totalStudents === 'number');
});

test('Scenario 7: Session preservation - database downtime does not invalidate user authentication credentials', async () => {
  // Verify token is valid when connected
  const validRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(validRes.status, 200);

  // Database is temporarily disconnected
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: true }),
  });

  // Database is restored
  await fetch(`${baseUrl}/api/health/database/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disconnect: false }),
  });

  // Session token remains completely valid without forcing re-login
  const recheckRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(recheckRes.status, 200);
});
