# ExamPro Database Architecture & Supabase Setup Guide

This folder contains the complete SQL migrations and Row Level Security (RLS) policies for **ExamPro – Online Examination System**.

## Tables Overview
1. `profiles` - Student and Admin user records linked to Supabase Auth `auth.users`.
2. `courses` - Academic courses (BCA, MCA, BBA, BTech, etc.).
3. `semesters` - Course-specific semesters (1 through 8+).
4. `student_enrollments` - Student link to course and semester.
5. `student_verifications` - College ID verification requests with uploaded card paths and approval states.
6. `verification_logs` - Audit history for submissions, resubmissions, approvals, and rejections.
7. `exams` - Central exam configuration: timings, duration, rules, negative marking, release policies.
8. `exam_assignments` - Student-exam eligibility and assignment mappings.
9. `questions` - MCQ, True/False, and Written questions with marks.
10. `question_options` - Options for MCQs and True/False with `is_correct` (hidden from students).
11. `exam_attempts` - Active student sessions with start time, server end time, warnings, holds, termination.
12. `answers` - Autosaved student answers and evaluation marks.
13. `results` - Compiled scorecards, percentages, pass/fail status, and publication status.
14. `security_events` - Tab switches, fullscreen exits, window blurs, and suspicious client events.
15. `admin_actions` - Audit log for proctor actions (Warning, Hold, Resume, Terminate, Grade, Publish).
16. `exam_holds` - Temporary proctor hold timers with lockouts and automatic resumption.
17. `notifications` - User alert inbox for status changes, warnings, and result announcements.
18. `activity_logs` - System-wide audit trail.

## Storage Bucket
- Bucket Name: `college-id-cards`
- Public: `false` (Private bucket)
- Access: Only accessible by the student who uploaded the file, or Admins via short-lived signed URLs.

## Applying Migrations in Supabase
1. Open your Supabase Project Dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Run `database/migrations/001_initial_schema.sql`.
4. Run `database/policies/001_rls_policies.sql`.
5. In **Storage**, create a private bucket named `college-id-cards`.
