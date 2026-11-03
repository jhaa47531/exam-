import React, { useState } from 'react';
import { Settings, ShieldCheck, Lock, Bell, Save, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [fullscreenStrictness, setFullscreenStrictness] = useState('enforce');
  const [autoGracePeriod, setAutoGracePeriod] = useState(15);
  const [defaultHoldTime, setDefaultHoldTime] = useState(60);
  const [allowInstantPublish, setAllowInstantPublish] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Proctoring & System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global examination rules, anti-cheating thresholds, and timing parameters</p>
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully and applied to active examination sessions.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Anti-Cheating Policy Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fullscreen Enforcement Mode
              </label>
              <select
                value={fullscreenStrictness}
                onChange={(e) => setFullscreenStrictness(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
              >
                <option value="enforce">Strict: Log infraction on exit and prompt immediate re-entry</option>
                <option value="advisory">Advisory: Track telemetry without screen obstruction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Proctor Remote Hold Duration
              </label>
              <select
                value={defaultHoldTime}
                onChange={(e) => setDefaultHoldTime(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
              >
                <option value={30}>30 Seconds</option>
                <option value={60}>1 Minute (Standard)</option>
                <option value={300}>5 Minutes</option>
                <option value={600}>10 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Network Transit Grace Period (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={autoGracePeriod}
                onChange={(e) => setAutoGracePeriod(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Additional grace window allowed for autosaved answers in case of packet latency on expiry.
              </span>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="instantPublishToggle"
                checked={allowInstantPublish}
                onChange={(e) => setAllowInstantPublish(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="instantPublishToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Allow automatic scorecard publishing for fully objective (MCQ/TF) examinations
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
