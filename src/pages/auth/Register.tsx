import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Course, Semester } from '../../types';
import {
  GraduationCap,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeStudentId, setCollegeStudentId] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [idCardPreview, setIdCardPreview] = useState<string>('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.admin.getCourses().then((res) => {
      setCourses(res.courses || []);
      if (res.courses && res.courses.length > 0) {
        setCourseId(res.courses[0].id);
      }
    }).catch(() => {
      setCourses([
        { id: 'course-bca-01', code: 'BCA', name: 'Bachelor of Computer Applications', is_active: true },
        { id: 'course-mca-02', code: 'MCA', name: 'Master of Computer Applications', is_active: true },
        { id: 'course-bba-03', code: 'BBA', name: 'Bachelor of Business Administration', is_active: true },
      ]);
      setCourseId('course-bca-01');
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    api.admin.getSemesters(courseId).then((res) => {
      setSemesters(res.semesters || []);
      if (res.semesters && res.semesters.length > 0) {
        setSemesterId(res.semesters[0].id);
      }
    }).catch(() => {
      setSemesters([
        { id: 'sem-bca-3', course_id: courseId, semester_number: 3, name: 'Semester III', is_active: true },
      ]);
      setSemesterId('sem-bca-3');
    });
  }, [courseId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdCardPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUseDemoSampleID = () => {
    setIdCardPreview('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800');
    setCollegeStudentId('CS-2026-9140');
    setEnrollmentNumber('ENR-BCA-2024-098');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId || !semesterId) {
      setError('Please select both Course and Semester');
      return;
    }

    if (!idCardPreview) {
      setError('Please upload a clear photograph of your College ID Card');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        phone,
        college_student_id: collegeStudentId,
        enrollment_number: enrollmentNumber,
        course_id: courseId,
        semester_id: semesterId,
        id_card_image_url: idCardPreview,
      });

      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40">
      <div className="mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Student Registration & ID Verification
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Enforce college credential verification before entering the examination system
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              College Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Create Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Mobile Contact
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555-019-2834"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        {/* Academic Details */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
            Academic Enrollment
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Course Program *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3 py-2 text-sm text-slate-900 transition"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Current Semester *
              </label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3 py-2 text-sm text-slate-900 transition"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Semester {s.semester_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                College Student ID *
              </label>
              <input
                type="text"
                required
                value={collegeStudentId}
                onChange={(e) => setCollegeStudentId(e.target.value)}
                placeholder="e.g. CS-2026-9022"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                University Enrollment No *
              </label>
              <input
                type="text"
                required
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. ENR-BCA-2024-082"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Private College ID Card Upload */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              College ID Card Document
            </p>
            <button
              type="button"
              onClick={handleUseDemoSampleID}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              Attach Sample ID Card
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300">
            {idCardPreview ? (
              <div className="relative group shrink-0">
                <img
                  src={idCardPreview}
                  alt="College ID Preview"
                  className="w-32 h-20 object-cover rounded-xl border border-slate-200 shadow-xs"
                />
                <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                  Attached
                </span>
              </div>
            ) : (
              <div className="w-32 h-20 bg-white rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                <span className="text-[10px]">No File</span>
              </div>
            )}

            <div className="flex-1 text-center sm:text-left">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload ID Card Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                Upload a clear image showing your photo, college roll number, and valid term.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Note */}
        <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Upon submission, your account is queued as <strong>PENDING VERIFICATION</strong>. The Controller of Examinations verifies your physical ID card credentials before unlocking examination modules.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Submit Registration for ID Verification</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link to="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
          Sign In here &rarr;
        </Link>
      </div>
    </div>
  );
};
