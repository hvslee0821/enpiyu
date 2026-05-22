'use client';

import { useState } from 'react';

export default function SecretCodePage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [count, setCount] = useState(1);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCodes([]);
    setLoading(true);
    try {
      const res = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret, count: Math.min(50, Math.max(1, count)) }),
      });
      let data: { error?: string; codes?: string[] };
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? 'Invalid response' : `Error ${res.status}`);
        return;
      }
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }
      setCodes(data.codes || []);
      setAdminSecret('');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Generate codes</h1>
        <p className="text-sm text-gray-500 mb-4">
          Enter admin secret and number of codes. Codes will be created with status &quot;active&quot;.
        </p>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin secret</label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CODE_ADMIN_SECRET"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of codes (1–50)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate codes'}
          </button>
        </form>
        {codes.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Generated codes (active):</p>
            <ul className="font-mono text-sm space-y-1 break-all">
              {codes.map((c) => (
                <li key={c} className="tracking-widest">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
