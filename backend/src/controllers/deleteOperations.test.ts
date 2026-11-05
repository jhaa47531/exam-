import dotenv from 'dotenv';
dotenv.config();
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app';
import { dataStore } from '../config/supabase';
import http from 'http';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('System-wide Delete Operations & Access Control Suite', async (t) => {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  t.after(() => {
    server.close();
  });

  const adminToken = 'token-admin-system-01';
  const studentToken = 'token-student-alex-01';

  await t.test('1. Security: Student token cannot perform delete operations on admin endpoints', async () => {
    const res = await makeRequest(server, 'DELETE', '/api/admin/courses/course-bca', studentToken);
    assert.strictEqual(res.status, 403, 'Unauthorized student request must be rejected with 403');
  });

  await t.test('2. Faculty Management: create and delete faculty', async () => {
    const createRes = await makeRequest(server, 'POST', '/api/admin/faculty', adminToken, {
      full_name: 'Dr. Test Professor',
      email: 'test.prof@university.edu',
      department: 'Computer Science',
      designation: 'Associate Professor',
    });
    assert.strictEqual(createRes.status, 201);
    const facultyId = createRes.body.faculty.id;

    // Delete faculty
    const delRes = await makeRequest(server, 'DELETE', `/api/admin/faculty/${facultyId}`, adminToken);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });

  await t.test('3. Faculty Management: admin cannot delete their own active account', async () => {
    const res = await makeRequest(server, 'DELETE', '/api/admin/faculty/admin-system-01', adminToken);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Cannot delete your own active administrator account/);
  });

  await t.test('4. Subject Management: create, dependency check, and deletion', async () => {
    const createRes = await makeRequest(server, 'POST', '/api/admin/subjects', adminToken, {
      code: 'TEST-999',
      name: 'Testing Subject',
      description: 'Automated test subject',
    });
    assert.strictEqual(createRes.status, 201);
    const subjectId = createRes.body.subject.id;

    // Delete subject
    const delRes = await makeRequest(server, 'DELETE', `/api/admin/subjects/${subjectId}`, adminToken);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });

  await t.test('5. Semester Management: create and delete semester', async () => {
    const createRes = await makeRequest(server, 'POST', '/api/admin/semesters', adminToken, {
      course_id: 'course-bca',
      semester_number: 11,
      name: 'Semester XI (Testing)',
    });
    assert.strictEqual(createRes.status, 201);
    const semId = createRes.body.semester.id;

    const delRes = await makeRequest(server, 'DELETE', `/api/admin/semesters/${semId}`, adminToken);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });

  await t.test('6. Course Management: delete unreferenced course, and archive when students enrolled', async () => {
    const createRes = await makeRequest(server, 'POST', '/api/admin/courses', adminToken, {
      code: 'NEW-PROG',
      name: 'New Test Program',
      description: 'Program for delete tests',
    });
    assert.strictEqual(createRes.status, 201);
    const courseId = createRes.body.course.id;

    // Delete unreferenced course permanently
    const delRes = await makeRequest(server, 'DELETE', `/api/admin/courses/${courseId}`, adminToken);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    // Existing course 'course-bca' has enrolled students -> permanent delete blocked without archive
    const blockRes = await makeRequest(server, 'DELETE', '/api/admin/courses/course-bca', adminToken);
    assert.strictEqual(blockRes.status, 400);
    assert.strictEqual(blockRes.body.code, 'ENROLLED_STUDENTS_EXIST');

    // Archive course 'course-bca' succeeds
    const archRes = await makeRequest(server, 'DELETE', '/api/admin/courses/course-bca?archive=true', adminToken);
    assert.strictEqual(archRes.status, 200);
    assert.strictEqual(archRes.body.archived, true);
  });

  await t.test('7. Exam Management: delete unattempted exam and archive attempted exam', async () => {
    // 1. Create an unattempted exam and test permanent deletion
    const createRes = await makeRequest(server, 'POST', '/api/admin/exams', adminToken, {
      title: 'Unattempted Test Exam',
      subject: 'Algorithms',
      course_id: 'course-bca',
      semester_id: 'sem-bca-1',
      exam_date: '2026-12-01',
      start_time: '2026-12-01T10:00:00Z',
      end_time: '2026-12-01T12:00:00Z',
      duration_minutes: 60,
    });
    assert.strictEqual(createRes.status, 201);
    const examId = createRes.body.exam.id;

    // Add question
    const qRes = await makeRequest(server, 'POST', '/api/admin/questions', adminToken, {
      exam_id: examId,
      question_text: 'What is O(1)?',
      question_type: 'mcq',
      marks: 5,
      options: [
        { option_text: 'Constant Time', is_correct: true },
        { option_text: 'Linear Time', is_correct: false },
      ],
    });
    assert.strictEqual(qRes.status, 201);
    const questionId = qRes.body.question.id;

    // Delete question
    const delQRes = await makeRequest(server, 'DELETE', `/api/admin/questions/${questionId}`, adminToken);
    assert.strictEqual(delQRes.status, 200);
    assert.strictEqual(delQRes.body.success, true);

    // Delete unattempted exam permanently
    const delExamRes = await makeRequest(server, 'DELETE', `/api/admin/exams/${examId}`, adminToken);
    assert.strictEqual(delExamRes.status, 200);
    assert.strictEqual(delExamRes.body.success, true);

    // 2. Now attach an attempt to 'exam-dsa-01' to test academic protection
    dataStore.examAttempts.push({
      id: 'attempt-test-01',
      exam_id: 'exam-dsa-01',
      student_id: 'student-alex-01',
      start_time: new Date().toISOString(),
      scheduled_end_time: new Date(Date.now() + 3600000).toISOString(),
      status: 'in_progress',
      warning_count: 0,
      tab_switch_count: 0,
      fullscreen_exit_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Permanent delete must now be blocked
    const blockExamRes = await makeRequest(server, 'DELETE', '/api/admin/exams/exam-dsa-01', adminToken);
    assert.strictEqual(blockExamRes.status, 400);
    assert.strictEqual(blockExamRes.body.code, 'ATTEMPTS_EXIST');

    // Archive attempted exam succeeds
    const archExamRes = await makeRequest(server, 'DELETE', '/api/admin/exams/exam-dsa-01?archive=true', adminToken);
    assert.strictEqual(archExamRes.status, 200);
    assert.strictEqual(archExamRes.body.archived, true);
  });

  await t.test('8. Student Management: archive candidate with academic history and delete new candidate', async () => {
    // 1. Candidate 'student-alex-01' has an attempt from test 7 -> permanent delete blocked
    const blockStRes = await makeRequest(server, 'DELETE', '/api/admin/students/student-alex-01', adminToken);
    assert.strictEqual(blockStRes.status, 400);
    assert.strictEqual(blockStRes.body.code, 'ACADEMIC_HISTORY_EXISTS');

    // Archive candidate preserves history
    const archStRes = await makeRequest(server, 'DELETE', '/api/admin/students/student-alex-01?archive=true', adminToken);
    assert.strictEqual(archStRes.status, 200);
    assert.strictEqual(archStRes.body.archived, true);

    // 2. Register new student candidate without attempts
    const regRes = await makeRequest(server, 'POST', '/api/students/register', undefined, {
      full_name: 'Test Temporary Student',
      email: 'temp.student@test.edu',
      password: 'Password123!',
      college_student_id: 'TEMP-99',
      enrollment_number: 'ENR-99',
      course_id: 'course-bca',
      semester_id: 'sem-bca-1',
    });
    assert.strictEqual(regRes.status, 201);
    const newStudentId = regRes.body.user.id;

    // Delete unattempted student permanently
    const delStRes = await makeRequest(server, 'DELETE', `/api/admin/students/${newStudentId}`, adminToken);
    assert.strictEqual(delStRes.status, 200);
    assert.strictEqual(delStRes.body.success, true);
  });

  await t.test('9. Notifications & Activity Logs Deletion', async () => {
    // Student deletes own notification
    dataStore.notifications.push({
      id: 'test-notif-1',
      user_id: 'student-alex-01',
      title: 'Test Notification',
      message: 'Test notification content',
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    const delNotifRes = await makeRequest(server, 'DELETE', '/api/students/notifications/test-notif-1', studentToken);
    assert.strictEqual(delNotifRes.status, 200);

    // Admin deletes activity log
    dataStore.activityLogs.push({
      id: 'test-log-1',
      action: 'TEST_ACTION',
      resource: 'test-resource',
      details: {},
      created_at: new Date().toISOString(),
    });

    const delLogRes = await makeRequest(server, 'DELETE', '/api/admin/activity-logs/test-log-1', adminToken);
    assert.strictEqual(delLogRes.status, 200);

    // Admin clears all logs
    const clearLogsRes = await makeRequest(server, 'DELETE', '/api/admin/activity-logs', adminToken);
    assert.strictEqual(clearLogsRes.status, 200);
  });
});
