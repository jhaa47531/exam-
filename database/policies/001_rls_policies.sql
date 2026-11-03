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

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin());

-- 3. Courses & Semesters Policies
CREATE POLICY "Anyone authenticated can view active courses and semesters"
ON public.courses FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full control over courses"
ON public.courses FOR ALL
TO authenticated
USING (public.is_admin());

CREATE POLICY "Anyone authenticated can view active semesters"
ON public.semesters FOR SELECT
TO authenticated
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

-- 11. Storage Policies for Private College ID Bucket ('college-id-cards')
-- Bucket is private:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('college-id-cards', 'college-id-cards', false) ON CONFLICT DO NOTHING;

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
