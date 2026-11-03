-- ====================================================================
-- EXAMPRO ROW LEVEL SECURITY (RLS) & STORAGE POLICIES
-- Version: 001_rls_policies.sql
-- Description: Security policies enforcing role-based access control (Admin & Student)
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (SECURITY DEFINER to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (LOWER(role) = 'admin')
  );
END;
$$;

-- Explicit GRANT permissions (Required by PostgreSQL before RLS evaluation)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Full permissions for backend service_role operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Authenticated users receive standard CRUD privileges, governed strictly by RLS policies below
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anon users receive read-only access to public course/semester catalog (never to profiles or exams)
GRANT SELECT ON public.courses, public.semesters TO anon;

-- 2. Profiles Policies (Strict Student Privacy & Role-Based Authorization)
-- Admins can view all profile records
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Students can view only their own personal profile record
CREATE POLICY "Students can view only their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Students can update only their own profile and cannot escalate role
CREATE POLICY "Students can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND LOWER(role) = 'student');

-- Admins have full access to manage all profile records
CREATE POLICY "Admins have full access to manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Initial profile creation during student registration
CREATE POLICY "Users can insert their own student profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND LOWER(role) = 'student');

-- 3. Courses & Semesters Policies
CREATE POLICY "Anyone can view active courses"
ON public.courses FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full control over courses"
ON public.courses FOR ALL
TO authenticated
USING (public.is_admin());

CREATE POLICY "Anyone can view active semesters"
ON public.semesters FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full control over semesters"
ON public.semesters FOR ALL
TO authenticated
USING (public.is_admin());

-- 4. Verifications Policies
CREATE POLICY "Students can view their own verification"
ON public.student_verifications FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can insert their initial verification"
ON public.student_verifications FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can resubmit pending or rejected verification"
ON public.student_verifications FOR UPDATE
TO authenticated
USING (student_id = auth.uid() AND status IN ('pending', 'rejected'))
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can review and update verifications"
ON public.student_verifications FOR ALL
TO authenticated
USING (public.is_admin());

-- 5. Exams Policies
CREATE POLICY "Students can view published exams assigned to them"
ON public.exams FOR SELECT
TO authenticated
USING (
  public.is_admin() OR (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM public.exam_assignments
      WHERE exam_assignments.exam_id = exams.id
      AND exam_assignments.student_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins have full control of exams"
ON public.exams FOR ALL
TO authenticated
USING (public.is_admin());

-- 6. Questions & Options Policies (CRITICAL: students never see correct answers)
CREATE POLICY "Students can view questions for an active attempt"
ON public.questions FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.exam_id = questions.exam_id
    AND exam_attempts.student_id = auth.uid()
    AND exam_attempts.status IN ('in_progress', 'held')
  )
);

CREATE POLICY "Admins have full control of questions"
ON public.questions FOR ALL
TO authenticated
USING (public.is_admin());

-- Question Options: Students see options but is_correct must NOT be exposed
CREATE POLICY "Students can view options for their active attempt questions"
ON public.question_options FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.questions
    JOIN public.exam_attempts ON exam_attempts.exam_id = questions.exam_id
    WHERE questions.id = question_options.question_id
    AND exam_attempts.student_id = auth.uid()
  )
);

CREATE POLICY "Admins have full control of question options"
ON public.question_options FOR ALL
TO authenticated
USING (public.is_admin());

-- 7. Exam Attempts Policies
CREATE POLICY "Students can read their own attempts"
ON public.exam_attempts FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can start an assigned attempt"
ON public.exam_attempts FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own in-progress attempt"
ON public.exam_attempts FOR UPDATE
TO authenticated
USING (student_id = auth.uid() AND status = 'in_progress')
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins have full access to attempts"
ON public.exam_attempts FOR ALL
TO authenticated
USING (public.is_admin());

-- 8. Answers Policies
CREATE POLICY "Students can read and write answers to their own attempt"
ON public.answers FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = answers.attempt_id
    AND exam_attempts.student_id = auth.uid()
  )
);

CREATE POLICY "Students can submit/update answers for active attempt"
ON public.answers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = answers.attempt_id
    AND exam_attempts.student_id = auth.uid()
    AND exam_attempts.status = 'in_progress'
  )
);

-- 9. Results Policies (Students can only view published results)
CREATE POLICY "Students can view only published results"
ON public.results FOR SELECT
TO authenticated
USING (
  (student_id = auth.uid() AND status = 'published') OR
  public.is_admin()
);

CREATE POLICY "Admins manage all results"
ON public.results FOR ALL
TO authenticated
USING (public.is_admin());

-- 10. Security Events & Monitoring
CREATE POLICY "Students can insert security events for their own attempt"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins view all security events"
ON public.security_events FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete security events"
ON public.security_events FOR DELETE
TO authenticated
USING (public.is_admin());

-- 11. Student Enrollments Policies
CREATE POLICY "Admins have full access to student enrollments"
ON public.student_enrollments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Students can view their own enrollment"
ON public.student_enrollments FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

-- 12. Verification Logs Policies
CREATE POLICY "Admins have full access to verification logs"
ON public.verification_logs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Students can view their verification logs"
ON public.verification_logs FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

-- 13. Exam Assignments Policies
CREATE POLICY "Admins have full access to exam assignments"
ON public.exam_assignments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Students can view their own exam assignments"
ON public.exam_assignments FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

-- 14. Admin Actions & Holds Policies
CREATE POLICY "Admins have full access to admin actions"
ON public.admin_actions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full access to exam holds"
ON public.exam_holds FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 15. Notifications Policies (Admins can delete, Users can view and delete their own)
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins have full access to notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 16. Activity Logs Policies
CREATE POLICY "Admins have full access to activity logs"
ON public.activity_logs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 17. Storage Policies for Private College ID Bucket ('college-id-cards')
CREATE POLICY "Students upload their own ID card"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'college-id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students view their own uploaded ID card"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'college-id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view any college ID card"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'college-id-cards' AND
  public.is_admin()
);

