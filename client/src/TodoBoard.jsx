import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { auth } from './firebase';

const TodoBoard = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState("");

    // Date Logic
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[today.getDay()];

    const fetchTodos = useCallback(async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:5000/api/todos?date=${dateStr}`, config);
            setTodos(res.data);
        } catch (error) {
            console.error("Error fetching todos:", error);
        } finally {
            setLoading(false);
        }
    }, [dateStr]);

    const syncAndFetch = useCallback(async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // 1. Sync Timetable items for today
            await axios.post('http://localhost:5000/api/todos/sync', {
                date: dateStr,
                dayName: dayName
            }, config);

            // 2. Fetch updated list
            await fetchTodos();
        } catch (error) {
            console.error("Error syncing:", error);
            // Even if sync fails, try to fetch existing
            fetchTodos();
        }
    }, [dateStr, dayName, fetchTodos]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                syncAndFetch();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [syncAndFetch]);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/todos', {
                title: newTask,
                date: dateStr,
                priority: 'medium'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewTask("");
            fetchTodos();
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const updateStatus = async (id, newStatus) => {
        // Optimistic update
        setTodos(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));

        try {
            const token = await auth.currentUser.getIdToken();
            await axios.put(`http://localhost:5000/api/todos/${id}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error updating status:", error);
            fetchTodos(); // Revert on error
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete task?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`http://localhost:5000/api/todos/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTodos();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData("taskId", id);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = (e, status) => {
        const id = e.dataTransfer.getData("taskId");
        if (id) {
            updateStatus(id, status);
        }
    };

    // Columns Configuration
    const columns = [
        { id: 'todo', title: 'To Do', color: 'bg-gray-100 border-gray-200' },
        { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50 border-blue-100' },
        { id: 'done', title: 'Done', color: 'bg-green-50 border-green-100' }
    ];

    if (loading) return <div className="p-8 text-center text-gray-500">Syncing Tasks...</div>;

    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Task Board</h1>
                    <p className="text-gray-500 text-sm mt-1">Today: {new Date(dateStr).toDateString()}</p>
                </div>
                
                {/* Manual Add Form */}
                <form onSubmit={handleAddTask} className="flex gap-2 w-full max-w-md">
                    <input 
                        type="text" 
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        placeholder="Add a new task..."
                        className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Add</button>
                </form>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {columns.map(col => (
                    <div 
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className={`rounded-xl border ${col.color} p-4 flex flex-col h-full`}
                    >
                        <h3 className="font-bold text-gray-700 mb-4 px-2 flex justify-between">
                            {col.title}
                            <span className="bg-white px-2 py-0.5 rounded text-xs shadow-sm text-gray-500">
                                {todos.filter(t => t.status === col.id).length}
                            </span>
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar">
                            {todos.filter(t => t.status === col.id).map(task => (
                                <div 
                                    key={task._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group relative"
                                >
                                    <h4 className="font-semibold text-gray-800">{task.title}</h4>
                                    {task.originTimetableId && (
                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                                            From Schedule
                                        </span>
                                    )}
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(task._id); }}
                                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            {todos.filter(t => t.status === col.id).length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg">
                                    Drop here
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodoBoard;
