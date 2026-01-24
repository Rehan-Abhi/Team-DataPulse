import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { auth } from './firebase';

const SGPACalculator = () => {
    const [semesters, setSemesters] = useState([]);
    const [currentSemName, setCurrentSemName] = useState('');
    const [courses, setCourses] = useState([
        { name: '', credits: 4, grade: 'A+' }
    ]);
    const [loading, setLoading] = useState(true);

    const gradeMap = {
        'A+': 10,
        'A': 9,
        'B+': 8,
        'B': 7,
        'C+': 6,
        'C': 5,
        'D': 4,
        'F': 0
    };

    const fetchHistory = useCallback(async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await axios.get('http://localhost:5000/api/semesters', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSemesters(res.data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchHistory();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [fetchHistory]);

    // --- Calculation Logic ---
    const calculateSGPA = (courseList) => {
        let totalPoints = 0;
        let totalCredits = 0;
        
        courseList.forEach(c => {
            const points = gradeMap[c.grade] || 0;
            const credits = parseFloat(c.credits) || 0;
            totalPoints += points * credits;
            totalCredits += credits;
        });

        return totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2);
    };

    const currentSGPA = calculateSGPA(courses);

    const calculateCGPA = () => {
        if (semesters.length === 0) return 0;
        // Simple average of SGPAs (Or weighted if we stored total credits per sem, but simple avg is common for MVP)
        // Better: Sum of all (SGPA * SemCredits) / TotalCredits.
        // Since we store courses, we can re-calculate accurately.
        
        let totalPoints = 0;
        let totalCredits = 0;

        semesters.forEach(sem => {
            sem.courses.forEach(c => {
                totalPoints += c.gradePoint * c.credits;
                totalCredits += c.credits;
            });
        });

        return totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2);
    };

    // --- Form Actions ---
    const addRow = () => {
        setCourses([...courses, { name: '', credits: 3, grade: 'A' }]);
    };

    const removeRow = (index) => {
        setCourses(courses.filter((_, i) => i !== index));
    };

    const updateRow = (index, field, value) => {
        const newCourses = [...courses];
        newCourses[index][field] = value;
        setCourses(newCourses);
    };

    const importSubjects = async () => {
        if (!window.confirm("This will replace current rows with your Timetable subjects. Continue?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await axios.get('http://localhost:5000/api/timetable', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Extract unique academic titles
            const uniqueSubjects = [...new Set(
                res.data
                    .filter(s => s.type === 'academic')
                    .map(s => s.title)
            )];

            if (uniqueSubjects.length === 0) {
                alert("No academic subjects found in Timetable.");
                return;
            }

            const newRows = uniqueSubjects.map(sub => ({
                name: sub,
                credits: 4, // Default assumption
                grade: 'A+'
            }));
            setCourses(newRows);
        } catch (error) {
            console.error("Import failed:", error);
            alert("Failed to import from Timetable");
        }
    };

    const saveSemester = async () => {
        if (!currentSemName.trim()) {
            alert("Please enter a Semester Name (e.g. Semester 1)");
            return;
        }
        
        // Prepare data with grade points
        const coursesPayload = courses.map(c => ({
            ...c,
            gradePoint: gradeMap[c.grade]
        }));

        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/semesters', {
                semesterName: currentSemName,
                courses: coursesPayload,
                sgpa: calculateSGPA(courses)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Reset
            setCurrentSemName("");
            setCourses([{ name: '', credits: 4, grade: 'A+' }]);
            fetchHistory();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save semester");
        }
    };

    const deleteSemester = async (id) => {
        if(!window.confirm("Delete this semester record?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`http://localhost:5000/api/semesters/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchHistory();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Calculator...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Header & CGPA */}
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-2xl text-white shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold">SGPA Calculator</h1>
                    <p className="opacity-90 mt-1">Track your academic performance</p>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-80 uppercase tracking-wider font-semibold">Cumulative GPA</p>
                    <span className="text-5xl font-bold">{calculateCGPA()}</span>
                </div>
            </div>

            {/* Calculator Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">New Semester Calculation</h2>
                    <button 
                        onClick={importSubjects}
                        className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 font-medium transition-colors"
                    >
                        ⚡ Import from Timetable
                    </button>
                </div>

                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Semester Name (e.g. Fall 2024)" 
                        value={currentSemName}
                        onChange={e => setCurrentSemName(e.target.value)}
                        className="w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 w-32">Credits</th>
                                    <th className="p-4 w-32">Grade</th>
                                    <th className="p-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {courses.map((course, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="p-3">
                                            <input 
                                                type="text" 
                                                value={course.name}
                                                onChange={e => updateRow(i, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none"
                                                placeholder="Subject Name"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={course.credits}
                                                onChange={e => updateRow(i, 'credits', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select 
                                                value={course.grade}
                                                onChange={e => updateRow(i, 'grade', e.target.value)}
                                                className="w-full bg-transparent outline-none cursor-pointer"
                                            >
                                                {Object.keys(gradeMap).map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500">&times;</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button onClick={addRow} className="text-blue-600 font-medium hover:text-blue-800 text-sm">
                            + Add Subject
                        </button>
                        
                        <div className="flex items-center gap-6">
                            <div>
                                <span className="text-gray-500 text-sm mr-2">Calculated SGPA:</span>
                                <span className="text-2xl font-bold text-gray-800">{currentSGPA}</span>
                            </div>
                            <button 
                                onClick={saveSemester}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-md font-medium"
                            >
                                Save to History
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Section */}
            {semesters.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-4">History</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {semesters.map(sem => (
                            <div key={sem._id} className="bg-white p-5 rounded-xl border shadow-sm relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg">{sem.semesterName}</h4>
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                                        {sem.sgpa.toFixed(2)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {sem.courses.map((c, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-600">
                                            <span>{c.name}</span>
                                            <span className="font-medium">{c.grade} ({c.credits}cr)</span>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => deleteSemester(sem._id)}
                                    className="absolute top-4 right-14 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SGPACalculator;
