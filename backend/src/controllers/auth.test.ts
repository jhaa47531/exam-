import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app';
import { dataStore, testDatabaseConnection } from '../config/supabase';

test('Database Connection Check: correctly reports disconnected when Supabase URL is not set', async () => {
  const result = await testDatabaseConnection();
  assert.equal(result.connected, false);
  assert.match(result.message, /Database is disconnected/i);
});

test('Auth System: Admin login strictly permits admin role and rejects invalid credentials', async () => {
  const app = createApp();

  // Create mock request to /api/auth/admin/login with invalid password
  const resInvalid = await fetch('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@exampro.edu', password: 'WrongPassword' }),
  });
  assert.equal(resInvalid.status, 401);

  // Valid admin login
  const resValid = await fetch('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@exampro.edu', password: 'Admin@1234' }),
  });
  assert.equal(resValid.status, 200);
  const data = await resValid.json();
  assert.equal(data.user.role, 'admin');
  assert.ok(data.token);
});

test('Role Security: Admin credentials are strictly blocked from student login portal', async () => {
  const res = await fetch('http://localhost:3000/api/auth/student/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@exampro.edu', password: 'Admin@1234' }),
  });
  // Must return 403 Forbidden
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.code, 'STUDENT_ACCESS_REQUIRED');
});

test('Role Security: Student registered account is strictly blocked from admin login portal', async () => {
  // Register a legitimate student
  const studentEmail = `student-${Date.now()}@college.edu`;
  const studentPassword = 'SecureStudentPass@123';
  const collegeId = `CS-REG-${Date.now()}`;

  const regRes = await fetch('http://localhost:3000/api/students/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Test Candidate',
      email: studentEmail,
      password: studentPassword,
      college_student_id: collegeId,
      enrollment_number: `ENR-${Date.now()}`,
      course_id: 'course-bca',
      semester_id: 'sem-3',
      id_card_image_url: 'data:image/png;base64,sample',
    }),
  });
  assert.equal(regRes.status, 201);

  // Now attempt to sign in to Admin Portal with this student account
  const adminLoginAttempt = await fetch('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: studentEmail, password: studentPassword }),
  });
  assert.equal(adminLoginAttempt.status, 403);
  const adminData = await adminLoginAttempt.json();
  assert.equal(adminData.code, 'ADMIN_ACCESS_REQUIRED');

  // Student can successfully log in through Student Login portal using College Student ID!
  const studentLoginSuccess = await fetch('http://localhost:3000/api/auth/student/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: collegeId, password: studentPassword }),
  });
  assert.equal(studentLoginSuccess.status, 200);
  const studentData = await studentLoginSuccess.json();
  assert.equal(studentData.user.role, 'student');
  assert.equal(studentData.user.email, studentEmail);
});

test('Route Protection: Unauthenticated requests to protected endpoints return 401 Unauthorized', async () => {
  const res = await fetch('http://localhost:3000/api/admin/dashboard');
  assert.equal(res.status, 401);

  const resStudent = await fetch('http://localhost:3000/api/students/exams');
  assert.equal(resStudent.status, 401);
});
