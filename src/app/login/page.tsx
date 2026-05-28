"use client";

import React, { useState } from 'react';
import { LogIn, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      
      // OAuth redirect will happen automatically
    } catch (err: any) {
      console.error(err);
      setError('Failed to sign in with Google. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#111111] p-10 rounded-[32px] shadow-2xl border border-gray-800/40 text-center relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent blur-sm" />
        
        <div className="bg-emerald-500/10 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
          <LogIn className="text-emerald-400" size={38} />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={16} className="text-amber-400" />
          <h1 className="text-3xl font-black tracking-tighter text-white">TimberFlow</h1>
        </div>
        
        <p className="text-gray-500 text-sm mb-10 font-medium">Professional Cloud Architecture v2.0</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest mb-6">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black rounded-2xl py-5 font-black text-sm flex justify-center items-center gap-4 hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"></path>
          </svg>
          {loading ? 'OPENING GATEWAY...' : 'SIGN IN WITH GOOGLE'}
        </button>
        
        <p className="mt-8 text-gray-700 text-[10px] font-black uppercase tracking-[0.2em]">
          Secured by Supabase Cloud
        </p>
      </div>
    </div>
  );
}
