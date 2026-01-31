import { useState, useEffect, useCallback } from 'react';
import api from '../services/api'; 
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Simple colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

export default function SmartBudget() {
    const [transactions, setTransactions] = useState([]);
    const [debts, setDebts] = useState({ iOwe: [], owedToMe: [] });
    const [friendsList, setFriendsList] = useState([]);
    const [monthlyBudget, setMonthlyBudget] = useState(0);
    const [showAddTx, setShowAddTx] = useState(false);
    const [showAddDebt, setShowAddDebt] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showSetBudget, setShowSetBudget] = useState(false);
    
    const [editingTx, setEditingTx] = useState(null); // Track which tx is being edited
    const [newTx, setNewTx] = useState({ type: 'expense', amount: '', category: 'Food', description: '' });
    const [newDebt, setNewDebt] = useState({ friendName: '', amount: '', description: '', type: 'lent', friendId: '' });
    const [budgetInput, setBudgetInput] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.get('/budget/transactions'),
                api.get('/budget/debts'),
                api.get('/friends/mine')
            ]);

            const [txRes, debtRes, friendsRes] = results;

            if (txRes.status === 'fulfilled') {
                setTransactions(txRes.value.data.transactions || txRes.value.data); // Handle legacy array return vs new object return
                if (txRes.value.data.monthlyBudget !== undefined) setMonthlyBudget(txRes.value.data.monthlyBudget);
            } else {
                console.error("Tx Fetch Failed:", txRes.reason);
            }

            if (debtRes.status === 'fulfilled') {
                setDebts(debtRes.value.data);
            } else {
                console.error("Debt Fetch Failed:", debtRes.reason);
            }

            if (friendsRes.status === 'fulfilled') {
                setFriendsList(friendsRes.value.data);
            } else {
                 console.error("Friends Fetch Failed:", friendsRes.reason);
            }
            
        } catch (error) {
            console.error("Critical Error fetching budget data:", error);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            await fetchData();
        };
        load();
    }, [fetchData]);

    const handleSetBudget = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/budget/goal', { monthlyBudget: Number(budgetInput) });
            setMonthlyBudget(res.data.monthlyBudget);
            setShowSetBudget(false);
        } catch {
            alert("Failed to update budget goal");
        }
    };

    const handleAddOrUpdateTx = async (e) => {
        e.preventDefault();
        try {
            if (editingTx) {
                await api.put(`/budget/transactions/${editingTx._id}`, newTx);
                setEditingTx(null);
            } else {
                await api.post('/budget/transactions', newTx);
            }
            setShowAddTx(false);
            setNewTx({ type: 'expense', amount: '', category: 'Food', description: '' }); // Reset form
            fetchData();
        } catch {
            alert(editingTx ? "Failed to update transaction" : "Failed to add transaction");
        }
    };

    const handleEditClick = (tx) => {
        setEditingTx(tx);
        setNewTx({
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: tx.description || ''
        });
        setShowAddTx(true);
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        try {
            await api.post('/budget/debts', newDebt);
            setShowAddDebt(false);
            setNewDebt({ friendName: '', amount: '', description: '', type: 'lent', friendId: '' });
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

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                // Heuristic mapping: look for 'Amount', 'Date', 'Description', 'Type'
                // Assumption: User uploads a somewhat clean CSV or we default
                const foundHeaders = results.meta.fields || [];
                console.log("CSV Headers:", foundHeaders);

                const parsedTxs = results.data.map(row => {
                    // Try to find fields case-insensitively
                    const keys = Object.keys(row);
                    const getVal = (k) => {
                        const key = keys.find(key => key.toLowerCase().includes(k.toLowerCase()));
                        return key ? row[key] : null;
                    };

                    const amountStr = getVal('amount') || getVal('debit') || getVal('credit') || getVal('cost') || getVal('withdrawal') || '0';
                    const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
                    
                    // Determine type if not explicit
                    let type = 'expense';
                    if (getVal('type')?.toLowerCase().includes('cr') || getVal('credit') || (getVal('deposit') && amount > 0)) type = 'income';
                    
                    return {
                        date: new Date(getVal('date') || getVal('time') || Date.now()),
                        description: getVal('description') || getVal('remark') || getVal('narrative') || getVal('particulars') || 'Imported Tx',
                        amount: Math.abs(amount),
                        type: type,
                        category: 'Imported'
                    };
                }).filter(t => t.amount > 0);

                if (parsedTxs.length === 0) {
                    alert(`Could not parse transactions.\n\nFound Headers: ${foundHeaders.join(', ')}\n\nExpected columns like: Amount, Date, Description, Debit, Credit.`);
                    return;
                }

                if (window.confirm(`Found ${parsedTxs.length} transactions. Import them?`)) {
                    try {
                        await api.post('/budget/transactions/batch', { transactions: parsedTxs });
                        setShowImport(false);
                        fetchData();
                        alert("Import Successful!");
                    } catch (err) {
                        console.error(err);
                        const errMsg = err.response?.data?.error || err.message;
                        alert(`Import failed: ${errMsg}`);
                    }
                }
            }
        });
    };

    const handleFriendSelect = (e) => {
        const friendId = e.target.value;
        if (friendId === 'manual') {
            setNewDebt({ ...newDebt, friendId: 'manual', friendName: '' });
        } else {
             const friend = friendsList.find(f => f._id === friendId);
             setNewDebt({ ...newDebt, friendId: friendId, friendName: friend.displayName || '' }); // Use name if available
        }
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

    const handleDeleteTx = async (id) => {
        if (!confirm("Delete this transaction?")) return;
        try {
            await api.delete(`/budget/transactions/${id}`);
            setTransactions(prev => prev.filter(t => t._id !== id));
        } catch {
            alert("Failed to delete");
        }
    };

    const handleClearAll = async () => {
        if (!confirm("⚠️ Are you sure you want to delete ALL 6000+ transactions? This cannot be undone.")) return;
        try {
            await api.delete('/budget/transactions/all/confirm');
            setTransactions([]);
            fetchData(); // Refresh stats
        } catch {
            alert("Failed to clear");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
             <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-800">Smart Budgetor 💰</h2>
                    <p className="text-gray-500">Track expenses, manage debts, and save smart.</p>
                </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-gray-500 font-medium">Monthly Goal</h3>
                        <button onClick={() => { setBudgetInput(monthlyBudget); setShowSetBudget(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">Set Goal</button>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-800">₹{monthlyBudget.toLocaleString()}</p>
                    {monthlyBudget > 0 && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${totalSpent > monthlyBudget ? 'bg-red-600' : 'bg-green-600'}`} 
                                style={{ width: `${Math.min((totalSpent / monthlyBudget) * 100, 100)}%` }}
                            ></div>
                            <p className="text-xs text-gray-400 mt-1 text-right">{((totalSpent / monthlyBudget) * 100).toFixed(0)}% used</p>
                        </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 font-medium mb-1">Total Spent</h3>
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
                        onClick={() => setShowImport(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <span>📄</span> Import Statement (CSV)
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Recent Transactions ({transactions.length})</h3>
                        {transactions.length > 0 && <button onClick={handleClearAll} className="text-xs text-red-500 hover:underline">Clear All</button>}
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-1 custom-scrollbar">
                        {transactions.length === 0 && <p className="text-gray-400 text-center py-10">No transactions found.</p>}
                        {transactions.map(t => (
                            <div key={t._id} className="group flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors">
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-gray-800 truncate">{t.description || "Unknown Transaction"}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditClick(t)} className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                                ✏️
                                            </button>
                                            <button onClick={() => handleDeleteTx(t._id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>{new Date(t.date).toLocaleDateString()} • {t.category}</span>
                                    </div>
                                </div>
                                <span className={`font-bold whitespace-nowrap ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                                    {t.type === 'expense' ? '-' : '+'}₹{t.amount.toLocaleString()}
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
                            <span className="text-sm font-medium text-gray-700">{d.fromUser?.displayName || d.borrowerName || "Friend"}</span>
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
                            <span className="text-sm font-medium text-gray-700">{d.toUser?.displayName || d.lenderName || "Friend"}</span>
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
                    <form onSubmit={handleAddOrUpdateTx} className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">{editingTx ? "Edit Transaction" : "Add Transaction"}</h3>
                        <select className="w-full border p-2 rounded" value={newTx.type} onChange={e=>setNewTx({...newTx, type: e.target.value})}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                        <input className="w-full border p-2 rounded" type="number" placeholder="Amount" value={newTx.amount} onChange={e=>setNewTx({...newTx, amount: Number(e.target.value)})} required />
                        <select 
                            className="w-full border p-2 rounded" 
                            value={newTx.category} 
                            onChange={e=>setNewTx({...newTx, category: e.target.value})}
                        >
                            {['Food', 'Fees', 'Stationery', 'Shopping', 'Transport', 'Entertainment', 'Health', 'Rent', 'Books', 'Miscellaneous'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <input className="w-full border p-2 rounded" placeholder="Description (Optional)" value={newTx.description} onChange={e=>setNewTx({...newTx, description: e.target.value})} />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
                            <button type="button" onClick={() => { setShowAddTx(false); setEditingTx(null); setNewTx({ type: 'expense', amount: '', category: 'Food', description: '' }); }} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
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
                        
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Select Friend</label>
                             <select 
                                className="w-full border p-2 rounded"
                                value={newDebt.friendId}
                                onChange={handleFriendSelect}
                             >
                                <option value="">-- Choose Friend --</option>
                                {friendsList.map(f => <option key={f._id} value={f._id}>{f.displayName}</option>)}
                                <option value="manual">Other (Enter Name)</option>
                             </select>
                        </div>

                        {(newDebt.friendId === 'manual' || !newDebt.friendId) && (
                            <input className="w-full border p-2 rounded" type="text" placeholder="Friend's Name" value={newDebt.friendName} onChange={e=>setNewDebt({...newDebt, friendName: e.target.value})} required={!newDebt.friendId || newDebt.friendId === 'manual'} />
                        )}
                        
                        <input className="w-full border p-2 rounded" type="number" placeholder="Amount" value={newDebt.amount} onChange={e=>setNewDebt({...newDebt, amount: Number(e.target.value)})} required />
                        <input className="w-full border p-2 rounded" placeholder="Description" value={newDebt.description} onChange={e=>setNewDebt({...newDebt, description: e.target.value})} />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded">Save</button>
                            <button type="button" onClick={()=>setShowAddDebt(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
            
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4 text-center">
                        <h3 className="text-xl font-bold">Import Statement</h3>
                        <p className="text-sm text-gray-500">Upload a CSV file from GPay, Paytm, or PhonePe history.</p>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors cursor-pointer relative">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="text-4xl block mb-2">📂</span>
                            <span className="font-bold text-gray-600">Click to Upload CSV</span>
                        </div>

                        <button onClick={()=>setShowImport(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                </div>
            )}

            {showSetBudget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSetBudget} className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Set Monthly Budget Goal</h3>
                        <p className="text-sm text-gray-500">Set a target limit for your expenses this month.</p>
                        <input 
                            className="w-full border p-2 rounded" 
                            type="number" 
                            placeholder="e.g. 5000" 
                            value={budgetInput} 
                            onChange={e => setBudgetInput(e.target.value)} 
                            required 
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save Status</button>
                            <button type="button" onClick={() => setShowSetBudget(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
