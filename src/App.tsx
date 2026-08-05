/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';

type Entry = {
  _id: string;
  name: string;
  salary: number;
  amount: number;
  createdAt: string;
};

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/entries');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      console.error("Failed to fetch entries", err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !salary || !amount || Number(salary) <= 0 || Number(amount) <= 0) {
      setError('Please fill in all fields with positive values');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, salary: Number(salary), amount: Number(amount) }),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      setName('');
      setSalary('');
      setAmount('');
      await fetchEntries();
    } catch (err) {
      setError('Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Data Entry Form</h1>
      
      <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-hidden" 
            required 
          />
          <input 
            type="number" 
            placeholder="Salary" 
            value={salary} 
            onChange={e => setSalary(e.target.value)} 
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-hidden" 
            required 
          />
          <input 
            type="number" 
            placeholder="Amount" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-hidden" 
            required 
          />
        </div>
        {error && <p className="text-red-500 mb-4 text-sm font-medium">{error}</p>}
        <button 
          type="submit" 
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Submit'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border font-semibold text-sm">Name</th>
              <th className="p-3 border font-semibold text-sm">Salary</th>
              <th className="p-3 border font-semibold text-sm">Amount</th>
              <th className="p-3 border font-semibold text-sm">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Loading entries...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 italic">No entries yet</td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border text-sm">{entry.name}</td>
                  <td className="p-3 border text-sm font-mono">${entry.salary.toLocaleString()}</td>
                  <td className="p-3 border text-sm font-mono">${entry.amount.toLocaleString()}</td>
                  <td className="p-3 border text-sm text-gray-600">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
