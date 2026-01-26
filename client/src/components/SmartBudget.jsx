import { useState, useEffect, useCallback } from 'react';
import api from '../services/api'; 
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Simple colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

export default function SmartBudget() {
    const [transactions, setTransactions] = useState([]);
    const [debts, setDebts] = useState({ iOwe: [], owedToMe: [] });
    const [showAddTx, setShowAddTx] = useState(false);
    const [showAddDebt, setShowAddDebt] = useState(false);
    
    // Forms
    const [newTx, setNewTx] = useState({ type: 'expense', amount: '', category: 'Food', description: '' });
    const [newDebt, setNewDebt] = useState({ targetEmail: '', amount: '', description: '', type: 'lent' });

    const fetchData = useCallback(async () => {
        try {
            const [txRes, debtRes] = await Promise.all([
                api.get('/budget/transactions'),
                api.get('/budget/debts')
            ]);
            setTransactions(txRes.data);
            setDebts(debtRes.data); // { iOwe: [], owedToMe: [] }
        } catch (error) {
            console.error("Error fetching budget data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]);

    const handleAddTx = async (e) => {
        e.preventDefault();
        try {
            await api.post('/budget/transactions', newTx);
            setShowAddTx(false);
            fetchData();
        } catch {
            alert("Failed to add transaction");
        }
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        try {
            await api.post('/budget/debts', newDebt);
            setShowAddDebt(false);
            setNewDebt({ targetEmail: '', amount: '', description: '', type: 'lent' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to add debt record");
        }
    };

    const handleSettle = async (id) => {
        if(!window.confirm("Mark as settled?")) return;
        try {
            await api.put(`/budget/debts/${id}/settle`);
            fetchData();
        } catch(e) { console.error(e); }
    };

    // Analytics
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    
    const categoryData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const existing = acc.find(item => item.name === t.category);
            if (existing) {
                existing.value += t.amount;
            } else {
                acc.push({ name: t.category, value: t.amount });
            }
            return acc;
        }, []);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
             <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-800">Smart Budgetor 💰</h2>
                    <p className="text-gray-500">Track expenses, manage debts, and save smart.</p>
                </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 font-medium mb-1">Total Spent (This Month)</h3>
                    <p className="text-3xl font-extrabold text-red-600">₹{totalSpent.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 font-medium mb-1">Total Income</h3>
                    <p className="text-3xl font-extrabold text-green-600">₹{totalIncome.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 font-medium mb-1">Net Balance</h3>
                    <p className={`text-3xl font-extrabold ${totalIncome - totalSpent >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        ₹{(totalIncome - totalSpent).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visuals */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">Spending Breakdown</h3>
                    <div className="h-64">
                         {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${value}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                                No expenses yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <button 
                        onClick={() => setShowAddTx(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <span>➕</span> Add Transaction
                    </button>

                     <button 
                        onClick={() => setShowAddDebt(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <span>🍕</span> Split Bill / Add Debt
                    </button>
                </div>
            </div>

            {/* Transactions & Debts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Recent Transactions</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {transactions.map(t => (
                            <div key={t._id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50">
                                <div>
                                    <p className="font-bold text-gray-800">{t.description || t.category}</p>
                                    <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                                </div>
                                <span className={`font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                                    {t.type === 'expense' ? '-' : '+'}₹{t.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Friends & Debts</h3>
                    
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">They Owe You</h4>
                    {debts.owedToMe.length === 0 && <p className="text-sm text-gray-400 italic mb-4">No one owes you money.</p>}
                    {debts.owedToMe.map(d => (
                        <div key={d._id} className="flex justify-between items-center mb-2 bg-green-50 p-2 rounded">
                            <span className="text-sm font-medium text-gray-700">{d.fromUser?.displayName || "Friend"}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-green-600">₹{d.amount}</span>
                                <button onClick={() => handleSettle(d._id)} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100">Settle</button>
                            </div>
                        </div>
                    ))}

                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 mt-6">You Owe</h4>
                    {debts.iOwe.length === 0 && <p className="text-sm text-gray-400 italic">You are debt free!</p>}
                    {debts.iOwe.map(d => (
                         <div key={d._id} className="flex justify-between items-center mb-2 bg-red-50 p-2 rounded">
                            <span className="text-sm font-medium text-gray-700">{d.toUser?.displayName || "Friend"}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-red-600">₹{d.amount}</span>
                                <button onClick={() => handleSettle(d._id)} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100">Settle</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {showAddTx && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleAddTx} className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Add Transaction</h3>
                        <select className="w-full border p-2 rounded" value={newTx.type} onChange={e=>setNewTx({...newTx, type: e.target.value})}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                        <input className="w-full border p-2 rounded" type="number" placeholder="Amount" value={newTx.amount} onChange={e=>setNewTx({...newTx, amount: Number(e.target.value)})} required />
                        <input className="w-full border p-2 rounded" placeholder="Category" value={newTx.category} onChange={e=>setNewTx({...newTx, category: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Description" value={newTx.description} onChange={e=>setNewTx({...newTx, description: e.target.value})} />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
                            <button type="button" onClick={()=>setShowAddTx(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

             {showAddDebt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleAddDebt} className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Add Debt</h3>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <button type="button" onClick={()=>setNewDebt({...newDebt, type: 'lent'})} className={`flex-1 py-1 rounded ${newDebt.type === 'lent' ? 'bg-white shadow' : ''}`}>I Lent</button>
                            <button type="button" onClick={()=>setNewDebt({...newDebt, type: 'borrowed'})} className={`flex-1 py-1 rounded ${newDebt.type === 'borrowed' ? 'bg-white shadow' : ''}`}>I Borrowed</button>
                        </div>
                        <input className="w-full border p-2 rounded" type="email" placeholder="Friend's Email" value={newDebt.targetEmail} onChange={e=>setNewDebt({...newDebt, targetEmail: e.target.value})} required />
                        <input className="w-full border p-2 rounded" type="number" placeholder="Amount" value={newDebt.amount} onChange={e=>setNewDebt({...newDebt, amount: Number(e.target.value)})} required />
                        <input className="w-full border p-2 rounded" placeholder="Description" value={newDebt.description} onChange={e=>setNewDebt({...newDebt, description: e.target.value})} />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded">Save</button>
                            <button type="button" onClick={()=>setShowAddDebt(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
