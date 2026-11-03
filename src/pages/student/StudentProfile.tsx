import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  User,
  ShieldCheck,
  AlertTriangle,
  Clock,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  FileText,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';

export const StudentProfile: React.FC = () => {
  const { user, verification, enrollment, refreshProfile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.student.getVerificationStatus().then((res) => {
      setLogs(res.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Academic Profile</h1>
        <p className="text-xs text-slate-500 mt-1">Official University Enrollment & College ID Verification Records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Personal Info */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-xs space-y-4">
          <div className="relative inline-block">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
              alt={user?.full_name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/20 mx-auto"
            />
            <span className={`absolute bottom-0 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white ${
              verification?.status === 'approved' ? 'bg-emerald-600' : 'bg-amber-500'
            }`}>
              {verification?.status === 'approved' ? '✓' : '!'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.full_name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-left text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{user?.phone || '+1 (555) 345-6789'}</span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Academic & College ID Card Document */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              University Enrollment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">College Student Roll ID</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{verification?.college_student_id || enrollment?.college_student_id}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">University Enrollment No</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{verification?.enrollment_number || enrollment?.enrollment_number}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">Enrolled Course</span>
                <span className="font-bold text-slate-900 text-sm">Bachelor of Computer Applications (BCA)</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">Current Academic Term</span>
                <span className="font-bold text-slate-900 text-sm">Semester III</span>
              </div>
            </div>
          </div>

          {/* Attached Private ID Card Document */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified College ID Card Document
              </h3>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                verification?.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {verification?.status}
              </span>
            </div>

            {verification?.id_card_image_url ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-md bg-slate-100 p-2">
                <img
                  src={verification.id_card_image_url}
                  alt="College ID Card"
                  className="w-full h-48 object-contain rounded-xl shadow-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400">No ID card attached.</p>
            )}

            {/* Audit Logs */}
            {logs.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Verification History Audit</h4>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex justify-between">
                      <div>
                        <strong className="text-slate-900 capitalize">{log.action}: </strong>
                        <span className="text-slate-600">{log.note}</span>
                      </div>
                      <span className="text-slate-400">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
